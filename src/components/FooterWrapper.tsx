'use client' //  สำคัญ: ต้องใส่เพื่อให้ใช้ usePathname ได้

import { usePathname } from 'next/navigation'
import Footer from '@/components/Footer'

export default function FooterWrapper() {
  const pathname = usePathname()

  // เช็คเงื่อนไข: ถ้า URL ขึ้นต้นด้วย '/admin' ให้ return null (ไม่แสดงอะไรเลย)
  if (pathname?.startsWith('/admin')) {
    return null
  }

  // ถ้าไม่ใช่หน้า Admin ให้แสดง Footer ตามปกติ
  return <Footer />
}