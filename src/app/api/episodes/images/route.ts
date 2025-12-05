import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// 1. POST: เพิ่มรูปภาพเข้าตอน (Add Images)
export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const body = await request.json()
    const { episode_id, images } = body // images = [{ image_url, order_index }]

    if (!episode_id || !images) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Prepare Data (แก้ปัญหา order_index null ตรงนี้)
    const imageRecords = images.map((img: any) => ({
      episode_id,
      image_url: img.image_url,
      // ใส่ค่าให้ทั้งคู่เพื่อกันเหนียว
      order_index: img.order_index, 
      page_number: img.order_index 
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

// 2. DELETE: ลบรูปภาพ (Delete Image)
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, image_url } = body // รับ ID ของ row และ URL ของรูปเพื่อไปลบใน Storage

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // 1. ลบจาก Database
    const { error: dbError } = await supabase
      .from('episode_images')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    // 2. (Optional) ลบไฟล์จาก Storage เพื่อไม่ให้รก
    // ต้องตัด domain ออกให้เหลือแค่ path เช่น "episodes/..."
    if (image_url) {
        const path = image_url.split('/storage/v1/object/public/comic-images/')[1]
        if (path) {
            await supabase.storage.from('comic-images').remove([path])
        }
    }

    return NextResponse.json({ message: 'Image deleted successfully' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}