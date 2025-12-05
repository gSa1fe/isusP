'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { History, BookOpen, Loader2, Calendar } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from '@/lib/supabase'

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history')
            if (res.ok) {
                const data = await res.json()
                const rawHistory = data.history || []

                // --- 🌟 Logic การกรองข้อมูลให้เหลือเรื่องละ 1 รายการ (ตอนล่าสุด) ---
                const uniqueComics = new Map()

                rawHistory.forEach((item: any) => {
                    const comicId = item.episodes?.comics?.id
                    if (!comicId) return

                    // ถ้ายังไม่มีเรื่องนี้ใน Map หรือ เจออันที่ใหม่กว่า (updated_at ล่าสุดกว่า) ให้บันทึกทับ
                    if (!uniqueComics.has(comicId)) {
                        uniqueComics.set(comicId, item)
                    } else {
                        // เปรียบเทียบวันที่อ่าน (item.updated_at)
                        const current = uniqueComics.get(comicId)
                        if (new Date(item.updated_at) > new Date(current.updated_at)) {
                            uniqueComics.set(comicId, item)
                        }
                    }
                })

                // แปลง Map กลับเป็น Array
                setHistory(Array.from(uniqueComics.values()))
            }
        } catch (error) {
            console.error("Failed to fetch history")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0d1016] text-white"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>

    return (
        <div className="min-h-screen bg-[#0d1016] pb-20 pt-8 text-white">
            <div className="container mx-auto px-4 max-w-6xl">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                            <History className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white">ประวัติการอ่าน</h1>
                            <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
                                <BookOpen className="w-3 h-3" />
                                รายการที่คุณอ่านล่าสุด ({history.length})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {history.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {history.map((item: any) => {
                            const episode = item.episodes
                            const comic = episode?.comics

                            if (!episode || !comic) return null

                            return (
                                <Link key={item.id} href={`/read/${item.episode_id}`} className="group block h-full">
                                    <Card className="bg-[#131720] border-white/5 rounded-xl overflow-hidden h-full hover:border-primary/30 transition-all">
                                        <CardContent className="p-0 flex h-full">

                                            {/* --- Cover Image (Fixed Aspect Ratio 2:3) --- */}
                                            <div className="flex p-4 sm:p-5 rounded-xl flex-col justify-between min-w-0 overflow-hidden w-[140px] sm:w-[160px] shrink-0">
                                                <div className="aspect-[2/3] w-full h-full rounded-xl relative group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 ring-1 ring-white/10 group-hover:ring-primary overflow-hidden">
                                                    {comic.cover_image_url ? (
                                                        <Image
                                                            src={comic.cover_image_url}
                                                            alt={comic.title}
                                                            fill
                                                            className="object-cover rounded-xl mt-auto group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2 bg-white/5">
                                                            <BookOpen className="w-8 h-8 opacity-30" />
                                                            <span className="text-[10px]">No Image</span>
                                                        </div>
                                                    )}
                                                    {/* Overlay Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                                </div>
                                            </div>

                                            {/* --- Info Section --- */}
                                            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 pl-0">

                                                {/* Top: Title & Date */}
                                                <div className="space-y-3">
                                                    <div>
                                                        <h3 className="font-bold text-white text-base sm:text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                            {comic.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>
                                                                {new Date(item.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <p className="text-gray-400 text-xs mb-1.5">อ่านค้างไว้ที่</p>
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="self-start bg-primary/20 text-primary px-3 py-1 rounded-md text-sm font-bold border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors">
                                                                EP. {episode.episode_number}
                                                            </span>
                                                            <span className="text-xs text-gray-500 truncate max-w-full">
                                                                {episode.title || `ตอนที่ ${episode.episode_number}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom: Genres */}
                                                <div className="flex items-end justify-between mt-4 pt-3 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5 overflow-hidden w-full">
                                                        {comic.genre?.slice(0, 2).map((g: string, idx: number) => (
                                                            <span key={idx} className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded truncate max-w-[80px]">
                                                                {g}
                                                            </span>
                                                        ))}
                                                        {comic.genre && comic.genre.length > 2 && (
                                                            <span className="shrink-0 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                                                +{comic.genre.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>

                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    // ... Empty State (เหมือนเดิม)
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/5/50">
                        {/* ... */}
                        <h3 className="text-xl font-bold text-gray-300">ยังไม่มีประวัติการอ่าน</h3>
                        <p className="text-gray-500 mt-2 mb-8">เริ่มอ่านการ์ตูนเรื่องโปรดของคุณ แล้วระบบจะบันทึกให้อัตโนมัติ</p>
                        <Link href="/">
                             {/* ... */}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}