'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, ChevronRight, ChevronLeft, Clock, Star, BookOpen, Trophy, Flame } from 'lucide-react'

// ไม่ต้องมี processComicData แล้ว เพราะ API ทำให้แล้ว

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null) // เก็บข้อมูลทั้งหมดที่ได้จาก API
  
  // Popular Tab State
  const [popularTab, setPopularTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')

  // Slider Logic
  const [currentSlide, setCurrentSlide] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Fetch Data จาก API กลาง
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/home', { next: { revalidate: 60 } }) // Cache 60s
        if (!res.ok) throw new Error('Failed to fetch')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching home data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Slider Autoplay
  useEffect(() => {
    if (data?.slider && data.slider.length > 1) {
        timerRef.current = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % data.slider.length)
        }, 8000)
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current) }
  }, [data?.slider])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % (data?.slider?.length || 1))
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + (data?.slider?.length || 1)) % (data?.slider?.length || 1))

  // Reusable Grid
  const ComicGrid = ({ comics }: { comics: any[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-xl bg-white/5" />
            <Skeleton className="h-4 w-3/4 bg-white/5" />
          </div>
        )) : comics?.map((comic, idx) => (
          <Link key={comic.id} href={`/comic/${comic.id}`} className="group block relative">
            <Card className="border-0 bg-transparent shadow-none p-0 overflow-visible h-full flex flex-col">
              <CardContent className="p-0 flex-1">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1f29] mb-3 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 ring-1 ring-white/10 group-hover:ring-primary">
                  {comic.cover_image_url && (
                    <Image src={comic.cover_image_url} alt={comic.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  )}
                  {/* Rank Badge (Logic เช็คว่าเป็นส่วน Popular ไหม) */}
                  {(popularTab && (comics === data?.popular?.weekly || comics === data?.popular?.monthly || comics === data?.popular?.yearly)) && (
                      <div className={`absolute top-0 left-0 w-8 h-8 flex items-center justify-center font-black text-white text-sm z-10 rounded-br-xl shadow-lg ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-yellow-500' : 'bg-black/60'}`}>
                          {idx + 1}
                      </div>
                  )}
                  
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                     <span className="text-white text-xs font-bold bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">EP. {comic.latestEp}</span>
                     <span className="text-[10px] text-gray-300 flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3" />{new Date(comic.updated_at || comic.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
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
  )

  return (
    <main className="min-h-screen pb-20 bg-[#0d1016]">
      
      {/* 1. HERO SLIDER */}
      <section className="relative w-full h-[550px] md:h-[650px] overflow-hidden group">
        {loading ? (
           <div className="w-full h-full bg-zinc-900 animate-pulse" />
        ) : data?.slider?.length > 0 ? (
          <>
            {data.slider.map((slide: any, index: number) => (
                <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {slide.banner_image_url ? (
                        <Image src={slide.banner_image_url} alt={slide.title} fill className="object-cover" priority={index === 0} />
                    ) : (
                        <Image src={slide.cover_image_url || ''} alt={slide.title} fill className="object-cover blur-sm opacity-50 scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1016] via-[#0d1016]/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0d1016] via-[#0d1016]/80 to-transparent" />
                </div>
            ))}
            <div className="absolute inset-0 z-20 container mx-auto px-4 flex items-center mt-20 md:mt-0">
               <div className="flex flex-col md:flex-row items-end gap-8 w-full">
                  <div className="hidden md:block w-[200px] aspect-[2/3] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 shrink-0 transform -rotate-3 transition-all duration-700 key={currentSlide}">
                      <Image src={data.slider[currentSlide]?.cover_image_url || ''} alt="cover" fill className="object-cover" />
                  </div>
                  <div className="flex-1 space-y-4 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 key={currentSlide}">
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-primary text-black font-bold">มาใหม่</Badge>
                        <div className="flex items-center gap-1  px-2 py-0.5 rounded-xl border border-white/10 text-yellow-500 text-xs font-bold"><Star className="w-3 h-3 fill-yellow-500" /> {data.slider[currentSlide]?.rating}</div>
                        <Badge variant="outline" className="text-white border-white/30 backdrop-blur">{data.slider[currentSlide]?.genre?.join(' , ')}</Badge>
                      </div>
                      <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl leading-tight">{data.slider[currentSlide]?.title}</h1>
                      <p className="text-gray-300 text-lg line-clamp-2 drop-shadow-md max-w-xl">{data.slider[currentSlide]?.description}</p>
                      <div className="flex gap-4 pt-4">
                          <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-black font-bold px-8" asChild>
                              <Link href={data.slider[currentSlide]?.firstEpId ? `/read/${data.slider[currentSlide].firstEpId}` : `/comic/${data.slider[currentSlide]?.id}`}><Play fill="currentColor" className="w-5 h-5 mr-2" /> อ่านเลย</Link>
                          </Button>
                          <Button size="lg" variant="outline" className="rounded-full text-white border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur" asChild>
                              <Link href={`/comic/${data.slider[currentSlide]?.id}`}><BookOpen className="w-5 h-5 mr-2" /> รายละเอียด</Link>
                          </Button>
                      </div>
                  </div>
               </div>
            </div>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="w-8 h-8" /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-8 h-8" /></button>
          </>
        ) : null}
      </section>

      {/* 2. POPULAR SECTION */}
      <section className="container mx-auto px-4 mt-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
           <div className="border-l-4 border-yellow-500 pl-4">
             <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">
                {popularTab === 'weekly' ? <Flame className="w-6 h-6 text-orange-500" /> : <Trophy className="w-6 h-6 text-yellow-500" />} 
                จัดอันดับยอดนิยม
             </h2>
             <p className="text-gray-400 text-sm mt-1">
                {popularTab === 'weekly' ? 'การ์ตูนมาแรงประจำสัปดาห์' : popularTab === 'monthly' ? 'การ์ตูนยอดฮิตประจำเดือน' : 'ที่สุดแห่งปี'}
             </p>
           </div>
           
           <div className="flex bg-[#1a1f29] p-1 rounded-lg border border-white/10 self-start md:self-auto overflow-x-auto max-w-full">
              <button onClick={() => setPopularTab('weekly')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${popularTab === 'weekly' ? 'bg-primary text-black shadow' : 'text-gray-400 hover:text-white'}`}><Flame className="w-4 h-4" /> มาแรง</button>
              <button onClick={() => setPopularTab('monthly')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${popularTab === 'monthly' ? 'bg-primary text-black shadow' : 'text-gray-400 hover:text-white'}`}>ประจำเดือน</button>
              <button onClick={() => setPopularTab('yearly')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${popularTab === 'yearly' ? 'bg-primary text-black shadow' : 'text-gray-400 hover:text-white'}`}>ประจำปี</button>
           </div>
        </div>
        
        {/* เรียกใช้ data.popular[popularTab] แทน State เดิม */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 key={popularTab}">
            {data?.popular?.[popularTab] && data.popular[popularTab].length > 0 ? (
                <ComicGrid comics={data.popular[popularTab]} />
            ) : (
                <div className="text-gray-500 text-center py-10">ไม่มีข้อมูลยอดนิยมในช่วงเวลานี้</div>
            )}
        </div>
      </section>

      {/* 3. LATEST UPDATES */}
      <section className="container mx-auto px-4 mt-16">
        <div className="flex items-center justify-between mb-8 border-l-4 border-primary pl-4">
           <div>
             <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">อัปเดตล่าสุด</h2>
           </div>
           <Button variant="ghost" asChild className="text-gray-400 hover:text-white">
             <Link href="/search?sort=newest" className="flex items-center gap-1">ดูทั้งหมด <ChevronRight className="w-4 h-4" /></Link>
           </Button>
        </div>
        <ComicGrid comics={data?.latest} />
      </section>

      {/* 4. GENRES SECTIONS */}
      {data?.genres?.retro?.length > 0 && (
        <section className="container mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8 border-l-4 border-orange-500 pl-4">
            <div><h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">หมวดย้อนยุค</h2></div>
            <Button variant="ghost" asChild className="text-gray-400 hover:text-white"><Link href="/search?genre=ย้อนยุค">ดูทั้งหมด <ChevronRight className="w-4 h-4" /></Link></Button>
            </div>
            <ComicGrid comics={data.genres.retro} />
        </section>
      )}

      {data?.genres?.romantic?.length > 0 && (
        <section className="container mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8 border-l-4 border-pink-500 pl-4">
            <div><h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">รักโรแมนติก</h2></div>
            <Button variant="ghost" asChild className="text-gray-400 hover:text-white"><Link href="/search?genre=โรแมนติก">ดูทั้งหมด <ChevronRight className="w-4 h-4" /></Link></Button>
            </div>
            <ComicGrid comics={data.genres.romantic} />
        </section>
      )}

      {data?.genres?.action?.length > 0 && (
        <section className="container mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8 border-l-4 border-red-500 pl-4">
            <div><h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">บู๊ล้างผลาญ</h2></div>
            <Button variant="ghost" asChild className="text-gray-400 hover:text-white"><Link href="/search?genre=แอ็คชั่น">ดูทั้งหมด <ChevronRight className="w-4 h-4" /></Link></Button>
            </div>
            <ComicGrid comics={data.genres.action} />
        </section>
      )}

    </main>
  )
}