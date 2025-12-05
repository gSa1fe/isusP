import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Update Session และ Refresh Token ตามปกติ
  const response = await updateSession(request)

  // 2. สร้าง Client ชั่วคราวเพื่อดึง User มาเช็คสิทธิ์
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // ไม่ต้องทำอะไรในนี้ เพราะ updateSession ทำไปแล้ว
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 🛡️ กฎที่ 1: ห้ามเข้าหน้า Admin ถ้าไม่ใช่ Admin (เบื้องต้นเช็คแค่ล็อกอินก่อน)
  // ถ้าจะเช็ค Role ลึกๆ อาจจะต้องดึงจาก DB เพิ่ม แต่เพื่อ Performance เอาแค่ User ก่อน
  if (path.startsWith('/admin')) {
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // (Optional) เช็ค Role admin แบบคร่าวๆ (ถ้าใส่ role ใน metadata ตอน signup)
    // if (user.user_metadata.role !== 'admin') { ... }
  }

  // 🛡️ กฎที่ 2: ห้ามเข้าหน้าส่วนตัว ถ้ายังไม่ล็อกอิน
  if (path.startsWith('/settings') || path.startsWith('/library')) {
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes มักจะมี logic check ของมันเองอยู่แล้ว)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}