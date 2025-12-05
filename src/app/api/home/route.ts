import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// ตั้งค่าให้ Cache ได้ (เช่น 60 วินาที) เพื่อไม่ให้ DB ทำงานหนักเกินไป
export const revalidate = 60 

export async function GET() {
  const supabase = await createClient()

  try {
    const baseSelect = `
      *, 
      episodes(id, episode_number), 
      comic_ratings(rating)
    `

    // 1. กำหนดวันที่สำหรับ Filter
    const now = new Date()
    const weeklyDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
    const monthlyDate = new Date(now.setDate(now.getDate() - 23)).toISOString() // -30 (7+23)
    const yearlyDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()

    // 2. เตรียม Query ทั้งหมด (เหมือนใน page.tsx แต่รันบน Server)
    const queries = [
      // [0] Latest / Slider
      supabase.from('comics').select(baseSelect).eq('is_published', true).order('created_at', { ascending: false }).limit(10),
      
      // [1] Weekly Trending
      supabase.from('comics').select(baseSelect).eq('is_published', true).gte('updated_at', weeklyDate).order('view_count', { ascending: false }).limit(6),
      
      // [2] Monthly Popular
      supabase.from('comics').select(baseSelect).eq('is_published', true).gte('updated_at', monthlyDate).order('view_count', { ascending: false }).limit(6),
      
      // [3] Yearly Popular
      supabase.from('comics').select(baseSelect).eq('is_published', true).gte('updated_at', yearlyDate).order('view_count', { ascending: false }).limit(6),
      
      // [4-6] Genres
      supabase.from('comics').select(baseSelect).eq('is_published', true).contains('genre', ['ย้อนยุค']).order('created_at', { ascending: false }).limit(6),
      supabase.from('comics').select(baseSelect).eq('is_published', true).contains('genre', ['โรแมนติก']).order('created_at', { ascending: false }).limit(6),
      supabase.from('comics').select(baseSelect).eq('is_published', true).contains('genre', ['แอ็คชั่น']).order('created_at', { ascending: false }).limit(6),
    ]

    // 3. ยิงพร้อมกัน (Parallel Execution)
    const results = await Promise.all(queries)

    // 4. Helper Function แปรรูปข้อมูล (Calculate Rating & Latest Ep)
    const processData = (data: any[]) => {
      if (!data) return []
      return data.map((c: any) => {
        const latestEp = c.episodes?.length > 0 ? Math.max(...c.episodes.map((e: any) => e.episode_number)) : 0
        const sortedEps = c.episodes?.sort((a: any, b: any) => a.episode_number - b.episode_number) || []
        const firstEpId = sortedEps.length > 0 ? sortedEps[0].id : null
        
        const ratings = c.comic_ratings || []
        const avgRating = ratings.length > 0
            ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
            : '0.0'

        // ลบ field ที่ไม่จำเป็นออกเพื่อลดขนาด JSON
        const { episodes, comic_ratings, ...rest } = c 
        return { ...rest, latestEp, rating: avgRating, firstEpId }
      })
    }

    // 5. จัดระเบียบข้อมูลส่งกลับ
    const responseData = {
      latest: processData(results[0].data || []),
      slider: processData(results[0].data || []).slice(0, 5), // เอา 5 อันแรกของ latest มาทำ slider
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