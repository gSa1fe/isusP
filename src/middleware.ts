import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Update Session และ Refresh Token ตามปกติ (เพื่อให้ Auth สถานะเป็นปัจจุบัน)
  const response = await updateSession(request)

  // 2. สร้าง Client ชั่วคราวเพื่อดึงข้อมูล User มาเช็คสิทธิ์
  // (เราต้องสร้างใหม่ตรงนี้เพราะ middleware ทำงานก่อนเข้า Page)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // ใน Middleware เราจัดการ cookies ผ่าน response ที่ได้จาก updateSession แล้ว
          // ตรงนี้เลยปล่อยว่างไว้ได้ หรือจัดการตาม logic ของ updateSession
        },
      },
    }
  )

  // ดึง User ปัจจุบัน
  const { data: { user } } = await supabase.auth.getUser()
  
  // ดึง Path ปัจจุบัน
  const path = request.nextUrl.pathname

  // ============================================================
  // 🛡️ กฎความปลอดภัย (Security Rules)
  // ============================================================

  // 🛑 กฎที่ 1: ห้ามเข้าหน้า Admin ทั้งหมด ถ้ายังไม่ล็อกอิน
  // (ในอนาคตควรเช็ค user.role === 'admin' ด้วย)
  if (path.startsWith('/admin')) {
    if (!user) {
        // ส่งกลับไปหน้า Login
        return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // (Optional: ถ้าคุณเก็บ role ไว้ใน user_metadata ก็เช็คตรงนี้ได้เลย)
    /*
    if (user.user_metadata.role !== 'admin') {
       return NextResponse.redirect(new URL('/', request.url)) // ดีดกลับหน้าแรก
    }
    */
  }

  // 🛑 กฎที่ 2: ห้ามเข้าหน้าส่วนตัว (Settings, Library) ถ้ายังไม่ล็อกอิน
  if (path.startsWith('/settings') || path.startsWith('/library') || path.startsWith('/history')) {
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 🛑 กฎที่ 3: ถ้าล็อกอินแล้ว ห้ามเข้าหน้า Login/Signup อีก (เด้งไปหน้าแรกเลย)
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
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
     * - api (API routes มักจะมี logic check ของมันเองอยู่แล้ว แต่ถ้าอยากกันด้วยก็ได้)
     * - .*\\.(?:svg|png|jpg|jpeg|gif|webp)$ (ไฟล์รูปภาพ)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}