import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type } = body

    // 1. แก้ไข Profile
    if (type === 'profile') {
      const { username, avatar_url } = body
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ username, avatar_url, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (dbError) throw dbError

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: username, avatar_url }
      })
      if (authError) throw authError

      return NextResponse.json({ message: 'Profile updated' })
    }

    // 2. แก้ไข Password
    if (type === 'password') {
      const { password } = body
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      return NextResponse.json({ message: 'Password updated' })
    }

    // 3. 👇 เพิ่มส่วนนี้: แก้ไข Email
    if (type === 'email') {
      const { email } = body
      // Supabase จะส่ง confirm mail ไปทั้ง email เก่าและใหม่
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