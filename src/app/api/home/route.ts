import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 60 

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. ✅ เลือกเฉพาะ field ที่จำเป็น (ลด Payload Size)
    // ไม่ดึง 'description' หรือ 'banner_image_url' มา เพราะหน้า Home ไม่ได้ใช้
    const selectedFields = `
      id, 
      title, 
      cover_image_url, 
      genre, 
      view_count, 
      updated_at,
      created_at,
      is_published,
      avg_rating,
      episodes(id, episode_number)
    `

    // 2. ✅ แก้ไข Logic วันที่ (สร้าง Date Object ใหม่ทุกครั้ง ไม่แก้ตัวเดิม)
    const now = new Date()
    
    const weeklyDate = new Date()
    weeklyDate.setDate(now.getDate() - 7)
    
    const monthlyDate = new Date()
    monthlyDate.setDate(now.getDate() - 30)
    
    const yearlyDate = new Date()
    yearlyDate.setFullYear(now.getFullYear() - 1)

    // Helper function เพื่อลด code ซ้ำ
    const getBaseQuery = () => supabase.from('comics').select(selectedFields).eq('is_published', true)

    // 3. เตรียม Query
    const queries = [
      // [0] Latest / Slider (เอา 10 เรื่องล่าสุด)
      getBaseQuery().order('updated_at', { ascending: false }).limit(10),
      
      // [1] Weekly Trending
      getBaseQuery().gte('updated_at', weeklyDate.toISOString()).order('view_count', { ascending: false }).limit(6),
      
      // [2] Monthly Popular
      getBaseQuery().gte('updated_at', monthlyDate.toISOString()).order('view_count', { ascending: false }).limit(6),
      
      // [3] Yearly Popular
      getBaseQuery().gte('updated_at', yearlyDate.toISOString()).order('view_count', { ascending: false }).limit(6),
      
      // [4-6] Genres
      getBaseQuery().contains('genre', ['ย้อนยุค']).order('updated_at', { ascending: false }).limit(6),
      getBaseQuery().contains('genre', ['โรแมนติก']).order('updated_at', { ascending: false }).limit(6),
      getBaseQuery().contains('genre', ['แอ็คชั่น']).order('updated_at', { ascending: false }).limit(6),
    ]

    // 4. ยิงพร้อมกัน
    const results = await Promise.all(queries)

    // 5. Helper Process Data
    const processData = (data: any[]) => {
      if (!data) return []
      return data.map((c: any) => {
        const latestEp = c.episodes?.length > 0 ? Math.max(...c.episodes.map((e: any) => e.episode_number)) : 0
        
        // คำนวณ Rating
        const ratings = c.comic_ratings || []
        const avgRating = c.avg_rating ? c.avg_rating.toFixed(1) : '0.0'

        // ลบ field ชั่วคราวออก
        const { episodes, comic_ratings, ...rest } = c 
        return { ...rest, latestEp, rating: avgRating }
      })
    }

    // 6. ส่งข้อมูลกลับ
    const responseData = {
      latest: processData(results[0].data || []),
      slider: processData(results[0].data || []).slice(0, 5),
      popular: {
        weekly: processData(results[1].data || []),
        monthly: processData(results[2].data || []),
        yearly: processData(results[3].data || []),
      },
      genres: {
        retro: processData(results[4].data || []),
        romantic: processData(results[5].data || []),
        action: processData(results[6].data || []),
      }
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Home API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}