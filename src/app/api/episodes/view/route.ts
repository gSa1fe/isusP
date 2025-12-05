import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const { episode_id } = await request.json()
    
    if (!episode_id) {
        return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    // --- 1. RATE LIMITING (เหมือนเดิม) ---
    let shouldCountView = true 

    if (user) {
        const { data: history } = await supabase
            .from('reading_history')
            .select('updated_at')
            .eq('user_id', user.id)
            .eq('episode_id', episode_id)
            .single()

        if (history) {
            const lastViewTime = new Date(history.updated_at).getTime()
            const currentTime = new Date().getTime()
            const timeDiff = currentTime - lastViewTime
            const COOLDOWN_TIME = 10 * 60 * 1000 // 10 นาที

            if (timeDiff < COOLDOWN_TIME) {
                shouldCountView = false 
            }
        }
    }

    // --- 🚀 2. EXECUTION (แบบ Parallel) ---
    // เตรียมงานที่จะทำ (Task List)
    const tasks = []

    // Task A: บวกยอดวิว
    if (shouldCountView) {
        // ใช้ rpc (Database Function)
        tasks.push(
            supabase.rpc('increment_view_count', { episode_uuid: episode_id })
                .then(({ error }) => { if (error) console.error('RPC Error:', error) })
        )
    }

    // Task B: บันทึกประวัติการอ่าน
    if (user) {
       tasks.push(
          supabase.from('reading_history')
          .upsert({
              user_id: user.id,
              episode_id: episode_id,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, episode_id' })
          .then(({ error }) => { if (error) console.error('History Error:', error) })
       )
    }

    // 🔥 สั่งทำพร้อมกันเลย ไม่ต้องรอต่อคิว
    await Promise.all(tasks)

    return NextResponse.json({ 
        message: shouldCountView ? 'View counted' : 'View skipped (Cooling down)' 
    })

  } catch (error: any) {
    console.error('View Count API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}