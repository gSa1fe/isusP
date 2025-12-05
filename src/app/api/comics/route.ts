import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// (เก็บ Schema Validation ไว้เหมือนเดิม)
const comicSchema = z.object({
  title: z.string().min(1, "ชื่อเรื่องห้ามว่าง").trim(),
  description: z.string().trim().optional().or(z.literal('')),
  genre: z.array(z.string()).min(1, "ต้องเลือกอย่างน้อย 1 หมวดหมู่"), 
  cover_image_url: z.string().url("รูปปกต้องเป็น URL"),
  banner_image_url: z.string().url().optional().or(z.literal('')).or(z.null()), 
  is_published: z.boolean().optional()
})

export const revalidate = 60

// 🟢 GET Method
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
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
      // เลือก field ที่ต้องใช้ (รวม avg_rating ที่เราทำ cache ไว้แล้ว)
      .select('*, episodes(episode_number)', { count: 'exact' }) 
      .eq('is_published', true)

    // 🚀 Speed Optimization: Search Logic
    if (queryText) {
       // Escape special characters to prevent errors
       const sanitizedQuery = queryText.replace(/'/g, "''");
       
       // ✅ FIX: Use 'simple' configuration instead of 'thai' to avoid 42704 error
       // 'simple' treats the string as a sequence of words without language-specific rules, which is safer.
       // websearch type handles operators like or "" nicely.
       query = query.textSearch('title', sanitizedQuery, { 
         config: 'simple', 
         type: 'websearch' 
       })
    }

    if (genre && genre !== 'ทั้งหมด' && genre !== 'All') query = query.contains('genre', [genre])
    if (status && status !== 'all') query = query.eq('status', status)

    // Sorting (ใช้ Column จริง)
    switch (sort) {
      case 'popular': query = query.order('total_views', { ascending: false }); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('last_episode_at', { ascending: false }); break;
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Process Data
    const comics = data?.map((c: any) => {
        const episodes = c.episodes || []
        const latestEp = episodes.length > 0 ? Math.max(...episodes.map((e: any) => e.episode_number)) : 0
        delete c.episodes 
        
        return { 
            ...c, 
            rating: c.avg_rating || '0.0', 
            latestEp 
        }
    })

    return NextResponse.json({
      data: comics,
      meta: { total: count, page, limit, totalPages: Math.ceil((count || 0) / limit) }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 🔵 POST Method (เหมือนเดิม)
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
    
    // Validate Data
    const validation = comicSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ถูกต้อง', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    const { title, description, genre, cover_image_url, banner_image_url, is_published } = validation.data

    // 2. บันทึกลง Database
    const { data, error } = await supabase
      .from('comics')
      .insert({
        title,
        description,
        genre,
        cover_image_url,
        banner_image_url: banner_image_url || null,
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