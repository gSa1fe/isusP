'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ArrowLeft, Trash2, Eye, Edit } from 'lucide-react' 
import { toast } from "sonner"

export default function ManageEpisodesPage() {
  const { id } = useParams() // id นี้คือ comic_id
  const [comic, setComic] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // 1. ดึงข้อมูลเรื่อง
      const { data: comicData } = await supabase.from('comics').select('*').eq('id', id).single()
      setComic(comicData)

      // 2. ดึงข้อมูลตอน
      const { data: epData } = await supabase
        .from('episodes')
        .select('*')
        .eq('comic_id', id)
        .order('episode_number', { ascending: false }) // ตอนใหม่สุดอยู่บน
      
      setEpisodes(epData || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleDeleteEp = async (epId: string) => {
    if(!confirm('ยืนยันลบตอนนี้? (ข้อมูลและรูปภาพทั้งหมดจะหายไป)')) return
    
    try {
      const res = await fetch(`/api/episodes?id=${epId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ลบไม่สำเร็จ')
      }

      setEpisodes(episodes.filter(e => e.id !== epId))
      toast.success('✅ ลบตอนเรียบร้อยแล้ว')

    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  if (loading) return <div className="p-8 text-center text-white">กำลังโหลด...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/comics" className="p-2 hover:bg-white/10 rounded-full transition text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 relative rounded overflow-hidden border border-white/20">
               {comic?.cover_image_url && <Image src={comic.cover_image_url} alt="" fill className="object-cover" />}
             </div>
             <div>
               <h1 className="text-xl font-bold text-white">{comic?.title}</h1>
               <p className="text-sm text-gray-400">{episodes.length} ตอนทั้งหมด</p>
             </div>
          </div>
        </div>
        
        {/* ปุ่มเพิ่มตอน */}
        <Button asChild className="bg-primary text-[#0d1016] hover:bg-primary/90 font-bold">
          <Link href={`/admin/comics/${id}/episodes/create`}>
            <Plus className="mr-2 h-4 w-4" /> เพิ่มตอนใหม่
          </Link>
        </Button>
      </div>

      {/* Episodes List */}
      <div className="grid gap-3">
        {episodes.length > 0 ? (
          episodes.map((ep) => (
            <Card key={ep.id} className="bg-[#1a1f29] border-white/5 hover:border-primary/30 transition-all group">
              <CardContent className="p-4 flex items-center justify-between">
                
                {/* ข้อมูลตอน */}
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                    <span className="text-primary">EP.{ep.episode_number}</span> : {ep.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    สร้างเมื่อ {new Date(ep.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>

                {/* ปุ่มจัดการ */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  
                  {/* ปุ่ม Edit: ใช้ id (comic_id) และ ep.id (episode_id) */}
                  <Link href={`/admin/comics/${id}/episodes/${ep.id}/edit`}>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10">
                        <Edit className="w-5 h-5" />
                    </Button>
                  </Link>

                  <Button asChild size="icon" variant="ghost" className="hover:text-blue-400">
                    <Link href={`/read/${ep.id}`} target="_blank">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  
                  <Button size="icon" variant="ghost" className="hover:text-red-400" onClick={() => handleDeleteEp(ep.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-gray-500">ยังไม่มีตอนในการ์ตูนเรื่องนี้</p>
          </div>
        )}
      </div>
    </div>
  )
}