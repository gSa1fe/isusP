import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 60

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
    // ✅ เลือก avg_rating, total_views, last_episode_at ได้เลย ไม่ต้อง join relation เยอะ
    let query = supabase
      .from('comics')
      .select('*, episodes(episode_number)', { count: 'exact' }) 
      .eq('is_published', true)

    if (queryText) query = query.ilike('title', `%${queryText}%`)
    if (genre && genre !== 'ทั้งหมด' && genre !== 'All') query = query.contains('genre', [genre])
    if (status && status !== 'all') query = query.eq('status', status)

    // Sorting ด้วย Column จริง (เร็วขึ้นเพราะ Index จับได้)
    switch (sort) {
      case 'popular': query = query.order('total_views', { ascending: false }); break; // ใช้ total_views
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('last_episode_at', { ascending: false }); break; // ใช้ last_episode_at
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Process Data (เหลือแค่นิดเดียว)
    const comics = data?.map((c: any) => {
        // หา ep ล่าสุด
        const episodes = c.episodes || []
        const latestEp = episodes.length > 0 ? Math.max(...episodes.map((e: any) => e.episode_number)) : 0
        
        // ลบ field ขยะออก
        delete c.episodes 
        
        return { 
            ...c, 
            rating: c.avg_rating || '0.0', // ✅ ใช้ค่าจาก DB ตรงๆ
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