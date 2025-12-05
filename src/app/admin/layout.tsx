'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, PlusCircle, LogOut, Settings, ShieldAlert, Megaphone } from 'lucide-react'
import { toast } from "sonner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // ตรวจสอบสิทธิ์
  useEffect(() => {
    const checkAdmin = async () => {
      // 1. เช็ค Login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 2. เช็ค Role ในตาราง profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        // ถ้าไม่ใช่ Admin ให้เตะออก
        toast.error('พื้นที่หวงห้าม! สำหรับ Admin เท่านั้น')
        router.push('/')
      } else {
        setIsAdmin(true)
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1016] text-white gap-4">
      <ShieldAlert className="w-12 h-12 text-primary animate-pulse" />
      <p className="text-gray-400 animate-pulse">กำลังตรวจสอบสิทธิ์ Admin...</p>
    </div>
  )

  // ถ้าเป็น Admin ให้แสดงหน้านี้
  return (
    <div className="flex min-h-screen bg-[#0d1016] text-gray-100">
      
      {/* --- Admin Sidebar --- */}
      <aside className="w-64 border-r border-white/10 bg-[#131720] hidden md:flex flex-col fixed h-full shadow-xl z-50">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
           <div>
             <h1 className="text-lg font-bold leading-none">Admin</h1>
             <span className="text-xs text-gray-500">Control Panel</span>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
          
          <NavItem href="/admin" icon={<LayoutDashboard />} label="ภาพรวม" active={pathname === '/admin'} />
          <NavItem href="/admin/comics/create" icon={<PlusCircle />} label="เพิ่มเรื่องใหม่" active={pathname === '/admin/comics/create'} />
          <NavItem href="/admin/comics" icon={<BookOpen />} label="จัดการการ์ตูน" active={pathname === '/admin/comics'} />
          <NavItem href="/admin/announce" icon={<Megaphone />} label="ส่งประกาศ" active={pathname === '/admin/announce'} />
          
          
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-medium">กลับหน้าบ้าน</span>
          </Link>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

// Component ย่อยสำหรับเมนู
function NavItem({ href, icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
        active 
          ? 'bg-primary text-[#0d1016] shadow-lg shadow-primary/20' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="w-5 h-5">{icon}</div>
      {label}
    </Link>
  )
}