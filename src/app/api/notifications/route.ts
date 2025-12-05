import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// 1. GET: ดึงรายการแจ้งเตือนของฉัน
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ notifications: [], count: 0 })

  // ดึงข้อมูล (เอาเฉพาะที่ยังไม่อ่าน หรืออ่านแล้วแต่ไม่เก่ามากก็ได้)
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20) // ดึงมาแค่ 20 อันล่าสุด

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // นับจำนวนที่ยังไม่อ่าน
  const unreadCount = data?.filter(n => !n.is_read).length || 0

  return NextResponse.json({ notifications: data, unreadCount })
}

// 2. PATCH: กด "อ่านแล้ว"
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await request.json()

    // ถ้าส่ง id มาคืออ่านอันเดียว, ถ้าไม่ส่งคือ "อ่านทั้งหมด"
    let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)

    if (id) {
        query = query.eq('id', id)
    } else {
        query = query.eq('is_read', false) // อัปเดตเฉพาะที่ยังไม่อ่าน
    }

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ message: 'Marked as read' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}