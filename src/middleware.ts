import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  // เช็คสถานะ 2FA
  let isMfaPending = false
  if (user) {
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        isMfaPending = true
    }
  }

  const path = request.nextUrl.pathname

  // 1. ถ้ายังไม่ Login เลย -> ห้ามเข้าหน้า Verify
  if (path.startsWith('/verify')) {
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
    // ถ้า Login แล้ว และผ่าน 2FA แล้ว (ไม่ Pending) -> จะมาหน้า verify ทำไม? กลับบ้านไป
    if (!isMfaPending) {
        return NextResponse.redirect(new URL('/', request.url))
    }
    // ถ้า isMfaPending = true -> อนุญาตให้เข้าหน้านี้ได้ (ถูกต้อง)
    return response
  }

  // 2. ถ้า Login แล้ว + ติด 2FA -> ห้ามไปหน้าอื่น นอกจาก /verify หรือ /login
  // (เช่นพยายามเข้า /admin หรือ /settings ทั้งที่ยังไม่กรอกรหัส)
  if (user && isMfaPending) {
      const allowedPaths = ['/login', '/verify', '/api', '/_next', '/static']
      if (!allowedPaths.some(p => path.startsWith(p))) {
          return NextResponse.redirect(new URL('/verify', request.url))
      }
  }

  // 3. กฎปกติ (Login/Signup)
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user && !isMfaPending) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 4. กฎ Protected Route
  const protectedRoutes = ['/admin', '/settings', '/library', '/history']
  if (protectedRoutes.some(r => path.startsWith(r))) {
    if (!user) {
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