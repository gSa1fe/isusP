'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase' // Client supabase
import { Bell, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area" // ถ้าไม่มี ScrollArea ให้ใช้ div overflow-y-auto แทน

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    }
  }

  useEffect(() => {
    // 1. หา User ID
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserId(user.id)
            fetchNotifications()
        }
    }
    getUser()
  }, [])

  // 2. Realtime Listener (เด้งทันทีเมื่อมีแจ้งเตือนใหม่)
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`, // ฟังเฉพาะของตัวเอง
        },
        (payload) => {
          // เมื่อมีอันใหม่เข้ามา ให้เพิ่มลงใน State ทันที
          setNotifications((prev) => [payload.new, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAsRead = async (id?: string) => {
    // Optimistic update
    if (id) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    // Call API
    await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
  }

  if (!userId) return null // ไม่ล็อกอินไม่แสดง

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0d1016] animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-[#1a1f29] border-white/10 text-white shadow-xl">
        <div className="flex items-center justify-between px-4 py-2">
            <span className="font-bold text-sm">การแจ้งเตือน</span>
            {unreadCount > 0 && (
                <button onClick={() => markAsRead()} className="text-[10px] text-primary hover:underline cursor-pointer">
                    อ่านทั้งหมด
                </button>
            )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        
        <div className="max-h-[300px] overflow-y-auto">
            {notifications.length > 0 ? (
                notifications.map((n) => (
                    <DropdownMenuItem 
                        key={n.id} 
                        className={`p-3 cursor-pointer focus:bg-white/5 border-b border-white/5 last:border-0 ${!n.is_read ? 'bg-white/5' : ''}`}
                        onClick={() => {
                            if (!n.is_read) markAsRead(n.id)
                        }}
                    >
                        <Link href={n.link || '#'} className="w-full">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <p className={`text-sm ${!n.is_read ? 'font-bold text-white' : 'text-gray-400'}`}>{n.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            </div>
                        </Link>
                    </DropdownMenuItem>
                ))
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    ไม่มีการแจ้งเตือน
                </div>
            )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}