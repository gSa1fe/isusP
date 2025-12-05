import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// บังคับไม่ให้ Cache เพื่อให้ได้ประวัติล่าสุดเสมอ
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // 1. ตรวจสอบ User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 2. ดึงข้อมูลจาก View ที่เราสร้างไว้ (มันกรองตัวซ้ำให้เสร็จสรรพแล้ว)
    const { data, error } = await supabase
      .from('distinct_reading_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20) // ดึงมาแค่ 20 เรื่องล่าสุดพอ (เพิ่มได้ตามต้องการ)

    if (error) throw error

    // 3. แปลงโครงสร้างข้อมูลให้ตรงกับที่หน้า Frontend (HistoryPage) คาดหวัง
    // Frontend เดิมรอรับ: { episodes: { comics: { ... } } }
    // แต่ View เราส่งมาแบบแบนๆ (flat) เลยต้อง map ให้โครงสร้างเหมือนเดิม
    const formattedHistory = data?.map((item: any) => ({
      id: `${item.user_id}_${item.episode_id}`, // สร้าง unique key จำลอง
      updated_at: item.updated_at,
      episode_id: item.episode_id,
      episodes: {
        episode_number: item.episode_number,
        title: item.episode_title,
        comics: {
          id: item.comic_id,
          title: item.comic_title,
          cover_image_url: item.cover_image_url,
          genre: item.genre,
          status: item.status
        }
      }
    })) || []

    return NextResponse.json({ history: formattedHistory })

  } catch (error: any) {
    console.error("History API Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}