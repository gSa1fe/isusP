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
    
    // --- 🛡️ RATE LIMITING LOGIC (กันปั๊มวิว) ---
    let shouldCountView = true // ค่าเริ่มต้น: ให้นับวิว

    if (user) {
        // 1. ดึงประวัติการอ่านล่าสุดของ User กับตอนนี้
        const { data: history } = await supabase
            .from('reading_history')
            .select('updated_at')
            .eq('user_id', user.id)
            .eq('episode_id', episode_id)
            .single()

        // 2. ถ้าเคยอ่านแล้ว ให้เช็คเวลา
        if (history) {
            const lastViewTime = new Date(history.updated_at).getTime()
            const currentTime = new Date().getTime()
            const timeDiff = currentTime - lastViewTime
            const COOLDOWN_TIME = 10 * 60 * 1000 // 10 นาที (หน่วยมิลลิวินาที)

            // ถ้าเพิ่งอ่านไปไม่ถึง 10 นาที -> ห้ามบวกวิวเพิ่ม
            if (timeDiff < COOLDOWN_TIME) {
                shouldCountView = false 
            }
        }
    } else {
        // กรณี Guest (ไม่ได้ล็อกอิน): อาจจะยอมให้นับไปก่อน หรือใช้ IP Address เช็ค (แต่ซับซ้อนกว่า)
        // ในที่นี้ปล่อยผ่านให้นับได้เลย
    }

    // --- 🚀 EXECUTION ---

    // 3. บวกยอดวิว (เฉพาะเมื่อผ่านเงื่อนไข)
    if (shouldCountView) {
        const { error: rpcError } = await supabase.rpc('increment_view_count', { episode_uuid: episode_id })
        if (rpcError) {
            console.error('RPC Error:', rpcError)
            // ไม่ต้อง throw error เพื่อให้ process อื่นทำงานต่อได้ (แค่ log ไว้)
        }
    }

    // 4. บันทึกประวัติการอ่าน (History) - ทำเสมอเพื่ออัปเดตเวลา "อ่านล่าสุด"
    if (user) {
       // เรา Upsert เพื่ออัปเดตเวลา updated_at เป็นปัจจุบัน
       const { error: historyError } = await supabase
          .from('reading_history')
          .upsert({
              user_id: user.id,
              episode_id: episode_id,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, episode_id' })
       
       if (historyError) console.error('History Error:', historyError)
    }

    // 5. ส่ง Response
    return NextResponse.json({ 
        message: shouldCountView ? 'View counted' : 'View skipped (Cooling down)' 
    })

  } catch (error: any) {
    console.error('View Count API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}