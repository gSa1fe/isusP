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

  const path = request.nextUrl.pathname

  // === หน้า Login/Signup ===
  // ถ้าล็อกอินแล้ว -> redirect ไปหน้าแรก
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // === Protected Routes ===
  // ต้องล็อกอินก่อนถึงเข้าได้
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}