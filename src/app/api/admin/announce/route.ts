import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Check Admin (เหมือนเดิม)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, message, link } = await request.json()
    if (!title || !message) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    // 2. ดึง ID ของ User ทั้งหมด
    const { data: users, error: usersError } = await supabase.from('profiles').select('id')
    if (usersError) throw usersError
    if (!users || users.length === 0) return NextResponse.json({ message: 'No users' })

    // 3. ✅ แก้ไข: แบ่งทำทีละ 100 คน (Batch Processing) เพื่อความเสถียร
    const BATCH_SIZE = 100
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        // ตัดแบ่ง users มาทีละ 100 คน
        const batchUsers = users.slice(i, i + BATCH_SIZE)
        
        const notifications = batchUsers.map((u) => ({
            user_id: u.id,
            type: 'system',
            title,
            message,
            link: link || null,
            is_read: false
        }))

        const { error } = await supabase.from('notifications').insert(notifications)
        if (error) console.error(`Batch insert error at index ${i}:`, error)
    }

    return NextResponse.json({ message: `Sent to ${users.length} users successfully` })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}