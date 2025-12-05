import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const librarySchema = z.object({
  comic_id: z.string().uuid({ message: "Comic ID ไม่ถูกต้อง" })
})

// GET: ดึงข้อมูล (เช็คสถานะ หรือ ดึงทั้งชั้น)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // กรณี A: เช็คสถานะ (เหมือนเดิม)
    if (comic_id) {
      const { data, error } = await supabase
        .from('library')
        .select('comic_id') 
        .eq('user_id', user.id)
        .eq('comic_id', comic_id)
        .limit(1)

      if (error) return NextResponse.json({ inLibrary: false }) 
      return NextResponse.json({ inLibrary: data && data.length > 0 })
    }

    // กรณี B: ดึงรายการทั้งหมด (🔥 ปรับปรุง Performance)
    const { data, error } = await supabase
      .from('library')
      .select(`
        created_at,
        comics (
          id, 
          title, 
          cover_image_url, 
          genre, 
          status,
          updated_at,
          episodes (
             episode_number
          ),
          comic_ratings (rating)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      // ✅ Trick: สั่ง Order ที่ episodes เพื่อให้จัดการข้อมูลได้ง่ายขึ้น
      // แต่ Supabase JS .limit(1) บน nested relation บางทีมีข้อจำกัด
      // ดังนั้นเราดึงมาเฉพาะ field ที่จำเป็นจริงๆ ก็ช่วยได้เยอะแล้ว

    if (error) throw error

    // Process Data
    const formattedData = data?.map((item: any) => {
        const comic = item.comics
        if (!comic) return null

        // หาตอนล่าสุด (ลดภาระ Client)
        const latestEp = comic.episodes?.length > 0 
            ? Math.max(...comic.episodes.map((e: any) => e.episode_number)) 
            : 0

        // หา Rating เฉลี่ย
        const ratings = comic.comic_ratings || []
        const avgRating = ratings.length > 0
            ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
            : '0.0'

        return {
            ...item,
            comics: {
                ...comic,
                latestEp, // ส่งค่าที่คำนวณแล้วกลับไป
                rating: avgRating,
                // ลบ array ที่ไม่จำเป็นทิ้ง ลดขนาด JSON
                episodes: undefined,
                comic_ratings: undefined
            }
        }
    }).filter(Boolean) // กรองค่า null ออก

    return NextResponse.json({ data: formattedData })

  } catch (error: any) {
    console.error("Library API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔵 POST: เพิ่มเข้าชั้นหนังสือ
// =======================================================
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 })

    const body = await request.json()
    const validation = librarySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }

    const { comic_id } = validation.data

    const { error } = await supabase
      .from('library')
      .upsert(
        { user_id: user.id, comic_id },
        { onConflict: 'user_id, comic_id' }
      )

    if (error) throw error

    return NextResponse.json({ message: 'Added to library' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔴 DELETE: ลบออกจากชั้นหนังสือ
// =======================================================
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!comic_id) return NextResponse.json({ error: 'Missing Comic ID' }, { status: 400 })

    const { error } = await supabase
      .from('library')
      .delete()
      .eq('user_id', user.id)
      .eq('comic_id', comic_id)

    if (error) throw error

    return NextResponse.json({ message: 'Removed from library' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}