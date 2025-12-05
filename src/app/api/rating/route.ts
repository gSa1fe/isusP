import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// ไม่แคช เพื่อให้ได้ข้อมูล Realtime (โดยเฉพาะเวลากดโหวตแล้วค่าเปลี่ยน)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  if (!comic_id) return NextResponse.json({ error: 'Missing comic_id' }, { status: 400 })

  try {
    // 1. ดึงคะแนนเฉลี่ยจากตาราง comics (เร็วมาก เพราะมี column avg_rating แล้ว)/route.ts]
    const comicQuery = supabase
      .from('comics')
      .select('avg_rating')
      .eq('id', comic_id)
      .single()

    // 2. นับจำนวนคนโหวตจากตาราง comic_ratings (ใช้ count='exact' ไม่ต้องโหลดข้อมูลมา)
    const countQuery = supabase
      .from('comic_ratings')
      .select('*', { count: 'exact', head: true }) // head: true คือไม่เอาเนื้อหา เอาแต่จำนวน
      .eq('comic_id', comic_id)

    // 3. หาคะแนนของ User ปัจจุบัน (ถ้าล็อกอิน)
    const { data: { user } } = await supabase.auth.getUser()
    let userRatingQuery = Promise.resolve({ data: null, error: null })
    
    if (user) {
       // @ts-ignore
       userRatingQuery = supabase
        .from('comic_ratings')
        .select('rating')
        .eq('comic_id', comic_id)
        .eq('user_id', user.id)
        .single()
    }

    // ยิง 3 Query พร้อมกัน (Parallel)
    const [comicRes, countRes, userRes] = await Promise.all([comicQuery, countQuery, userRatingQuery])

    // จัดเตรียมข้อมูลส่งกลับ
    const average = comicRes.data?.avg_rating || 0
    const count = countRes.count || 0
    const myRating = userRes.data?.rating || 0

    return NextResponse.json({ 
        average: Number(average), // แปลงเป็นตัวเลขให้ชัวร์
        count, 
        myRating 
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { comic_id, rating } = await request.json()

    if (!comic_id || !rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Upsert คะแนน (Insert หรือ Update)
    const { error } = await supabase
      .from('comic_ratings')
      .upsert({ 
          user_id: user.id, 
          comic_id, 
          rating 
      })

    if (error) throw error

    return NextResponse.json({ message: 'Rating saved' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}