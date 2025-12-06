import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // ✅ สำเร็จ - redirect ไปหน้าแรก
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // ❌ ถ้ามี error ให้ redirect ไปหน้า login พร้อม error message
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}