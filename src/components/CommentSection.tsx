'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Trash2, MessageSquare, ShieldAlert, ChevronDown } from 'lucide-react'
import { toast } from "sonner"

interface CommentSectionProps {
  episodeId?: string;
  comicId?: string;
}

export default function CommentSection({ episodeId, comicId }: CommentSectionProps) {
  // ... (State และ useEffect เหมือนเดิม)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const baseApiUrl = episodeId 
    ? `/api/comments?episode_id=${episodeId}` 
    : `/api/comments?comic_id=${comicId}`

  // ... (fetchComments เหมือนเดิม)
  const fetchComments = async (pageNum: number) => {
    try {
        const res = await fetch(`${baseApiUrl}&page=${pageNum}&limit=10`)
        if (res.ok) {
            const result = await res.json()
            if (pageNum === 1) {
                setComments(result.data || [])
            } else {
                setComments(prev => [...prev, ...result.data])
            }
            setHasMore(result.meta.hasMore)
            setPage(pageNum)
        }
    } catch (error) {
        console.error(error)
    } finally {
        setLoading(false)
        setLoadingMore(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setComments([])
    setPage(1)
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'admin') setIsAdmin(true)
      }
    }
    checkUser()
    fetchComments(1)
  }, [episodeId, comicId])

  const handleLoadMore = () => {
      setLoadingMore(true)
      fetchComments(page + 1)
  }

  // ... (handleSubmit เหมือนเดิม แต่เปลี่ยน alert เป็น toast ในกรณี error)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            episode_id: episodeId, 
            comic_id: comicId, 
            content: newComment 
        })
      })
      const data = await res.json()
      if (!res.ok) {
          toast.error(data.error || 'ส่งคอมเมนต์ไม่สำเร็จ')
          return
      }
      setNewComment('')
      toast.success("คอมเมนต์เรียบร้อย")
      
      if (data.data) {
          setComments(prev => [data.data, ...prev])
      } else {
          fetchComments(1)
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ ฟังก์ชันลบแบบใหม่ ใช้ Toast confirm ของ Sonner
  const handleDelete = (commentId: string) => {
    toast("คุณแน่ใจหรือไม่ที่จะลบคอมเมนต์นี้?", {
      description: "การกระทำนี้ไม่สามารถย้อนกลับได้",
      action: {
        label: "ลบเลย",
        onClick: () => confirmDelete(commentId), // ถ้ากดปุ่ม "ลบเลย" ให้เรียกฟังก์ชันลบจริง
      },
      cancel: {
        label: "ยกเลิก",
        onClick: () => console.log("Cancel"),
      },
      duration: 5000, // ให้เวลาตัดสินใจ 5 วินาที
      position: 'top-center' // ให้เด่นๆ กลางจอ (ถ้าต้องการ หรือจะใช้ default ก็ได้)
    })
  }

  // ฟังก์ชันลบจริง (แยกออกมาเพื่อให้ Toast เรียกใช้)
  const confirmDelete = async (commentId: string) => {
    try {
      // Optimistic update: ลบออกจากหน้าจอก่อนเลยเพื่อความลื่นไหล
      const previousComments = [...comments]
      setComments(prev => prev.filter(c => c.id !== commentId))

      const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' })
      const data = await res.json()
      
      if(!res.ok) {
        // ถ้าลบพลาด ให้คืนค่าคอมเมนต์กลับมา
        setComments(previousComments)
        throw new Error(data.error || 'Failed')
      }
      
      toast.success("ลบคอมเมนต์เรียบร้อยแล้ว")

    } catch (error: any) {
      toast.error(error.message || 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="w-full bg-[#131720] p-6 rounded-xl border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 text-white">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">ความคิดเห็น</h3>
      </div>

      {/* Comment Form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-4 mb-8">
          <Avatar className="w-10 h-10 border border-white/10">
             <AvatarImage src={currentUser.user_metadata?.avatar_url} />
             <AvatarFallback className="bg-primary text-black font-bold">ฉัน</AvatarFallback>
          </Avatar>
          <div className="flex-1 gap-2 flex flex-col items-end">
             <Textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="แสดงความคิดเห็น..." 
                className="bg-black/20 border-white/10 text-white min-h-[80px] resize-none focus-visible:ring-primary"
                maxLength={500}
             />
             <div className="flex justify-between w-full items-center">
                <span className="text-xs text-gray-600">{newComment.length}/500</span>
                <Button type="submit" disabled={submitting || !newComment.trim()} className="bg-primary text-black hover:bg-primary/90 font-bold">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    ส่ง
                </Button>
             </div>
          </div>
        </form>
      ) : (
        <div className="bg-white/5 p-4 rounded-lg text-center mb-8 border border-white/5">
            <p className="text-gray-400 text-sm">กรุณา <span className="text-primary font-bold">เข้าสู่ระบบ</span> เพื่อแสดงความคิดเห็น</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
            <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" /></div>
        ) : comments.length > 0 ? (
            <>
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group animate-in fade-in duration-300">
                        <Avatar className="w-10 h-10 border border-white/10 shrink-0">
                            <AvatarImage src={comment.profiles?.avatar_url} />
                            <AvatarFallback className="bg-gray-700 text-gray-300">{comment.profiles?.username?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white truncate">{comment.profiles?.username || 'Unknown'}</span>
                                    <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                                </div>
                                
                                {/* ปุ่มลบ */}
                                {(currentUser?.id === comment.user_id || isAdmin) && (
                                    <button 
                                        onClick={() => handleDelete(comment.id)} // ✅ เรียกฟังก์ชันใหม่
                                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${isAdmin && currentUser?.id !== comment.user_id ? 'text-red-400 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`}
                                        title="ลบ"
                                    >
                                        {isAdmin && currentUser?.id !== comment.user_id ? <ShieldAlert className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                            
                            <p className="text-sm text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <div className="pt-4 text-center">
                        <Button 
                            variant="ghost" 
                            onClick={handleLoadMore} 
                            disabled={loadingMore}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                            โหลดความคิดเห็นเพิ่มเติม
                        </Button>
                    </div>
                )}
            </>
        ) : (
            <p className="text-gray-500 text-sm text-center py-4">ยังไม่มีความคิดเห็น เป็นคนแรกสิ!</p>
        )}
      </div>
    </div>
  )
}