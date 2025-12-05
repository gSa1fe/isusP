import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// สร้างกฎ Validation
const profileSchema = z.object({
    username: z.string().min(3, "ชื่อต้องยาวกว่า 3 ตัวอักษร").max(20, "ชื่อต้องไม่เกิน 20 ตัวอักษร"),
    avatar_url: z.string().url().optional().or(z.literal(''))
})

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
    password: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร")
})

const emailSchema = z.object({
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง")
})

export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type } = body

    // ==========================================
    // 1. แก้ไข Profile
    // ==========================================
    if (type === 'profile') {
      // Validate
      const validation = profileSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
      }
      
      const { username, avatar_url } = validation.data

      // ✅ 1. อัปเดตลงตาราง profiles (Database) -- [สำคัญมาก! อันเก่าคุณลืมตรงนี้]
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ 
            id: user.id, // ต้องระบุ ID ด้วยเพื่อใช้เป็น Key ในการเช็ค
            username, 
            avatar_url, 
            updated_at: new Date().toISOString() 
            }, { onConflict: 'id' }) // ถ้า id ซ้ำให้ update, ถ้าไม่ซ้ำให้ insert

      if (dbError) throw dbError

      // ✅ 2. อัปเดต Auth User Metadata (เพื่อให้ Sync กัน)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: username, avatar_url }
      })
      
      if (authError) throw authError

      return NextResponse.json({ message: 'Profile updated' })
    }

    // ==========================================
    // 2. แก้ไข Password
    // ==========================================
    if (type === 'password') {
      const validation = passwordSchema.safeParse(body)
      if (!validation.success) {
        // ดึง Error ตัวแรกมาแสดง
        const firstError = validation.error.issues[0].message
        return NextResponse.json({ error: firstError }, { status: 400 })
      }

      const { currentPassword, password } = validation.data

      // 🔐 1. พิสูจน์ตัวตนด้วยรหัสเดิมก่อน (Re-authentication)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        return NextResponse.json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 })
      }

      // ✅ 2. ถ้ารหัสเดิมถูก ค่อยเปลี่ยนเป็นรหัสใหม่
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) throw error

      return NextResponse.json({ message: 'Password updated' })
    }

    // ==========================================
    // 3. แก้ไข Email
    // ==========================================
    if (type === 'email') {
      // เพิ่ม Validation อีเมลด้วยเพื่อความชัวร์
      const validation = emailSchema.safeParse(body)
      if (!validation.success) {
         return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 })
      }
      
      const { email } = validation.data

      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      
      return NextResponse.json({ message: 'Confirmation email sent' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}