import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// 1. GET: ดึงคะแนนเฉลี่ย และคะแนนของฉัน
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  if (!comic_id) return NextResponse.json({ error: 'Missing comic_id' }, { status: 400 })

  try {
    // 1.1 หาคะแนนเฉลี่ย (Average) และจำนวนคนโหวต (Count)
    // หมายเหตุ: Supabase JS ไม่มีฟังก์ชัน .avg() โดยตรงแบบง่ายๆ เราจะดึงทั้งหมดมาคำนวณ (ถ้าข้อมูลเยอะมากๆ ควรทำ View ใน SQL แทน)
    const { data: allRatings, error: avgError } = await supabase
      .from('comic_ratings')
      .select('rating')
      .eq('comic_id', comic_id)

    if (avgError) throw avgError

    let average = 0
    let count = 0
    
    if (allRatings && allRatings.length > 0) {
        count = allRatings.length
        const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0)
        average = parseFloat((sum / count).toFixed(1)) // ทศนิยม 1 ตำแหน่ง
    }

    // 1.2 หาคะแนนของ User ปัจจุบัน (ถ้าล็อกอิน)
    let myRating = 0
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        const { data: userRating } = await supabase
            .from('comic_ratings')
            .select('rating')
            .eq('comic_id', comic_id)
            .eq('user_id', user.id)
            .single()
        
        if (userRating) myRating = userRating.rating
    }

    return NextResponse.json({ average, count, myRating })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 2. POST: ให้คะแนน (Upsert)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { comic_id, rating } = await request.json()

    if (!comic_id || !rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // ใช้ upsert (Insert or Update)
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