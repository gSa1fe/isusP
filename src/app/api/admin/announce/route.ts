import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. ตรวจสอบสิทธิ์ Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, message, link } = await request.json()

    if (!title || !message) {
        return NextResponse.json({ error: 'Missing title or message' }, { status: 400 })
    }

    // 2. ดึง ID ของ User ทั้งหมดจากตาราง profiles
    // (เลือกเฉพาะ id เพื่อความเบา)
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
    
    if (usersError) throw usersError
    if (!users || users.length === 0) return NextResponse.json({ message: 'No users to notify' })

    // 3. เตรียมข้อมูลสำหรับ Insert ทีเดียว (Batch Insert)
    const notifications = users.map((u) => ({
        user_id: u.id,
        type: 'system', // ประเภท: ประกาศจากระบบ
        title,
        message,
        link: link || null,
        is_read: false
    }))

    // 4. บันทึกลง Database
    const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)

    if (insertError) throw insertError

    return NextResponse.json({ message: `Sent to ${users.length} users` })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}