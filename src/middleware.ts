// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { 
          return request.cookies.getAll() 
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  // ✅ ใช้ getUser() เพื่อ refresh token อัตโนมัติ
  const { data: { user } } = await supabase.auth.getUser()
  
  // ✅ เช็คสถานะ 2FA
  let isMfaPending = false
  if (user) {
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
      isMfaPending = true
    }
  }

  const path = request.nextUrl.pathname

  // === หน้า /verify ===
  if (path.startsWith('/verify')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // ถ้าผ่าน 2FA แล้ว -> ไปหน้าแรก
    if (!isMfaPending) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // === บังคับ 2FA ก่อนเข้าหน้าอื่น ===
  if (user && isMfaPending) {
    const allowedPaths = ['/login', '/verify', '/api', '/_next', '/static']
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL('/verify', request.url))
    }
  }

  // === หน้า Login/Signup ===
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user && !isMfaPending) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // === Protected Routes ===
  const protectedRoutes = ['/admin', '/settings', '/library', '/history']
  if (protectedRoutes.some(r => path.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isMfaPending) {
      return NextResponse.redirect(new URL('/verify', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}