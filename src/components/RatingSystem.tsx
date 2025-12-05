'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"

interface RatingSystemProps {
  comicId: string
}

export default function RatingSystem({ comicId }: RatingSystemProps) {
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [myRating, setMyRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchRating = async () => {
    try {
      const res = await fetch(`/api/rating?comic_id=${comicId}`, {
        cache: 'no-store'
      })

      if (res.ok) {
        const data = await res.json()
        setAverage(data.average || 0)
        setCount(data.count || 0)
        setMyRating(data.myRating || 0)
      }
    } catch (err) {
      console.error("Fetch rating error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRating()
  }, [comicId])

  // ⭐ อัปเดตฟังก์ชันให้คะแนนให้ใช้ toast แทน alert
  const handleRate = async (score: number) => {
    const { data: { user } } = await supabase.auth.getUser()

    // ⛔ ยังไม่ login → toast.error
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบเพื่อให้คะแนน")
      return
    }

    const oldRating = myRating
    setMyRating(score) // Optimistic update

    try {
      const res = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comic_id: comicId, rating: score })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to rate')
      }

      // ⭐ toast.success แบบเนียนๆ
      toast.success(`คุณให้ ${score} ดาว`)

      await fetchRating()

    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`)
      setMyRating(oldRating) // rollback
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        
        {/* ดาว */}
        <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => handleRate(star)}
              disabled={loading}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  (hoverRating || myRating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>

        {/* คะแนน */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-yellow-400 leading-none">
            {average > 0 ? average : '0.0'}
          </span>
          <span className="text-[10px] text-gray-500">
            จาก {count} คน
          </span>
        </div>
      </div>

      {myRating > 0 && (
        <span className="text-xs text-green-400 ml-1 animate-in fade-in slide-in-from-left-1">
          คุณให้ {myRating} ดาว
        </span>
      )}
    </div>
  )
}
