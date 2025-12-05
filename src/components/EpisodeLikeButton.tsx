'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase'

export default function EpisodeLikeButton({ episodeId }: { episodeId: string }) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // 1. โหลดข้อมูล
  useEffect(() => {
    const fetchData = async () => {
        const res = await fetch(`/api/episodes/like?episode_id=${episodeId}`)
        if (res.ok) {
            const data = await res.json()
            setLikes(data.count)
            setIsLiked(data.isLiked)
        }
        setLoading(false)
    }
    fetchData()
  }, [episodeId])

  // 2. กดปุ่ม
  const handleToggleLike = async () => {
    // เช็ค Login ฝั่ง Client
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        alert('กรุณาเข้าสู่ระบบเพื่อกดถูกใจ')
        return
    }

    // Optimistic Update (อัปเดตตัวเลขทันทีให้ดูลื่น)
    const previousLiked = isLiked
    const previousLikes = likes
    
    setIsLiked(!isLiked)
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
    setProcessing(true)

    try {
        const res = await fetch('/api/episodes/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episode_id: episodeId })
        })

        if (!res.ok) throw new Error('Failed')
        
        // Sync ข้อมูลจริงจาก Server อีกรอบเพื่อความชัวร์
        const data = await res.json()
        setIsLiked(data.liked)
        
        // Re-fetch count
        const countRes = await fetch(`/api/episodes/like?episode_id=${episodeId}`)
        const countData = await countRes.json()
        setLikes(countData.count)

    } catch (error) {
        // ถ้าพัง ให้ย้อนค่ากลับ
        setIsLiked(previousLiked)
        setLikes(previousLikes)
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
        setProcessing(false)
    }
  }

  if (loading) return <Button variant="ghost" disabled size="sm"><Loader2 className="w-4 h-4 animate-spin" /></Button>

  return (
    <div className="flex flex-col items-center gap-2">
        <Button 
            variant="outline" 
            size="lg"
            className={`rounded-full px-6 h-12 border transition-all duration-300 ${
                isLiked 
                    ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/50'
            }`}
            onClick={handleToggleLike}
            disabled={processing}
        >
            <Heart className={`w-6 h-6 mr-2 transition-transform ${isLiked ? 'fill-current scale-110' : ''}`} />
            <span className="font-bold text-lg">{likes}</span>
        </Button>
        <span className="text-xs text-gray-500">ถูกใจตอนนี้</span>
    </div>
  )
}