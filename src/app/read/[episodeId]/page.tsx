'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, Home, ArrowLeft, LayoutGrid, X, BookUser, BookImage } from 'lucide-react'
import CommentSection from '@/components/CommentSection'
import EpisodeLikeButton from '@/components/EpisodeLikeButton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ReaderPage() {
  const { episodeId } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Data State
  const [allEpisodes, setAllEpisodes] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [episode, setEpisode] = useState<any>(null)
  const [nextEp, setNextEp] = useState<string | null>(null)
  const [prevEp, setPrevEp] = useState<string | null>(null)

  // UI State
  const [showControls, setShowControls] = useState(true)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  
  // Ref สำหรับเก็บค่า scroll ล่าสุด (ใช้ ref จะดีกว่า state ใน event listener เพื่อ performance)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const fetchData = async () => {
      if (!episodeId) return

      // 1. ดึงข้อมูลตอน
      const { data: epData, error } = await supabase
        .from('episodes')
        .select('*, comics(title)')
        .eq('id', episodeId)
        .single()

      if (error || !epData) {
        console.error(error)
        setLoading(false)
        return
      }
      setEpisode(epData)

      if (epData) {
        // 2. ดึงรูปภาพทั้งหมด
        const { data: imgData } = await supabase
          .from('episode_images')
          .select('*')
          .eq('episode_id', episodeId)
          .order('order_index', { ascending: true })

        setImages(imgData || [])

        // 3. หาตอนถัดไป/ก่อนหน้า
        checkNeighbors(epData.comic_id, epData.episode_number)

        // 4. ดึงรายชื่อตอนทั้งหมด (Dropdown)
        const { data: allEps } = await supabase
          .from('episodes')
          .select('id, episode_number, title')
          .eq('comic_id', epData.comic_id)
          .order('episode_number', { ascending: false })

        if (allEps) setAllEpisodes(allEps)
      }
      setLoading(false)
    }

    fetchData()

    // View Count
    fetch('/api/episodes/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_id: episodeId })
    }).catch(err => console.error(err))

  }, [episodeId])

  // --- Scroll Logic: ซ่อนเมนูเมื่อเลื่อนลง / แสดงเมื่อเลื่อนขึ้น ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // ถ้าเลื่อนลง และไม่ได้อยู่บนสุด (> 50px) -> ซ่อน
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowControls(false)
      } 
      // ถ้าเลื่อนขึ้น -> แสดง
      else if (currentScrollY < lastScrollY.current) {
        setShowControls(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const checkNeighbors = async (comicId: string, currentNo: number) => {
    const { data: next } = await supabase.from('episodes').select('id').eq('comic_id', comicId).eq('episode_number', currentNo + 1).single()
    if (next) setNextEp(next.id)

    const { data: prev } = await supabase.from('episodes').select('id').eq('comic_id', comicId).eq('episode_number', currentNo - 1).single()
    if (prev) setPrevEp(prev.id)
  }

  const toggleControls = () => setShowControls(!showControls)

  // ฟังก์ชันกระโดดไปที่รูป
  const scrollToImage = (imgId: string) => {
    setShowGalleryModal(false)
    const element = document.getElementById(`img-${imgId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0d1016] text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-sm text-gray-400 animate-pulse">กำลังโหลดเนื้อหา...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center relative">

      {/* --- TOP BAR --- */}
      <div
        className={`fixed top-0 left-0 w-full h-16 bg-black/90 backdrop-blur-md text-white flex items-center justify-between px-4 z-50 transition-transform duration-300 border-b border-white/10 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Link href={episode ? `/comic/${episode.comic_id}` : '/'} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 truncate mt-0.5 ml-1">{episode?.comics?.title}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {/* ปุ่ม Gallery Mode */}
          {images.length > 0 && (
            <Button
              size="icon" variant="ghost" className="text-gray-400 hover:text-white"
              onClick={() => setShowGalleryModal(true)}
            >
              <BookImage className="w-4 h-4" />
            </Button>
          )}

          <Link href="/">
            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div
        className="w-full max-w-3xl  min-h-screen  relative z-0 pt-0 pb-32"
        onClick={toggleControls} // แตะหน้าจอเพื่อเปิด/ปิดเมนูได้ด้วย
      >
        {/* Spacer ให้เนื้อหาไม่โดน Top Bar บังตอนเปิดเมนู */}
        <div className={`h-16 transition-all duration-300 ${showControls ? 'block' : 'hidden'}`} />

        {images.length > 0 ? (
          images.map((img) => (
            <div key={img.id} id={`img-${img.id}`} className="relative group">
              <img
                src={img.image_url}
                alt={`Page ${img.order_index}`}
                className="w-full block select-none"
                loading="lazy"
              />
            </div>
          ))
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-4">
            <p>ยังไม่มีเนื้อหาในตอนนี้</p>
            <Button variant="outline" onClick={() => window.location.reload()}>ลองโหลดใหม่</Button>
          </div>
        )}

        <div className="py-10 bg-[#131720] flex justify-center border-t border-white/5">
          <EpisodeLikeButton episodeId={episodeId as string} />
        </div>

        <div className="bg-[#131720] pb-8 rounded-xl" onClick={(e) => e.stopPropagation()}>
          <CommentSection episodeId={episodeId as string} />
        </div>
      </div>

      {/* --- BOTTOM BAR --- */}
      <div className={`fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-white/10 p-4 z-50 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          
          {/* Prev Button */}
          <Button
            variant="outline"
            className={`flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 ${!prevEp && 'opacity-30 cursor-not-allowed'}`}
            disabled={!prevEp}
            asChild={!!prevEp}
          >
            {prevEp ? (
              <Link href={`/read/${prevEp}`} className="flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4 " /> ก่อนหน้า
              </Link>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </span>
            )}
          </Button>

          {/* Dropdown เลือกตอน */}
          <div className="min-w-[120px]">
            <Select
              value={episode?.id}
              onValueChange={(val) => router.push(`/read/${val}`)}
            >
              <SelectTrigger className="h-8 rounded-full bg-white/10 border-0 text-white font-bold text-sm hover:bg-white/20 focus:ring-0 focus:ring-offset-0 transition-colors gap-2">
                <SelectValue placeholder={`EP. ${episode?.episode_number}`} />
              </SelectTrigger>

              <SelectContent className="bg-[#1a1f29] border-white/10 text-white max-h-[300px]">
                {allEpisodes.map((ep) => (
                  <SelectItem
                    key={ep.id}
                    value={ep.id}
                    className="focus:bg-primary/20 focus:text-white cursor-pointer"
                  >
                    <span className="font-bold text-primary mr-2">EP.{ep.episode_number}</span>
                    <span className="text-gray-400 text-xs">{ep.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Button */}
          <Button className={`flex-1 font-bold ${nextEp ? 'bg-primary text-black hover:bg-primary/90' : 'bg-white/10 text-white hover:bg-white/20'}`} asChild={!!nextEp}>
            {nextEp ? (
              <Link href={`/read/${nextEp}`} className="flex items-center justify-center gap-2">ถัดไป <ChevronRight className="w-4 h-4" /></Link>
            ) : (
              <Link href={episode ? `/comic/${episode.comic_id}` : '/'} className="flex items-center justify-center gap-2">จบตอน <Home className="w-4 h-4" /></Link>
            )}
          </Button>
        </div>
      </div>

      {/* --- GALLERY MODAL (Overlay) --- */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1f29] border border-white/10 w-full max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-2 text-white">
                <BookImage className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">ภาพรวม ({images.length} หน้า)</h3>
              </div>
              <button onClick={() => setShowGalleryModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content (All Images Grid) */}
            <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0d1016]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="space-y-2 cursor-pointer group"
                    onClick={() => scrollToImage(img.id)}
                  >
                    <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg relative aspect-[2/3] group-hover:border-primary transition-all">
                      <img src={img.image_url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-center text-xs text-gray-500 group-hover:text-primary">หน้าที่ {idx + 1}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}