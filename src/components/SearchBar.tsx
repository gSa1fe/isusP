'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Search, X, Loader2, BookOpen } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounce Logic: รอให้หยุดพิมพ์ 300ms ค่อยค้นหา
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 0) {
        setLoading(true)
        setShowDropdown(true)
        
        // ค้นหาจาก Supabase (title หรือ genre)
        const { data } = await supabase
          .from('comics')
          .select('id, title, cover_image_url, genre, status, rating:comic_ratings(rating)') // ดึง rating มาด้วยถ้ามี relation
          .eq('is_published', true)
          .ilike('title', `%${query}%`) // ค้นหาบางส่วนของชื่อ
          .limit(5) // เอาแค่ 5 อันพอ

        setResults(data || [])
        setLoading(false)
      } else {
        setResults([])
        setShowDropdown(false)
      }
    }, 300) // รอ 300ms

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [searchRef])

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query) {
        setShowDropdown(false)
        router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      
      {/* Input Field */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
        <Input 
            type="search" 
            placeholder="ค้นหาชื่อเรื่อง" 
            className="pl-10 pr-10 bg-[#1a1f29] border-white/10 text-white rounded-full h-10 focus-visible:ring-primary/50 transition-all focus:bg-[#252b36]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if(query) setShowDropdown(true) }}
            onKeyDown={handleEnter}
        />
        {/* Loading / Clear Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : query ? (
                <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}>
                    <X className="w-4 h-4 hover:text-white" />
                </button>
            ) : null}
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f29] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header: Series */}
            {results.length > 0 && (
                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                    การ์ตูน
                </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {results.length > 0 ? (
                    results.map((comic) => (
                        <Link 
                            key={comic.id} 
                            href={`/comic/${comic.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                        >
                            {/* Thumbnail */}
                            <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-black/50 border border-white/10 group-hover:border-primary/50 transition-colors">
                                {comic.cover_image_url ? (
                                    <Image src={comic.cover_image_url} alt="" fill className="object-cover" />
                                ) : (
                                    <BookOpen className="w-5 h-5 text-gray-600 m-auto mt-5" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate ">
                                    {/* ไฮไลท์คำค้นหา (Optional) */}
                                    {comic.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400 truncate max-w-[150px]">
                                        {comic.genre?.slice(0, 2).join(', ')}
                                    </span>
                                    {comic.status === 'Completed' && (
                                        <Badge variant="secondary" className="text-[9px] h-4 bg-blue-500/20 text-blue-400 border-0 px-1">จบแล้ว</Badge>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    !loading && (
                        <div className="p-8 text-center text-gray-500">
                            <p>ไม่พบการ์ตูนที่ค้นหา</p>
                        </div>
                    )
                )}
            </div>

            {/* Footer */}
            {results.length > 0 && (
                <Link 
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={() => setShowDropdown(false)}
                    className="block p-3 text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-t border-white/10"
                >
                    ดูผลลัพธ์ทั้งหมด ({results.length}+)
                </Link>
            )}
        </div>
      )}
    </div>
  )
}