import { NextResponse } from 'next/server'
// ใช้ path นี้ถอยกลับไปหา lib ให้เจอ (4 ชั้น)
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. ตรวจสอบว่ามี User มั้ย (เผื่อไว้)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 2. สั่ง Server ล้าง Session
    await supabase.auth.signOut()
  }

  // 3. ตอบกลับว่าเรียบร้อย
  return NextResponse.json({ message: 'Signed out successfully' })
}