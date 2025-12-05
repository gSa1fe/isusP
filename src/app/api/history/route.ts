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
    // 2. ดึงข้อมูลประวัติ (ดึงมาเผื่อเยอะหน่อย เช่น 50 รายการ เพื่อมาคัดกรอง)
    const { data, error } = await supabase
      .from('reading_history')
      .select(`
        updated_at,
        episode_id,
        episodes!inner (
          episode_number,
          title,
          comics!inner (
            id,
            title,
            cover_image_url,
            genre
          )
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50) // ดึงมา 50 รายการล่าสุดมาคัดกรอง

    if (error) throw error

    // 3. 🟢 กรองข้อมูลซ้ำ (Group by Comic ID) ที่ Server เลย
    const uniqueHistoryMap = new Map()
    
    data.forEach((item: any) => {
        // เช็คความปลอดภัยของข้อมูลก่อน
        const comic = item.episodes?.comics
        if (!comic) return

        // ถ้ายังไม่มีเรื่องนี้ในรายการ ให้ใส่เข้าไป (เพราะเราเรียง updated_at มากสุดไว้อยู่แล้ว อันแรกที่เจอคือล่าสุดเสมอ)
        if (!uniqueHistoryMap.has(comic.id)) {
            uniqueHistoryMap.set(comic.id, item)
        }
    })

    // แปลงกลับเป็น Array เพื่อส่งกลับไป
    const uniqueHistory = Array.from(uniqueHistoryMap.values())

    return NextResponse.json({ history: uniqueHistory })

  } catch (error: any) {
    console.error("History API Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}