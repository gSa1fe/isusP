import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 60 

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient()

  try {
    // 1. ดึงข้อมูล Comic (ตอนนี้มี avg_rating และ total_views จากการทำ Trigger แล้ว)
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .select('*') 
      .eq('id', id)
      .single()

    if (comicError || !comic) {
        return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }

    // 2. ดึง Episodes
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, title, episode_number, view_count, created_at, episode_likes(count)')
      .eq('comic_id', id)
      .order('episode_number', { ascending: false })

    const formattedEpisodes = episodes?.map((ep: any) => ({
        ...ep,
        likes_count: ep.episode_likes?.[0]?.count || 0
    })) || []

    // คำนวณยอด Like รวม (อันนี้ยังต้องบวกเอง เพราะเราไม่ได้ทำ Trigger ให้ Like)
    const totalLikes = formattedEpisodes.reduce((sum: number, ep: any) => sum + ep.likes_count, 0)

    // 3. ✅ ดึง Recommendations (ส่วนที่หายไป) แบบ Optimized
    // ดึง avg_rating จากตารางได้เลย ไม่ต้อง join comic_ratings มาคำนวณใหม่
    let recommendations: any[] = []
    if (comic.genre && comic.genre.length > 0) {
        const { data: recData } = await supabase
            .from('comics')
            .select('id, title, cover_image_url, genre, status, avg_rating') // ดึง avg_rating ตรงๆ
            .contains('genre', [comic.genre[0]])
            .neq('id', id)
            .eq('is_published', true)
            .limit(6)
        
        if (recData) {
            recommendations = recData.map((c: any) => ({
                ...c,
                // แปลงค่าให้ frontend แสดงผลได้ (ถ้า null ให้เป็น '0.0')
                rating: c.avg_rating ? c.avg_rating.toFixed(1) : '0.0' 
            }))
        }
    }

    return NextResponse.json({
      comic,
      episodes: formattedEpisodes,
      stats: { 
        totalViews: comic.total_views || 0, // ใช้ค่าจาก DB
        totalLikes 
      }, 
      recommendations // ส่งกลับไปแล้ว
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}