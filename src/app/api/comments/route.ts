import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// 1. Schema สำหรับตรวจสอบคอมเมนต์
const commentSchema = z.object({
  comic_id: z.string().uuid().optional(),
  episode_id: z.string().uuid().optional(),
  content: z.string()
    .min(1, { message: "กรุณาพิมพ์ข้อความ" })
    .max(500, { message: "คอมเมนต์ยาวเกินไป (สูงสุด 500 ตัวอักษร)" })
    .trim()
}).refine(data => data.comic_id || data.episode_id, {
    message: "ต้องระบุ Comic ID หรือ Episode ID อย่างใดอย่างหนึ่ง"
})

// =======================================================
// 🟢 GET: ดึงคอมเมนต์ (แบบ Optimized Pagination ⚡)
// =======================================================
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const comic_id = searchParams.get('comic_id')
  const episode_id = searchParams.get('episode_id')
  
  // Pagination Params
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10') 
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)') // ❌ ไม่ใช้ { count: 'exact' } แล้ว เพื่อความเร็ว
      .order('created_at', { ascending: false })
      .range(offset, offset + limit) // ✅ ดึงมาเกิน 1 ตัว (Limit + 1) เพื่อเช็คว่ามีหน้าถัดไปไหม

    if (comic_id) query = query.eq('comic_id', comic_id)
    if (episode_id) query = query.eq('episode_id', episode_id)

    const { data, error } = await query

    if (error) throw error

    // ✅ Logic เช็คหน้าถัดไป (Pagination)
    // ถ้าดึงมาได้มากกว่า limit แสดงว่ายังมีข้อมูลเหลือ (hasMore = true)
    const hasMore = (data?.length || 0) > limit
    
    // ตัดตัวที่เกินออกก่อนส่งกลับ
    const comments = hasMore ? data?.slice(0, limit) : data

    return NextResponse.json({
      data: comments,
      meta: {
        // total: 0, // เราไม่ส่ง total แล้ว เพราะไม่ได้นับ (เร็วกว่ามาก)
        page,
        limit,
        hasMore
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔵 POST: เพิ่มคอมเมนต์ใหม่
// =======================================================
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนคอมเมนต์' }, { status: 401 })

    // 2. Validate Input
    const body = await request.json()
    const validation = commentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ถูกต้อง', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    const { content, comic_id, episode_id } = validation.data

    // 3. Rate Limit (กันสแปม)
    const { data: lastComment } = await supabase
        .from('comments')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (lastComment) {
        const lastTime = new Date(lastComment.created_at).getTime()
        const now = new Date().getTime()
        if (now - lastTime < 10 * 1000) { // 10 วินาที
            return NextResponse.json({ error: 'คุณคอมเมนต์เร็วเกินไป กรุณารอสักครู่' }, { status: 429 })
        }
    }

    // 4. Insert Comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        content,
        comic_id,
        episode_id
      })
      .select('*, profiles(username, avatar_url)')
      .single()

    if (error) throw error

    return NextResponse.json({ message: 'Comment success', data })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔴 DELETE: ลบคอมเมนต์
// =======================================================
export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // เช็คสิทธิ์ (เจ้าของ หรือ Admin)
        const { data: comment } = await supabase.from('comments').select('user_id').eq('id', id).single()
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

        const isAdmin = profile?.role === 'admin'
        const isOwner = comment?.user_id === user.id

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { error } = await supabase.from('comments').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ message: 'Deleted successfully' })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}