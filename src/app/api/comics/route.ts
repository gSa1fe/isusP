import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Cache 60 วินาที สำหรับการค้นหา (GET) เพื่อลดภาระ Database
export const revalidate = 60

// ==============================================================================
// 🟢 GET Method: ค้นหา, กรอง, เรียงลำดับ (สำหรับหน้า Search/Explore)
// ==============================================================================
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // 1. รับค่า Parameter
  const queryText = searchParams.get('q') || ''
  const genre = searchParams.get('genre')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort') || 'latest_update'
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '18')
  const offset = (page - 1) * limit

  try {
    // 2. เริ่มสร้าง Query
    let query = supabase
      .from('comics')
      // ดึง rating และ episodes มาด้วย
      .select('*, comic_ratings(rating), episodes(episode_number)', { count: 'exact' })
      .eq('is_published', true) // เอาเฉพาะที่เผยแพร่แล้ว

    // 3. ใส่เงื่อนไข Filter
    if (queryText) {
      query = query.ilike('title', `%${queryText}%`)
    }

    if (genre && genre !== 'All') {
      query = query.contains('genre', [genre])
    }

    if (status) {
      query = query.eq('status', status)
    }

    // 4. ใส่เงื่อนไข Sorting
    switch (sort) {
      case 'popular': // ยอดนิยม
        query = query.order('view_count', { ascending: false })
        break
      case 'newest': // มาใหม่
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest': // เก่าสุด
        query = query.order('created_at', { ascending: true })
        break
      case 'latest_update': // อัปเดตล่าสุด (Default)
      default:
        query = query.order('updated_at', { ascending: false })
        break
    }

    // 5. Pagination
    query = query.range(offset, offset + limit - 1)

    // 6. รัน Query
    const { data, error, count } = await query

    if (error) throw error

    // 7. Process Data (คำนวณ Rating และ Latest EP)
    const comics = data?.map((c: any) => {
        // --- 7.1 คำนวณ Rating เฉลี่ย ---
        const ratings = c.comic_ratings || []
        const avgRating = ratings.length > 0
            ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
            : '0.0'
        
        // --- 7.2 คำนวณ Latest Episode (เพิ่มใหม่ตรงนี้) ---
        const episodes = c.episodes || []
        const latestEp = episodes.length > 0 
            ? Math.max(...episodes.map((e: any) => e.episode_number)) 
            : 0

        // ลบข้อมูลดิบที่ไม่จำเป็นออกเพื่อลดขนาด Response
        delete c.comic_ratings
        delete c.episodes 

        // Return ข้อมูลที่ process แล้วกลับไป
        return { ...c, rating: avgRating, latestEp }
    })

    // 8. ส่งข้อมูลกลับ
    return NextResponse.json({
      data: comics,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==============================================================================
// 🔵 POST Method: สร้างการ์ตูนใหม่ (สำหรับ Admin)
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
    const { title, description, genre, cover_image_url, banner_image_url, is_published } = body

    if (!title || !genre || !cover_image_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. บันทึกลง Database
    const { data, error } = await supabase
      .from('comics')
      .insert({
        title,
        description,
        genre,
        cover_image_url,
        banner_image_url,
        is_published: is_published ?? false,
        author_id: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: 'Success', comic: data })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}