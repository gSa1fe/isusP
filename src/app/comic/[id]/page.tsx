'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Play, List, Clock, Eye, Share2, Heart, BookOpen, Bookmark, Check, CheckCircle2, Star, Sparkles } from 'lucide-react'
import RatingSystem from '@/components/RatingSystem'
import CommentSection from '@/components/CommentSection'

export default function ComicDetail() {
    const { id } = useParams()
    const [loading, setLoading] = useState(true)

    // รวมข้อมูลไว้ใน Object เดียว (เหมือนหน้า Home)
    const [data, setData] = useState<any>(null)

    // User Specific State
    const [inLibrary, setInLibrary] = useState(false)
    const [readHistory, setReadHistory] = useState<Set<string>>(new Set())
    const [libraryLoading, setLibraryLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return

            try {
                // 1. ดึงข้อมูลหลักจาก API (รวม Comic, Episodes, Recs)
                const res = await fetch(`/api/comics/${id}`, { next: { revalidate: 60 } })
                if (!res.ok) throw new Error('Failed to fetch comic data')

                const result = await res.json()
                setData(result)



                // 2. เช็คข้อมูล User (แยกไปทำในฟังก์ชันย่อย)
                await checkUserState()

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    // ฟังก์ชันเช็ค User State
    const checkUserState = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            // ยิง 2 API พร้อมกัน (Library + History)
            const [libRes, histRes] = await Promise.all([
                fetch(`/api/library?comic_id=${id}`, { cache: 'no-store' }),
                supabase.from('reading_history').select('episode_id').eq('user_id', user.id)
            ])

            // เช็ค Library
            if (libRes.ok) {
                const libData = await libRes.json()
                // 👇 Set State ให้ถูกต้องตามที่ API ส่งมา
                if (libData.inLibrary) setInLibrary(true)
                else setInLibrary(false)
            }

            // เช็ค History
            if (histRes.data) {
                const readSet = new Set(histRes.data.map((item: any) => item.episode_id))
                setReadHistory(readSet)
            }
        } catch (err) {
            console.error("Error checking user state:", err)
        }
    }

    const toggleLibrary = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { alert('กรุณาเข้าสู่ระบบ'); return }

        setLibraryLoading(true)
        try {
            if (inLibrary) {
                // ถ้ามีอยู่แล้ว -> ลบออก
                const res = await fetch(`/api/library?comic_id=${id}`, { method: 'DELETE' })
                if (res.ok) setInLibrary(false)
            } else {
                // ถ้ายังไม่มี -> เพิ่มเข้า
                const res = await fetch('/api/library', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comic_id: id })
                })
                if (res.ok) setInLibrary(true)
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setLibraryLoading(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-[#0d1016] p-8 text-center text-white flex items-center justify-center"><div className="animate-pulse">กำลังโหลดข้อมูล...</div></div>
    if (!data?.comic) return <div className="min-h-screen bg-[#0d1016] p-8 text-center text-white">ไม่พบข้อมูลการ์ตูนเรื่องนี้</div>

    const { comic, episodes, stats, recommendations } = data
    const bannerSrc = comic.banner_image_url || comic.cover_image_url

    return (
        <div className="min-h-screen bg-[#0d1016] text-white pb-20">

            {/* HERO SECTION */}
            <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
                <div className="absolute inset-0">
                    {bannerSrc && <Image src={bannerSrc} alt={comic.title} fill className="object-cover opacity-40 blur-sm scale-105" priority />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1016] via-[#0d1016]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0d1016] via-[#0d1016]/40 to-transparent" />
                </div>

                <div className="absolute inset-0 flex items-end">
                    <div className="container mx-auto px-4 pb-12 flex flex-col md:flex-row gap-8 items-center md:items-end">
                        <div className="relative w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 hidden md:block">
                            {comic.cover_image_url && <Image src={comic.cover_image_url} alt={comic.title} fill className="object-cover" />}
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-4 max-w-3xl">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge variant="outline" className="border-primary text-primary bg-primary/10">{comic.genre?.join(', ')}</Badge>
                                <Badge className={`${comic.status === 'Completed' ? 'bg-blue-600' : 'bg-green-600'} text-white border-0`}>
                                    {comic.status === 'Completed' ? 'จบแล้ว' : 'ยังไม่จบ'}
                                </Badge>
                                <div className="flex items-center gap-1 text-gray-300 text-sm ml-2 bg-white/5 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                                    <Eye className="w-4 h-4 text-primary" />
                                    <span className="font-bold text-white">{stats.totalViews.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-300 text-sm ml-1 bg-white/5 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                    <span className="font-bold text-white">{stats.totalLikes.toLocaleString()}</span>
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-lg">{comic.title}</h1>
                            <div className="flex justify-center md:justify-start">
                                <RatingSystem comicId={id as string} />
                            </div>
                            <p className="text-gray-300 text-sm md:text-base line-clamp-3">{comic.description}</p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                {episodes.length > 0 ? (
                                    <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-[#0d1016] font-bold px-8" asChild>
                                        <Link href={`/read/${episodes[episodes.length - 1].id}`}><BookOpen className="w-5 h-5 mr-2" /> อ่านตอนแรก</Link>
                                    </Button>
                                ) : (
                                    <Button size="lg" disabled className="rounded-full bg-gray-700">ยังไม่มีตอน</Button>
                                )}

                                {/* 👇 ปุ่มเพิ่มเข้าชั้น (เปลี่ยนสีตามสถานะ) */}
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={`rounded-full border-white/20 hover:bg-white/10 ${inLibrary ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30' : 'bg-white/5 text-white'}`}
                                    onClick={toggleLibrary}
                                    disabled={libraryLoading}
                                >
                                    {libraryLoading ? (
                                        <span className="animate-pulse">กำลังบันทึก...</span>
                                    ) : (
                                        inLibrary ? <><Check className="w-5 h-5 mr-2" /> ติดตามแล้ว</> : <><Bookmark className="w-5 h-5 mr-2" /> เพิ่มเข้าชั้น</>
                                    )}
                                </Button>

                                <Button size="icon" variant="outline" className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white">
                                    <Share2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="container mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Episode List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <List className="w-5 h-5 text-primary" /> รายชื่อตอน ({episodes.length})
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {episodes.map((ep: any) => {
                                const isRead = readHistory.has(ep.id);
                                return (
                                    <Link key={ep.id} href={`/read/${ep.id}`} className="group block">
                                        <Card className={`border-white/5 hover:border-primary/50 transition-all ${isRead ? 'bg-[#131720]/50' : 'bg-[#131720] hover:bg-[#1a1f29]'}`}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border transition-colors ${isRead ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-gray-400 border-white/5 group-hover:border-primary/30 group-hover:text-primary'}`}>
                                                        {isRead ? <CheckCircle2 className="w-5 h-5" /> : `#${ep.episode_number}`}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold transition-colors ${isRead ? 'text-primary/70' : 'text-gray-200 group-hover:text-primary'}`}>
                                                            {ep.title || `ตอนที่ ${ep.episode_number}`}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ep.created_at).toLocaleDateString('th-TH')}</span>
                                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ep.view_count || 0}</span>
                                                            <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3 fill-red-400" /> {ep.likes_count || 0}</span>
                                                            {isRead && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">อ่านแล้ว</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className={`${isRead ? 'text-primary' : 'text-gray-400'} group-hover:text-white group-hover:bg-primary/20 rounded-full`}>
                                                    <Play className="w-4 h-4 mr-2 fill-current" /> อ่าน
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {/* Comment Section */}
                    <div id="comments" className="scroll-mt-20">
                        <CommentSection comicId={id as string} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <Card className="bg-[#131720] border-white/5">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">ข้อมูลเพิ่มเติม</h3>
                            <div className="text-sm text-gray-300 space-y-2">
                                <div className="flex justify-between"><span className="text-gray-500">สถานะ</span><span className={comic.status === 'Completed' ? 'text-blue-400' : 'text-green-400'}>{comic.status === 'Completed' ? 'จบแล้ว' : 'ยังไม่จบ'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">เข้าชมรวม</span><span>{stats.totalViews.toLocaleString()} ครั้ง</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">ถูกใจรวม</span><span className="text-red-400 font-bold">{stats.totalLikes.toLocaleString()} ครั้ง</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* RECOMMENDED SECTION */}
            {recommendations && recommendations.length > 0 && (
                <div className="container mx-auto px-4 mt-20 pt-10 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-6 h-6 text-yellow-500" />
                        <h2 className="text-2xl font-bold text-white">เรื่องที่คุณอาจจะชอบ</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {recommendations.map((rec: any) => (
                            <Link key={rec.id} href={`/comic/${rec.id}`} className="group block">
                                <Card className="border-0 bg-transparent shadow-none p-0 overflow-visible h-full flex flex-col">
                                    <CardContent className="p-0 flex-1">
                                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1f29] mb-3 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 ring-1 ring-white/10 group-hover:ring-primary">
                                            {rec.cover_image_url && (
                                                <Image src={rec.cover_image_url} alt={rec.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                            )}
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                                            {rec.status === 'Completed' && (
                                                <div className="absolute top-2 right-2">
                                                    <Badge className="bg-blue-600 text-white border-0 text-[10px] px-1.5 h-5 shadow-sm">จบ</Badge>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1 px-1">
                                            <h3 className="font-bold text-sm md:text-base text-white leading-tight line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</h3>
                                            <div className="flex items-center justify-between text-xs text-gray-500">

                                                {/* 👇 ส่วนแสดง Genre แบบเดียวกับหน้า Home */}
                                                <div className="flex items-center gap-1.5 overflow-hidden max-w-[70%]">
                                                    <span className="truncate text-gray-400">
                                                        {/* ใส่ ? เพื่อ Optional Chaining ป้องกัน error ถ้า genre เป็น null */}
                                                        {rec.genre && rec.genre.length > 0 ? rec.genre.slice(0, 2).join(', ') : 'ทั่วไป'}
                                                    </span>
                                                    {rec.genre && rec.genre.length > 2 && (
                                                        <span className="shrink-0 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                                            +{rec.genre.length - 2}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <Star className="w-3 h-3 fill-yellow-500" /> {rec.rating || '0.0'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}