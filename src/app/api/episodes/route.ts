import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// 1. สร้าง Schema นอกฟังก์ชัน (ถูกต้องแล้ว)
const updateEpisodeSchema = z.object({
  id: z.string().uuid({ message: "Invalid Episode ID" }),
  title: z.string().min(1, { message: "Title cannot be empty" }),
  images: z.array(z.object({
    id: z.string().optional(),
    image_url: z.string().url(),
  })).min(1, { message: "At least one image is required" })
})

// -------------------------------------------------------
// ฟังก์ชัน POST (สำหรับสร้างตอนใหม่)
// -------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    // Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { comic_id, title, episode_number, images } = body

    if (!comic_id || !title || !episode_number || !images || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert EPISODES
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .insert({
        comic_id,
        title,
        episode_number: parseInt(episode_number),
        // 👇 ป้องกัน Error ตรงนี้ด้วย
        thumbnail_url: (images && images.length > 0) ? images[0].image_url : null
      })
      .select()
      .single()

    if (epError) throw epError

    // Insert IMAGES
    const imageRecords = images.map((img: any) => ({
      episode_id: episode.id,
      image_url: img.image_url,
      order_index: img.page_number
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
// ฟังก์ชัน PUT (สำหรับแก้ไขตอน) - แก้ไขวงเล็บให้ถูกต้องแล้ว
// -------------------------------------------------------
export async function PUT(request: Request) {
  const supabase = await createClient()

  try {
    // 1. Check Auth & Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. รับข้อมูลและตรวจสอบ (Validation)
    const body = await request.json()
    const validation = updateEpisodeSchema.safeParse(body)

    if (!validation.success) {
        console.error("Validation Error:", validation.error.format())
        return NextResponse.json({ 
            error: 'Invalid data format', 
            details: validation.error.format() 
        }, { status: 400 })
    }

    const { id, title, images } = validation.data

    // 3. อัปเดตข้อมูลตอน (ใส่ Logic กันพังตรง thumbnail_url)
    const { error: epError } = await supabase
        .from('episodes')
        .update({ 
            title, 
            // 👇 ถ้ามีรูปใช้รูปแรก ถ้าไม่มีใส่ null (ไม่ Error)
            thumbnail_url: (images && images.length > 0) ? images[0].image_url : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (epError) throw epError

    // 4. จัดการรูปภาพ (ลบรูปเก่า -> อัปเดตลำดับ -> เพิ่มรูปใหม่)
    const { data: existingImages } = await supabase.from('episode_images').select('id').eq('episode_id', id)
    
    const existingIds = existingImages?.map(img => img.id) || []
    const incomingIds = images.filter(img => img.id).map(img => img.id as string)
    
    // ลบรูปที่หายไป
    const idsToDelete = existingIds.filter(oldId => !incomingIds.includes(oldId))
    if (idsToDelete.length > 0) {
        await supabase.from('episode_images').delete().in('id', idsToDelete)
    }

    // อัปเดตลำดับรูปเก่า
    const oldImages = images.filter(img => img.id)
    for (let i = 0; i < oldImages.length; i++) {
        await supabase.from('episode_images').update({ order_index: images.indexOf(oldImages[i]) + 1 }).eq('id', oldImages[i].id)
    }

    // เพิ่มรูปใหม่
    const newImages = images.filter(img => !img.id)
    if (newImages.length > 0) {
        const recordsToInsert = newImages.map(img => ({
            episode_id: id,
            image_url: img.image_url,
            order_index: images.indexOf(img) + 1
        }))
        await supabase.from('episode_images').insert(recordsToInsert)
    }

    // ✅ ส่ง Response กลับ (สำคัญมาก ห้ามลืม)
    return NextResponse.json({ success: true, message: 'Episode updated successfully' })

  } catch (error: any) {
    // ❌ ถ้า Error ต้องส่ง JSON กลับเสมอ ไม่งั้นหน้าเว็บจะขึ้น Unexpected end of JSON
    console.error('Update Episode API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// -------------------------------------------------------
// ฟังก์ชัน DELETE
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