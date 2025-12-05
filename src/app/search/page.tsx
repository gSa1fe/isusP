'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Star, Clock, Filter, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'

const GENRES = [
    'แอ็คชั่น', 'โรแมนติก', 'แฟนตาซี', 'ดราม่า', 'ตลก',
    'ระทึกขวัญ', 'ชีวิตประจำวัน', 'สยองขวัญ', 'ผจญภัย',
    'ไซไฟ', 'ลึกลับ', 'กีฬา', 'ต่างโลก', 'ฮาเร็ม', 'โรงเรียน',
    'สืบสวน', 'ย้อนยุค', 'ระบบ', 'ผู้หวนคืน', 'เกิดใหม่'
]

function SearchContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const initialQuery = searchParams.get('q') || ''
    const initialGenre = searchParams.get('genre') || 'ทั้งหมด'
    const initialPage = parseInt(searchParams.get('page') || '1')

    const [query, setQuery] = useState(initialQuery)
    const [selectedGenre, setSelectedGenre] = useState(initialGenre)
    const [selectedStatus, setSelectedStatus] = useState('all') 
    const [sortBy, setSortBy] = useState('latest_update') 
    const [page, setPage] = useState(initialPage)

    const [results, setResults] = useState<any[]>([])
    const [meta, setMeta] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    useEffect(() => {
        setQuery(initialQuery)
        setSelectedGenre(initialGenre)
        setPage(initialPage)
    }, [initialQuery, initialGenre, initialPage])

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                
                if (query) params.append('q', query)
                if (selectedGenre !== 'ทั้งหมด') params.append('genre', selectedGenre)
                if (selectedStatus !== 'all') params.append('status', selectedStatus)
                
                params.append('sort', sortBy)
                params.append('page', page.toString())
                params.append('limit', '18')

                const res = await fetch(`/api/comics?${params.toString()}`)
                
                if (!res.ok) throw new Error('Network response was not ok')
                
                const responseJson = await res.json()
                
                setResults(responseJson.data || [])
                setMeta(responseJson.meta || {})

            } catch (error) {
                console.error("Error fetching data:", error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }

        const timeoutId = setTimeout(() => fetchResults(), 300)
        return () => clearTimeout(timeoutId)

    }, [query, selectedGenre, selectedStatus, sortBy, page])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && meta && newPage <= meta.totalPages) {
            setPage(newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const clearFilters = () => {
        setQuery('')
        setSelectedGenre('ทั้งหมด')
        setSelectedStatus('all')
        setSortBy('latest_update')
        setPage(1)
        router.push('/search')
    }

    return (
        <div className="container mx-auto px-4">
            {/* Header & Search Bar */}
            <div className="flex flex-col gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black mb-2">ค้นหาการ์ตูน</h1>
                    <p className="text-gray-400 text-sm">ค้นหาเรื่องที่คุณชอบจากคลังของเรา</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setPage(1) 
                            }}
                            placeholder="พิมพ์ชื่อเรื่อง..."
                            className="pl-10 bg-[#1a1f29] border-white/10 text-white h-12 rounded-xl focus-visible:ring-primary"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        className="h-12 px-4 border-white/10 bg-[#1a1f29] text-white lg:hidden"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* --- Sidebar Filters --- */}
                <div className={`lg:w-64 shrink-0 space-y-6 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-300 text-sm flex items-center gap-2"><Filter className="w-4 h-4" /> สถานะ</h3>
                        <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setPage(1); }}>
                            <SelectTrigger className="w-full bg-[#1a1f29] border-white/10 text-white">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1f29] border-white/10 text-white">
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="Ongoing">ยังไม่จบ (Ongoing)</SelectItem>
                                <SelectItem value="Completed">จบแล้ว (Completed)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-300 text-sm flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> เรียงตาม</h3>
                        <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
                            <SelectTrigger className="w-full bg-[#1a1f29] border-white/10 text-white">
                                <SelectValue placeholder="เรียงตาม" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1f29] border-white/10 text-white">
                                <SelectItem value="latest_update">อัปเดตล่าสุด</SelectItem>
                                <SelectItem value="popular">ยอดนิยม</SelectItem>
                                <SelectItem value="newest">มาใหม่ล่าสุด</SelectItem>
                                <SelectItem value="oldest">เก่าสุด</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-300 text-sm">หมวดหมู่</h3>
                        <div className="flex flex-wrap gap-2">
                            {GENRES.map((genre) => (
                                <Badge
                                    key={genre}
                                    variant="outline"
                                    className={`cursor-pointer px-3 py-1.5 transition-all ${selectedGenre === genre
                                        ? 'bg-primary text-black border-primary font-bold'
                                        : 'bg-[#1a1f29] text-gray-400 border-white/10 hover:border-primary/50 hover:text-white'
                                        }`}
                                    onClick={() => { setSelectedGenre(genre); setPage(1); }}
                                >
                                    {genre}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <Button variant="ghost" className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={clearFilters}>
                        <X className="w-4 h-4 mr-2" /> ล้างตัวกรองทั้งหมด
                    </Button>
                </div>

                {/* --- Results Grid --- */}
                <div className="flex-1">
                    <div className="mb-4 text-sm text-gray-400 flex justify-between items-center">
                        <div>
                           พบ <span className="text-white font-bold">{meta?.total || 0}</span> เรื่อง
                           {meta && <span className="text-xs ml-2 opacity-50">(หน้า {meta.page} จาก {meta.totalPages})</span>}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-[2/3] w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
                                {results.map((comic) => (
                                    <Link key={comic.id} href={`/comic/${comic.id}`} className="group block relative">
                                        <Card className="border-0 bg-transparent shadow-none p-0 overflow-visible h-full flex flex-col">
                                            <CardContent className="p-0 flex-1">
                                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1f29] mb-3 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 ring-1 ring-white/10 group-hover:ring-primary">
                                                    {comic.cover_image_url && (
                                                        <Image src={comic.cover_image_url} alt={comic.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    )}
                                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                                                    <div className="absolute top-2 right-2">
                                                        <Badge className={`${comic.status === 'Completed' ? 'bg-blue-600' : 'bg-primary'} text-white border-0 text-[10px] px-2 h-5 font-bold shadow-md`}>
                                                            {comic.status === 'Completed' ? 'จบแล้ว' : 'ยังไม่จบ'}
                                                        </Badge>
                                                    </div>

                                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                                        {/* 👇 ส่วนแสดง EP ล่าสุด */}
                                                        <span className="text-white text-xs font-bold bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                                                            EP. {comic.latestEp}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300 flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3" />{new Date(comic.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 px-1">
                                                    <h3 className="font-bold text-sm md:text-base text-white leading-tight line-clamp-1 group-hover:text-primary transition-colors">{comic.title}</h3>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <div className="flex items-center gap-1.5 overflow-hidden max-w-[70%]">
                                                            <span className="truncate text-gray-400">{comic.genre?.slice(0, 2).join(', ') || 'ทั่วไป'}</span>
                                                            {comic.genre && comic.genre.length > 2 && (
                                                                <span className="shrink-0 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">+{comic.genre.length - 2}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-yellow-500">
                                                            <Star className="w-3 h-3 fill-yellow-500" /> {comic.rating}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {meta && meta.totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page <= 1}
                                        className="border-white/10 hover:bg-white/10 text-white"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> ก่อนหน้า
                                    </Button>
                                    
                                    <span className="text-sm text-gray-400">
                                        หน้า <span className="text-white font-bold">{page}</span> จาก {meta.totalPages}
                                    </span>

                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page >= meta.totalPages}
                                        className="border-white/10 hover:bg-white/10 text-white"
                                    >
                                        ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-xl bg-white/5 text-gray-500">
                            <Search className="w-16 h-16 mb-4 opacity-50" />
                            <h3 className="text-xl font-bold mb-2">ไม่พบผลลัพธ์</h3>
                            <p>ลองปรับเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
                            <Button variant="link" onClick={clearFilters} className="mt-4 text-primary">ล้างการค้นหา</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-[#0d1016] text-white pt-8 pb-20">
            <Suspense fallback={<div className="text-center pt-20 text-gray-500">กำลังโหลด...</div>}>
                <SearchContent />
            </Suspense>
        </div>
    )
}