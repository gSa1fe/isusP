import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ✅ 1. ใช้ Schema ตัวเดียวกับ POST (Copy มาเลยเพื่อความ Consistence)
const comicSchema = z.object({
  title: z.string().trim().min(1, "ชื่อเรื่องห้ามว่าง"), 
  
  description: z.string().nullish().transform(val => (val || "").trim()), 
  
  genre: z.array(z.string()).min(1, "ต้องเลือกอย่างน้อย 1 หมวดหมู่"), 
  
  cover_image_url: z.string().url("รูปปกต้องเป็น URL ที่ถูกต้อง"),
  
  banner_image_url: z.string().nullish().transform(val => val?.trim() || null),
  
  is_published: z.boolean().optional().default(false)
})

export const revalidate = 60 

// ==============================================================================
// 🟢 GET Method: ดึงข้อมูลการ์ตูน + ตอน + แนะนำ
// ==============================================================================
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient()

  try {
    const comicQuery = supabase.from('comics').select('*').eq('id', id).single()
    const episodesQuery = supabase
      .from('episodes')
      .select('*, episode_likes(count)')
      .eq('comic_id', id)
      .order('episode_number', { ascending: false })

    const [comicRes, episodesRes] = await Promise.all([comicQuery, episodesQuery])

    if (comicRes.error || !comicRes.data) {
        return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }

    const comic = comicRes.data
    
    const episodes = episodesRes.data?.map((ep: any) => ({
        ...ep,
        likes_count: ep.episode_likes?.[0]?.count || 0
    })) || []

    const totalViews = episodes.reduce((sum: number, ep: any) => sum + (ep.view_count || 0), 0)
    const totalLikes = episodes.reduce((sum: number, ep: any) => sum + ep.likes_count, 0)

    let recommendations: any[] = []
    if (comic.genre && comic.genre.length > 0) {
        const { data: recData } = await supabase
            .from('comics')
            .select('id, title, cover_image_url, genre, status, comic_ratings(rating)')
            .contains('genre', [comic.genre[0]])
            .neq('id', id)
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
// 🟠 PUT Method: อัปเดตข้อมูลการ์ตูน (ใช้ Zod แล้ว 🛡️)
// ==============================================================================
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient()

  // 1. Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    // 2. ✅ Validate Data ด้วย Zod Schema
    const validation = comicSchema.safeParse(body)

    if (!validation.success) {
      console.error("Update Validation Error:", validation.error.format())
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ถูกต้อง', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    // 3. เตรียมข้อมูลที่ Clean แล้ว
    const { title, description, genre, cover_image_url, banner_image_url, is_published } = validation.data

    // 4. Update DB
    const { error } = await supabase
      .from('comics')
      .update({
        title,
        description,
        genre,
        cover_image_url,
        banner_image_url, // ค่านี้จะเป็น null ถ้าว่าง หรือเป็น string ที่ trim แล้ว
        is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
        console.error("Database Update Error:", error)
        if (error.code === '23505') return NextResponse.json({ error: 'ชื่อเรื่องนี้มีอยู่แล้ว (ซ้ำ)' }, { status: 409 })
        if (error.code === '22001') return NextResponse.json({ error: 'ข้อความยาวเกินกำหนด' }, { status: 400 })
        throw error
    }

    return NextResponse.json({ message: 'Update successful' })

  } catch (error: any) {
    console.error('Update Server Error:', error)
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 })
  }
}