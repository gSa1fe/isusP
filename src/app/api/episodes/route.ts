import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ✅ 1. เพิ่ม episode_number ใน Schema
const updateEpisodeSchema = z.object({
  id: z.string().uuid({ message: "Invalid Episode ID" }),
  title: z.string().min(1, { message: "Title cannot be empty" }),
  episode_number: z.number().optional(), // <--- เพิ่มบรรทัดนี้
  images: z.array(z.object({
    id: z.string().optional(),
    image_url: z.string().url(),
  })).min(1, { message: "At least one image is required" })
})

// ... (POST function เหมือนเดิม ไม่ต้องแก้) ...
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

    const imageRecords = images.map((img: any, index: number) => ({
      episode_id: episode.id,
      image_url: img.image_url,
      order_index: index + 1
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
// 2. PUT: แก้ไขตอน
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

    // ✅ 2. ดึง episode_number ออกมาใช้
    const { id, title, episode_number, images } = validation.data

    // 1. อัปเดตข้อมูลตอน (Title / Thumbnail / Episode Number)
    const { error: epError } = await supabase
        .from('episodes')
        .update({ 
            title,
            episode_number, // ✅ 3. สั่งบันทึกลง Database
            thumbnail_url: images.length > 0 ? images[0].image_url : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (epError) throw epError

    // 2. จัดการรูปภาพ (Logic เดิมที่ดีอยู่แล้ว)
    
    // 2.1 ลบรูปที่ผู้ใช้ลบออก
    const { data: existingImages } = await supabase.from('episode_images').select('id').eq('episode_id', id)
    const existingIds = existingImages?.map(img => img.id) || []
    const incomingIds = images.filter(img => img.id).map(img => img.id as string)
    
    const idsToDelete = existingIds.filter(oldId => !incomingIds.includes(oldId))
    
    if (idsToDelete.length > 0) {
        const { error: delError } = await supabase.from('episode_images').delete().in('id', idsToDelete)
        if (delError) throw delError
    }

    // 2.2 เตรียมข้อมูล Upsert
    const upsertData = images.map((img, index) => {
        const record: any = {
            episode_id: id,
            image_url: img.image_url,
            order_index: index + 1 // รันเลขใหม่
        }
        if (img.id) record.id = img.id
        
        return record
    })

    const { error: upsertError } = await supabase
        .from('episode_images')
        .upsert(upsertData)

    if (upsertError) throw upsertError

    return NextResponse.json({ success: true, message: 'Episode updated successfully' })

  } catch (error: any) {
    console.error('Update Episode Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ... (DELETE function เหมือนเดิม) ...
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