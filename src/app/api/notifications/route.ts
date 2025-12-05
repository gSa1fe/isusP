import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// 1. GET: ดึงรายการแจ้งเตือนของฉัน (พร้อมจำนวนที่ยังไม่อ่านที่ถูกต้อง)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 })

  try {
    // A. Query ดึงข้อมูลมาแสดง (Limit 20)
    const notificationsQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    // B. Query นับจำนวนที่ยังไม่อ่าน (Count ทั้งหมด ไม่สน limit)
    const unreadCountQuery = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true }) // head: true คือเอาแค่จำนวน ไม่เอาข้อมูล
        .eq('user_id', user.id)
        .eq('is_read', false)

    // ยิงพร้อมกันเพื่อความเร็ว
    const [notifRes, unreadRes] = await Promise.all([notificationsQuery, unreadCountQuery])

    if (notifRes.error) throw notifRes.error
    
    return NextResponse.json({ 
        notifications: notifRes.data || [], 
        unreadCount: unreadRes.count || 0 // ได้ค่าจริงที่ถูกต้อง
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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