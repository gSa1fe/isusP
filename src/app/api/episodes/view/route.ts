import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const { episode_id } = await request.json()
    if (!episode_id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const { data: { user } } = await supabase.auth.getUser()

    // ✅ เรียกใช้ Database Function ทีเดียวจบ (เร็วและแม่นยำกว่าเดิม 10 เท่า)
    const { data: result, error } = await supabase.rpc('view_episode', {
      p_episode_id: episode_id,
      p_user_id: user?.id || null // ถ้าไม่ล็อกอิน ส่ง null ไป
    })

    if (error) throw error

    return NextResponse.json({ message: result }) // 'Success' หรือ 'Cooldown'

  } catch (error: any) {
    console.error('View API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}