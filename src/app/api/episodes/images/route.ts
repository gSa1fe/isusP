import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const addImagesSchema = z.object({
  episode_id: z.string().uuid("Episode ID ไม่ถูกต้อง"),
  images: z.array(z.object({
    image_url: z.string().url("URL รูปภาพไม่ถูกต้อง"),
    // รับ order_index หรือ page_number มาก็ได้
    order_index: z.number().int().min(0).optional(),
    page_number: z.number().int().min(0).optional()
  })).min(1, "ต้องส่งรูปภาพอย่างน้อย 1 รูป")
})

const deleteImageSchema = z.object({
  id: z.string().uuid("Image ID ไม่ถูกต้อง"),
  image_url: z.string().url("URL รูปภาพไม่ถูกต้อง").optional()
})

// =======================================================
// 🔵 POST: เพิ่มรูปภาพเข้าตอน (เรียงลำดับให้ด้วย)
// =======================================================
export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  
  try {
    const body = await request.json()
    const validation = addImagesSchema.safeParse(body)
    
    if (!validation.success) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง', details: validation.error.format() }, { status: 400 })
    }

    const { episode_id, images } = validation.data

    // 1. หาค่า order_index สูงสุดเดิมก่อน (เพื่อต่อท้าย)
    const { data: maxOrderData } = await supabase
        .from('episode_images')
        .select('order_index')
        .eq('episode_id', episode_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
    
    let nextOrder = (maxOrderData?.order_index || 0) + 1

    // 2. เตรียมข้อมูล (รันเลขต่อให้เองเลย ไม่สนที่ส่งมา เพื่อความชัวร์)
    const imageRecords = images.map((img) => {
        const record = {
            episode_id,
            image_url: img.image_url,
            order_index: nextOrder, // ใช้ค่าที่เรารันเอง
            page_number: nextOrder  // สำรองไว้
        }
        nextOrder++;
        return record;
    })

    const { error } = await supabase
      .from('episode_images')
      .insert(imageRecords)

    if (error) throw error

    return NextResponse.json({ message: 'Images added successfully', count: imageRecords.length })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔴 DELETE: ลบรูปภาพ (เหมือนเดิมแต่เพิ่มความปลอดภัย)
// =======================================================
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validation = deleteImageSchema.safeParse(body)
    
    if (!validation.success) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })

    const { id, image_url } = validation.data

    // 1. ลบจาก Database
    const { error: dbError } = await supabase
      .from('episode_images')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    // 2. ลบไฟล์จาก Storage
    if (image_url) {
        try {
            const fileUrl = new URL(image_url)
            const pathParts = fileUrl.pathname.split('/')
            const bucketIndex = pathParts.indexOf('comic-images')
            if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                const relativePath = pathParts.slice(bucketIndex + 1).join('/')
                await supabase.storage.from('comic-images').remove([relativePath])
            }
        } catch (e) { console.error("URL Parse Error", e) }
    }

    return NextResponse.json({ message: 'Image deleted successfully' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}