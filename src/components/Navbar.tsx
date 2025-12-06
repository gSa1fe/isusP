"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, Menu, Home, BookOpen, LogOut, Settings, Library, History } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // 1. เช็คตอนโหลดหน้าครั้งแรก
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        
        // ดึง Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(profileData)
      }
    }
    initData()

    // 2. เช็คตอนสถานะ Auth เปลี่ยน
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()
        
        setProfile(profileData)
      } else {
        setProfile(null)
      }

      if (event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    setUser(null)
    setProfile(null)
    await fetch('/api/auth/signout', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (pathname?.startsWith('/read/')) {
    return null
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = profile?.username || user?.user_metadata?.full_name || 'User'

  const menuItems = [
    { href: '/', label: 'หน้าหลัก', icon: Home },
    { href: '/library', label: 'ชั้นหนังสือ', icon: Library },
    { href: '/history', label: 'ประวัติการอ่าน', icon: History },
    { href: '/genres', label: 'หมวดหมู่', icon: BookOpen },
    { href: '/settings', label: 'ตั้งค่าส่วนตัว', icon: Settings, auth: true },
  ]

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim()
      if (query) {
        router.push(`/search?q=${encodeURIComponent(query)}`)
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* --- LEFT SECTION --- */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] bg-[#0d1016] border-r border-white/10 p-0 flex flex-col text-foreground">
              <div className="p-6 border-b border-white/10 bg-gradient-to-br from-[#1a1f29] to-[#0d1016]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-3 text-xl font-bold text-white">
                    <div><span className="block leading-none">HEEDOM881</span></div>
                  </SheetTitle>
                </SheetHeader>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">เมนู</p>
                {menuItems.map((item) => {
                  if (item.auth && !user) return null
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-white transition-colors'}`} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity hidden md:block">HEEDOM881</span>
          </Link>
        </div>

        {/* --- CENTER SECTION --- */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full group">
            <Link href="/search"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" /></Link>
            <SearchBar type="search" placeholder="ค้นหาการ์ตูน..." className="w-full pl-10 bg-secondary/50 border-transparent text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary transition-all rounded-full h-10" onKeyDown={handleSearch}/>
          </div>
        </div>

        {/* --- RIGHT SECTION --- */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center mr-4 gap-1">
            <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-primary"><Link href="/library"><Library className="w-5 h-5" /></Link></Button>
            <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-primary"><Link href="/history"><History className="w-5 h-5" /></Link></Button>
          </div>

          {user ? (
            <>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                <NotificationBell />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all ml-1 w-9 h-9">
                    <Avatar className="h-full w-full cursor-pointer border border-border/50">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#1a1f29] text-white border-white/10 shadow-xl rounded-xl">
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none truncate">{displayName}</p>
                      <p className="text-xs leading-none text-gray-400 truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild className="focus:bg-white/10 cursor-pointer">
                    <Link href="/library" className="flex w-full items-center"><Library className="mr-2 h-4 w-4 text-primary" /> ชั้นหนังสือ</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-white/10 cursor-pointer">
                    <Link href="/history" className="flex w-full items-center"><History className="mr-2 h-4 w-4 text-primary" /> ประวัติการอ่าน</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-white/10 cursor-pointer">
                    <Link href="/settings" className="flex w-full items-center"><Settings className="mr-2 h-4 w-4" /> ตั้งค่าส่วนตัว</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild className="hidden sm:flex text-gray-300 hover:text-white hover:bg-white/5">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button asChild className="bg-primary text-[#0d1016] hover:bg-primary/90 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Link href="/signup">สมัครสมาชิก</Link>
              </Button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}