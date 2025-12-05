'use client'

import { useState, useEffect } from 'react'
import { Star, StarHalf } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RatingSystemProps {
  comicId: string
}

export default function RatingSystem({ comicId }: RatingSystemProps) {
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [myRating, setMyRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0) // สำหรับ Effect ตอนเอาเมาส์ชี้
  const [loading, setLoading] = useState(true)

  // 1. โหลดข้อมูลคะแนน
  const fetchRating = async () => {
    try {
        const res = await fetch(`/api/rating?comic_id=${comicId}`)
        if (res.ok) {
            const data = await res.json()
            setAverage(data.average)
            setCount(data.count)
            setMyRating(data.myRating)
        }
    } catch (err) {
        console.error(err)
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchRating()
  }, [comicId])

  // 2. ฟังก์ชันกดให้คะแนน
  const handleRate = async (score: number) => {
    // เช็ค Login แบบง่ายๆ ที่ Client
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        alert('กรุณาเข้าสู่ระบบเพื่อให้คะแนน')
        return
    }

    // Optimistic Update (อัปเดตหน้าจอทันทีให้ลื่นๆ)
    const oldRating = myRating
    setMyRating(score)

    try {
        const res = await fetch('/api/rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comic_id: comicId, rating: score })
        })

        if (!res.ok) throw new Error('Failed')
        
        // โหลดคะแนนเฉลี่ยใหม่เพื่อให้เป็นปัจจุบัน
        fetchRating()

    } catch (error) {
        alert('เกิดข้อผิดพลาด')
        setMyRating(oldRating) // ย้อนค่ากลับถ้าพัง
    }
  }

  return (
    <div className="flex flex-col gap-1">
       <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => handleRate(star)}
                >
                    <Star 
                        className={`w-6 h-6 transition-colors ${
                            (hoverRating || myRating) >= star 
                                ? 'fill-yellow-400 text-yellow-400' // สีทอง (ถ้าเลือกหรือชี้)
                                : 'text-gray-600' // สีเทา
                        }`} 
                    />
                </button>
            ))}
          </div>
          
          {/* แสดงคะแนนเฉลี่ย */}
          <div className="flex flex-col">
             <span className="text-2xl font-bold text-yellow-400 leading-none">
                {average > 0 ? average : '0'}
             </span>
             <span className="text-[10px] text-gray-500">
                จาก {count} คน
             </span>
          </div>
       </div>
       {myRating > 0 && <span className="text-xs text-green-400 ml-1">คุณให้ {myRating} ดาว</span>}
    </div>
  )
}