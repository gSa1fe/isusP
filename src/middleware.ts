import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // ✅ อัปเดต Session ก่อนเสมอ (จะรีเฟรช Token ถ้าหมดอายุ)
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
          // ✅ ต้องอัปเดต cookies ทั้งใน request และ response
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response.cookies.set(cookiesToSet)
        },
      },
    }
  )
  
  // ✅ สำคัญ! ใช้ getSession() แทน getUser() เพื่อดึง Session ล่าสุดที่มี MFA Level
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  
  // เช็คสถานะ 2FA
  let isMfaPending = false
  if (user) {
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    // ✅ เช็คว่าต้อง 2FA (nextLevel = aal2) แต่ยังไม่ได้ทำ (currentLevel = aal1)
    if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        isMfaPending = true
    }
  }

  const path = request.nextUrl.pathname

  // ===================================================
  // 1. จัดการหน้า /verify
  // ===================================================
  if (path.startsWith('/verify')) {
    // ถ้ายังไม่ Login เลย -> ไปหน้า Login
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // ✅ ถ้า Login แล้ว และผ่าน 2FA แล้ว (ไม่ Pending) -> ไปหน้าแรก
    if (!isMfaPending) {
        return NextResponse.redirect(new URL('/', request.url))
    }
    
    // ถ้า isMfaPending = true -> อนุญาตให้อยู่หน้านี้ได้ (ยังไม่ Verify 2FA)
    return response
  }

  // ===================================================
  // 2. บังคับให้ทำ 2FA ก่อนเข้าหน้าอื่น
  // ===================================================
  if (user && isMfaPending) {
      // ✅ อนุญาตให้เข้าเฉพาะหน้าเหล่านี้ตอนยังไม่ผ่าน 2FA
      const allowedPaths = ['/login', '/verify', '/api', '/_next', '/static']
      
      if (!allowedPaths.some(p => path.startsWith(p))) {
          // ถ้าพยายามเข้าหน้าอื่น (เช่น /admin, /settings) -> บังคับกลับไป /verify
          return NextResponse.redirect(new URL('/verify', request.url))
      }
  }

  // ===================================================
  // 3. จัดการหน้า Login/Signup
  // ===================================================
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    // ✅ ถ้า Login แล้ว และผ่าน 2FA แล้ว -> ไม่ต้องมาหน้านี้อีก ไปหน้าแรก
    if (user && !isMfaPending) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ===================================================
  // 4. ป้องกัน Protected Routes
  // ===================================================
  const protectedRoutes = ['/admin', '/settings', '/library', '/history']
  
  if (protectedRoutes.some(r => path.startsWith(r))) {
    // ถ้ายังไม่ Login เลย -> ไปหน้า Login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // ✅ ถ้า Login แล้ว แต่ยังไม่ผ่าน 2FA -> บังคับไป /verify
    if (isMfaPending) {
      return NextResponse.redirect(new URL('/verify', request.url))
    }
  }

  // ✅ ส่ง response ที่มี cookies อัปเดตแล้วกลับไป
  return response
}

export const config = {
  matcher: [
    // ✅ ไม่ต้อง run middleware บน static files, images, และ API routes ภายนอก
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}