'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Loader2, Heart, Search, Star, Clock } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function LibraryPage() {
  const [library, setLibrary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await fetch('/api/library')
        if (res.ok) {
          const result = await res.json()
          
          // ✅ แก้ไข: ใช้ข้อมูลจาก API ตรงๆ ได้เลย ไม่ต้อง map คำนวณซ้ำ
          // เพราะ API คิดเลขมาให้เสร็จแล้ว (ทั้ง rating และ latestEp)
          setLibrary(result.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch library")
      } finally {
        setLoading(false)
      }
    }

    fetchLibrary()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0d1016] text-white"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>

  return (
    <div className="min-h-screen bg-[#0d1016] pb-20 pt-8 text-white">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">ชั้นหนังสือของฉัน</h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
              <Heart className="w-3 h-3 fill-current text-red-500" />
              การ์ตูนที่คุณติดตาม ({library.length} เรื่อง)
            </p>
          </div>
        </div>

        {/* Content Grid */}
        {library.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {library.map((item: any) => {
              const comic = item.comics

              return (
                <Link key={comic.id} href={`/comic/${comic.id}`} className="group block relative">
                  <Card className="border-0 bg-transparent shadow-none p-0 overflow-visible h-full flex flex-col">
                    <CardContent className="p-0 flex-1">
                      {/* ส่วนรูปปก */}
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1f29] mb-3 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 ring-1 ring-white/10 group-hover:ring-primary">
                        {comic.cover_image_url && (
                          <Image src={comic.cover_image_url} alt={comic.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 20vw" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                        <div className="absolute top-2 right-2">
                          <Badge className={`${comic.status === 'Completed' ? 'bg-blue-600' : 'bg-primary'} text-white border-0 text-[10px] px-2 h-5 font-bold shadow-md`}>
                            {comic.status === 'Completed' ? 'จบแล้ว' : 'ยังไม่จบ'}
                          </Badge>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                          <span className="text-white text-xs font-bold bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">EP. {comic.latestEp}</span>
                          <span className="text-[10px] text-gray-300 flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3" />{new Date(comic.updated_at || comic.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      {/* ส่วนเนื้อหาด้านล่าง */}
                      <div className="space-y-1 px-1">
                        <h3 className="font-bold text-sm md:text-base text-white leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                          {comic.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">

                          {/* 👇 แก้ไข: แสดง 2 หมวดแรก + จำนวนที่เหลือ */}
                          <div className="flex items-center gap-1.5 overflow-hidden max-w-[70%]">
                            <span className="truncate text-gray-400">
                              {comic.genre?.slice(0, 2).join(', ') || 'ทั่วไป'}
                            </span>

                            {comic.genre && comic.genre.length > 2 && (
                              <span className="shrink-0 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                +{comic.genre.length - 2}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-3 h-3 fill-yellow-500" />
                            {comic.rating}
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
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/5/50">
            <div className="w-20 h-20 bg-black/30 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-300">ชั้นหนังสือยังว่างเปล่า</h3>
            <p className="text-gray-500 mt-2 mb-8">กดติดตามการ์ตูนที่คุณชอบ เพื่อรับการแจ้งเตือนตอนใหม่</p>
            <Link href="/">
              <Button size="lg" className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 px-8">
                ไปหน้าแรกเพื่อเลือกดู
              </Button>
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}