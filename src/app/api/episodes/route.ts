import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateEpisodeSchema = z.object({
  id: z.string().uuid({ message: "Invalid Episode ID" }),
  title: z.string().min(1, { message: "Title cannot be empty" }),
  images: z.array(z.object({
    id: z.string().optional(),
    image_url: z.string().url(),
  })).min(1, { message: "At least one image is required" })
})

// -------------------------------------------------------
// 1. POST: สร้างตอนใหม่ (เหมือนเดิม แต่รีวิวให้มั่นใจว่าถูกต้อง)
// -------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { comic_id, title, episode_number, images } = body

    if (!comic_id || !title || !episode_number || !images || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .insert({
        comic_id,
        title,
        episode_number: parseInt(episode_number),
        thumbnail_url: (images && images.length > 0) ? images[0].image_url : null
      })
      .select()
      .single()

    if (epError) throw epError

    // Insert Images (ใช้ Promise.all เพื่อความเร็ว)
    const imageRecords = images.map((img: any, index: number) => ({
      episode_id: episode.id,
      image_url: img.image_url,
      order_index: index + 1 // ใช้ index ตรงๆ ได้เลยถ้าส่งมาเรียงแล้ว
    }))

    const { error: imgError } = await supabase.from('episode_images').insert(imageRecords)
    if (imgError) throw imgError

    return NextResponse.json({ message: 'Episode created successfully', episode })

  } catch (error: any) {
    console.error('Create Episode Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// -------------------------------------------------------
// 2. PUT: แก้ไขตอน (🔥 จุดที่แก้หลัก: ทำให้เร็วขึ้น)
// -------------------------------------------------------
export async function PUT(request: Request) {
  const supabase = await createClient()

  try {
    // Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate
    const validation = updateEpisodeSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ 
            error: 'ข้อมูลไม่ถูกต้อง', 
            details: validation.error.format() 
        }, { status: 400 })
    }

    const { id, title, images } = validation.data

    // 1. อัปเดตข้อมูลตอน
    const { error: epError } = await supabase
        .from('episodes')
        .update({ 
            title, 
            thumbnail_url: images.length > 0 ? images[0].image_url : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (epError) throw epError

    // 2. จัดการรูปภาพ (แบบรวดเร็ว 🚀)
    
    // 2.1 ดึงรูปเดิมมาเช็คว่าอันไหนโดนลบ
    const { data: existingImages } = await supabase.from('episode_images').select('id').eq('episode_id', id)
    const existingIds = existingImages?.map(img => img.id) || []
    const incomingIds = images.filter(img => img.id).map(img => img.id as string)
    
    // ลบรูปที่หายไป
    const idsToDelete = existingIds.filter(oldId => !incomingIds.includes(oldId))
    if (idsToDelete.length > 0) {
        await supabase.from('episode_images').delete().in('id', idsToDelete)
    }

    // 2.2 แยกรูปเก่า (Update) กับ รูปใหม่ (Insert)
    const updates = []
    const inserts = []

    // วนลูปเตรียมข้อมูล (ยังไม่ยิง DB)
    for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const newOrder = i + 1

        if (img.id) {
            // รูปเก่า: เตรียม Promise สำหรับ Update
            updates.push(
                supabase.from('episode_images')
                    .update({ order_index: newOrder })
                    .eq('id', img.id)
            )
        } else {
            // รูปใหม่: เก็บใส่ Array ไว้ Insert ทีเดียว
            inserts.push({
                episode_id: id,
                image_url: img.image_url,
                order_index: newOrder
            })
        }
    }

    // ⚡️ ยิงคำสั่ง Parallel (นี่คือจุดที่ทำให้เร็วขึ้นมาก)
    await Promise.all([
        ...updates, // ยิง update ทุกรูปพร้อมกัน
        inserts.length > 0 ? supabase.from('episode_images').insert(inserts) : Promise.resolve() // ยิง insert ทีเดียว
    ])

    return NextResponse.json({ success: true, message: 'Episode updated successfully' })

  } catch (error: any) {
    console.error('Update Episode Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// -------------------------------------------------------
// 3. DELETE: ลบตอน (เหมือนเดิม)
// -------------------------------------------------------
export async function DELETE(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const { error } = await supabase.from('episodes').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: 'Episode deleted successfully' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}