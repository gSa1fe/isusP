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
    // ... validation ...

    // 1. ดึง User ทั้งหมด
    const { data: users } = await supabase.from('profiles').select('id')
    if (!users?.length) return NextResponse.json({ message: 'No users' })

    // 2. แบ่งทำทีละ 100 คน (Batch) เพื่อไม่ให้ Database สำลัก
    const BATCH_SIZE = 100
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE).map(u => ({
            user_id: u.id,
            type: 'system',
            title,
            message,
            link: link || null,
            is_read: false
        }))

        const { error } = await supabase.from('notifications').insert(batch)
        if (error) console.error('Batch error:', error)
    }

    return NextResponse.json({ message: `Process complete for ${users.length} users` })

} catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}