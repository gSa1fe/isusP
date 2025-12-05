import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ✅ ปรับปรุง Schema ให้รองรับ null และ empty string ได้ดียิ่งขึ้น
const comicSchema = z.object({
  title: z.string().min(1, "ชื่อเรื่องห้ามว่าง").trim(), // trim() ตัดช่องว่างหน้า-หลังให้อัตโนมัติ
  description: z.string().trim().optional().or(z.literal('')),
  genre: z.array(z.string()).min(1, "ต้องเลือกอย่างน้อย 1 หมวดหมู่"), 
  cover_image_url: z.string().url("รูปปกต้องเป็น URL"),
  // ยอมรับ: URL, string ว่าง, null, หรือ undefined
  banner_image_url: z.string().url().optional().or(z.literal('')).or(z.null()), 
  is_published: z.boolean().optional()
})

// Cache 60 วินาที สำหรับการค้นหา (GET)
export const revalidate = 60

// ==============================================================================
// 🟢 GET Method: ค้นหา, กรอง, เรียงลำดับ
// ==============================================================================
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // ... (โค้ดส่วน GET เหมือนเดิม ไม่ต้องแก้) ...
  // (ละไว้เพื่อความกระชับ)
  
  const queryText = searchParams.get('q') || ''
  const genre = searchParams.get('genre')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort') || 'latest_update'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '18')
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('comics')
      .select('*, comic_ratings(rating), episodes(episode_number)', { count: 'exact' })
      .eq('is_published', true)

    if (queryText) query = query.ilike('title', `%${queryText}%`)
    if (genre && genre !== 'All') query = query.contains('genre', [genre])
    if (status) query = query.eq('status', status)

    switch (sort) {
      case 'popular': query = query.order('view_count', { ascending: false }); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('updated_at', { ascending: false }); break;
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const comics = data?.map((c: any) => {
        const ratings = c.comic_ratings || []
        const avgRating = ratings.length > 0 ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1) : '0.0'
        const episodes = c.episodes || []
        const latestEp = episodes.length > 0 ? Math.max(...episodes.map((e: any) => e.episode_number)) : 0
        delete c.comic_ratings
        delete c.episodes 
        return { ...c, rating: avgRating, latestEp }
    })

    return NextResponse.json({
      data: comics,
      meta: { total: count, page, limit, totalPages: Math.ceil((count || 0) / limit) }
    })

  } catch (error: any) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==============================================================================
// 🔵 POST Method: สร้างการ์ตูนใหม่ (แก้ไขใหม่)
// ==============================================================================
export async function POST(request: Request) {
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
    
    // ✅ ใช้ Zod Validate ข้อมูล
    const validation = comicSchema.safeParse(body)

    // ถ้าข้อมูลไม่ผ่านเกณฑ์ ให้ส่ง Error กลับไปบอก Frontend
    if (!validation.success) {
      console.error("Validation Error:", validation.error.format()) // Log ดูปัญหา
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ถูกต้อง', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    // ดึงข้อมูลที่ผ่านการ Validate แล้วมาใช้ (ปลอดภัยแน่นอน)
    const { title, description, genre, cover_image_url, banner_image_url, is_published } = validation.data

    // 2. บันทึกลง Database
    const { data, error } = await supabase
      .from('comics')
      .insert({
        title,
        description,
        genre, // มั่นใจได้ว่าเป็น Array แน่นอนจาก Zod
        cover_image_url,
        banner_image_url: banner_image_url || null, // แปลง "" เป็น null เพื่อความสะอาดของ DB
        is_published: is_published ?? false,
        author_id: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: 'Success', comic: data })

  } catch (error: any) {
    console.error("Create Comic Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}