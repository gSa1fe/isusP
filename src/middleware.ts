import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Update Session
  const response = await updateSession(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
},
      },
    }
  )

  // 2. ดึง User และเช็คสถานะ MFA
  const { data: { user } } = await supabase.auth.getUser()
  
  let isMfaPending = false
  if (user) {
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        isMfaPending = true
    }
  }

  const path = request.nextUrl.pathname

  // 🛡️ กฎที่ 1: หน้า Login/Signup
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user) {
      // ✅ แก้ไข: ถ้าติด 2FA อยู่ ให้ยอมอยู่ที่หน้า Login ได้ (อย่าเพิ่งดีดไปหน้าแรก)
      if (isMfaPending) {
        return response 
      }
      // ถ้า Login สมบูรณ์แล้ว (ไม่ติด 2FA) -> ถึงจะดีดไปหน้าแรก
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 🛡️ กฎที่ 2: หน้า Protected (Admin, Settings, etc.)
  const protectedRoutes = ['/admin', '/settings', '/library', '/history']
  if (protectedRoutes.some(r => path.startsWith(r))) {
    // ถ้ายังไม่ Login หรือ Login แล้วแต่ยังไม่ผ่าน 2FA -> ดีดกลับไป Login
    if (!user || isMfaPending) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}