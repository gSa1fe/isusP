import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema Validation สำหรับ POST
const librarySchema = z.object({
  comic_id: z.string().uuid({ message: "Comic ID ไม่ถูกต้อง" })
})

// =======================================================
// 🟢 GET: ดึงข้อมูล (เช็คสถานะ หรือ ดึงทั้งชั้น)
// =======================================================
// 👇 แก้ไข: ลบตัว e ที่เกินมาออก (จาก eexport เป็น export)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // กรณี A: เช็คสถานะ (สำหรับปุ่มกดติดตาม)
    if (comic_id) {
      const { data, error } = await supabase
        .from('library')
        // 👇 เปลี่ยนเป็น comic_id เพื่อความชัวร์ (บางทีตาราง junction ไม่มี id)
        .select('comic_id') 
        .eq('user_id', user.id)
        .eq('comic_id', comic_id)
        .limit(1)

      if (error) {
          console.error("Library Check Error:", error)
          // ถ้า error ให้ return false ดีกว่าพัง
          return NextResponse.json({ inLibrary: false }) 
      }

      const exists = data && data.length > 0
      return NextResponse.json({ inLibrary: exists })
    }

    // กรณี B: ดึงรายการทั้งหมด (สำหรับหน้า My Library)
    const { data, error } = await supabase
      .from('library')
      .select(`
        created_at,
        comics (
          id, 
          title, 
          cover_image_url, 
          genre, 
          status,
          updated_at,
          episodes (episode_number),
          comic_ratings (rating)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error("Library API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔵 POST: เพิ่มเข้าชั้นหนังสือ
// =======================================================
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 })

    const body = await request.json()
    const validation = librarySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }

    const { comic_id } = validation.data

    const { error } = await supabase
      .from('library')
      .upsert(
        { user_id: user.id, comic_id },
        { onConflict: 'user_id, comic_id' }
      )

    if (error) throw error

    return NextResponse.json({ message: 'Added to library' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔴 DELETE: ลบออกจากชั้นหนังสือ
// =======================================================
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const comic_id = searchParams.get('comic_id')

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!comic_id) return NextResponse.json({ error: 'Missing Comic ID' }, { status: 400 })

    const { error } = await supabase
      .from('library')
      .delete()
      .eq('user_id', user.id)
      .eq('comic_id', comic_id)

    if (error) throw error

    return NextResponse.json({ message: 'Removed from library' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}