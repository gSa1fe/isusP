import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ✅ 1. เพิ่ม Validation Schema เพื่อความปลอดภัย
const addImagesSchema = z.object({
  episode_id: z.string().uuid("Episode ID ไม่ถูกต้อง"),
  images: z.array(z.object({
    image_url: z.string().url("URL รูปภาพไม่ถูกต้อง"),
    order_index: z.number().int().min(0).optional(),
    page_number: z.number().int().min(0).optional() // รับเผื่อไว้ (บางทีหน้าบ้านส่งมาชื่อนี้)
  })).min(1, "ต้องส่งรูปภาพอย่างน้อย 1 รูป")
})

const deleteImageSchema = z.object({
  id: z.string().uuid("Image ID ไม่ถูกต้อง"),
  image_url: z.string().url("URL รูปภาพไม่ถูกต้อง").optional()
})

// =======================================================
// 🔵 POST: เพิ่มรูปภาพเข้าตอน
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
    
    // ✅ Validate Input
    const validation = addImagesSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง', details: validation.error.format() }, { status: 400 })
    }

    const { episode_id, images } = validation.data

    // Prepare Data
    const imageRecords = images.map((img) => ({
      episode_id,
      image_url: img.image_url,
      // ใช้ค่าที่มี หรือ default เป็น 0
      order_index: img.order_index ?? img.page_number ?? 0, 
      page_number: img.page_number ?? img.order_index ?? 0
    }))

    const { error } = await supabase
      .from('episode_images')
      .insert(imageRecords)

    if (error) throw error

    return NextResponse.json({ message: 'Images added successfully' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =======================================================
// 🔴 DELETE: ลบรูปภาพ
// =======================================================
export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    
    // ✅ Validate Input
    const validation = deleteImageSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }

    const { id, image_url } = validation.data

    // 1. ลบจาก Database
    const { error: dbError } = await supabase
      .from('episode_images')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    // 2. ลบไฟล์จาก Storage (ทำให้ Safe ขึ้น)
    if (image_url) {
        try {
            // ✅ ใช้ URL Object แกะ Path อย่างถูกวิธี
            const fileUrl = new URL(image_url)
            const pathParts = fileUrl.pathname.split('/')
            
            // หาตำแหน่งของ bucket name 'comic-images' แล้วเอา path หลังจากนั้น
            const bucketIndex = pathParts.indexOf('comic-images')
            if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                const relativePath = pathParts.slice(bucketIndex + 1).join('/')
                // ลบจริง
                await supabase.storage.from('comic-images').remove([relativePath])
            }
        } catch (urlError) {
            console.error("Error parsing image URL for deletion:", urlError)
            // ไม่ต้อง throw เพราะ DB ลบไปแล้ว แค่ไฟล์ขยะค้าง (ยอมรับได้ดีกว่าพังทั้ง flow)
        }
    }

    return NextResponse.json({ message: 'Image deleted successfully' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}