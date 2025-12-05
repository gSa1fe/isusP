import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Cache เฉพาะ Method GET ไว้ 60 วินาที (PUT จะไม่ถูก Cache)
export const revalidate = 60 

// ==============================================================================
// 🟢 GET Method: ดึงข้อมูลการ์ตูน + ตอน + แนะนำ (สำหรับหน้าบ้าน Public)
// ==============================================================================
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient()

  try {
    // 1. เตรียม Query: ข้อมูลการ์ตูน และ รายชื่อตอน
    const comicQuery = supabase.from('comics').select('*').eq('id', id).single()
    const episodesQuery = supabase
      .from('episodes')
      .select('*, episode_likes(count)')
      .eq('comic_id', id)
      .order('episode_number', { ascending: false })

    // 2. รัน Query พร้อมกัน
    const [comicRes, episodesRes] = await Promise.all([comicQuery, episodesQuery])

    if (comicRes.error || !comicRes.data) {
        return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }

    const comic = comicRes.data
    
    // 3. คำนวณ Stats (Views & Likes)
    const episodes = episodesRes.data?.map((ep: any) => ({
        ...ep,
        likes_count: ep.episode_likes?.[0]?.count || 0
    })) || []

    const totalViews = episodes.reduce((sum: number, ep: any) => sum + (ep.view_count || 0), 0)
    const totalLikes = episodes.reduce((sum: number, ep: any) => sum + ep.likes_count, 0)

    // 4. หา Recommendations (เรื่องที่หมวดตรงกัน)
    let recommendations: any[] = []
    if (comic.genre && comic.genre.length > 0) {
        const { data: recData } = await supabase
            .from('comics')
            .select('id, title, cover_image_url, genre, status, comic_ratings(rating)')
            .contains('genre', [comic.genre[0]]) // หมวดแรกตรงกัน
            .neq('id', id) // ไม่เอาเรื่องปัจจุบัน
            .eq('is_published', true)
            .limit(6)
        
        if (recData) {
            recommendations = recData.map((c: any) => {
                const ratings = c.comic_ratings || []
                const avg = ratings.length > 0 ? (ratings.reduce((a: number, b: any) => a + b.rating, 0) / ratings.length).toFixed(1) : '0.0'
                delete c.comic_ratings 
                return { ...c, rating: avg }
            })
        }
    }

    // 5. ส่งข้อมูลกลับ
    return NextResponse.json({
      comic,
      episodes,
      stats: { totalViews, totalLikes },
      recommendations
    })

  } catch (error: any) {
    console.error('Get Comic Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==============================================================================
// 🟠 PUT Method: อัปเดตข้อมูลการ์ตูน (สำหรับ Admin - โค้ดเดิมของคุณ)
// ==============================================================================
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient()

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    // 👇 เพิ่ม banner_image_url ตรงนี้
    const { title, description, genre, cover_image_url, banner_image_url, is_published } = body

    // Update DB
    const { error } = await supabase
      .from('comics')
      .update({
        title,
        description,
        genre,
        cover_image_url,
        banner_image_url, // 👈 บันทึกค่าใหม่ลงไป
        is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Update successful' })

  } catch (error: any) {
    console.error('Update Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}