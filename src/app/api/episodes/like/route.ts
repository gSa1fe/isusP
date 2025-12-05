import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// 1. GET: เช็คว่าเรากดไลก์ยัง? และยอดรวมเท่าไหร่?
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const episode_id = searchParams.get('episode_id')

  if (!episode_id) return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 })

  try {
    // 1.1 นับจำนวนไลก์ทั้งหมด
    const { count, error } = await supabase
      .from('episode_likes')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', episode_id)

    if (error) throw error

    // 1.2 เช็คว่า User ปัจจุบันกดหรือยัง (ถ้าล็อกอิน)
    let isLiked = false
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        const { data } = await supabase
            .from('episode_likes')
            .select('user_id')
            .eq('episode_id', episode_id)
            .eq('user_id', user.id)
            .single()
        
        if (data) isLiked = true
    }

    return NextResponse.json({ count: count || 0, isLiked })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 2. POST: กดไลก์ / ยกเลิกไลก์ (Toggle)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { episode_id } = await request.json()
    if (!episode_id) return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 })

    // เช็คก่อนว่ากดหรือยัง
    const { data: existingLike } = await supabase
        .from('episode_likes')
        .select('*')
        .eq('episode_id', episode_id)
        .eq('user_id', user.id)
        .single()

    if (existingLike) {
        // ถ้ามีแล้ว -> ลบออก (Unlike)
        await supabase.from('episode_likes').delete().eq('user_id', user.id).eq('episode_id', episode_id)
        return NextResponse.json({ message: 'Unliked', liked: false })
    } else {
        // ถ้ายังไม่มี -> เพิ่มเข้า (Like)
        await supabase.from('episode_likes').insert({ user_id: user.id, episode_id })
        return NextResponse.json({ message: 'Liked', liked: true })
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}