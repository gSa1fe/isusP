'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trash2, Plus, Loader2, Save, ImagePlus } from 'lucide-react'
import { toast } from "sonner"

export default function ManageEpisodeImagesPage() {
  const { id: comicId, episodeId } = useParams()
  const router = useRouter()

  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [episodeInfo, setEpisodeInfo] = useState({ title: '', number: 0 })

  // 1. โหลดข้อมูลรูปภาพปัจจุบัน
  const fetchData = async () => {
    try {
      // ดึงชื่อตอน
      const { data: ep } = await supabase.from('episodes').select('title, episode_number').eq('id', episodeId).single()
      if (ep) setEpisodeInfo({ title: ep.title, number: ep.episode_number })

      // ดึงรูปภาพ (เรียงตาม order_index)
      const { data, error } = await supabase
        .from('episode_images')
        .select('*')
        .eq('episode_id', episodeId)
        .order('order_index', { ascending: true })

      if (!error) setImages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [episodeId])

  // 2. ฟังก์ชันเพิ่มรูปใหม่ (Upload -> API)
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    setUploading(true)
    const files = Array.from(e.target.files)
    
    // เรียงไฟล์ตามชื่อ (เพื่อความถูกต้อง)
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

    try {
      const newImagesData = []
      // หา order_index ตัวสุดท้าย เพื่อต่อท้าย
      let lastIndex = images.length > 0 ? images[images.length - 1].order_index : 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(`กำลังอัปโหลดรูปที่ ${i + 1} / ${files.length}`)

        const fileExt = file.name.split('.').pop()
        const fileName = `${episodeId}/add_${Date.now()}_${i}.${fileExt}`
        const filePath = `episodes/${fileName}`

        // Upload Storage
        const { error: uploadError } = await supabase.storage
          .from('comic-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('comic-images')
          .getPublicUrl(filePath)

        lastIndex++
        newImagesData.push({
            image_url: urlData.publicUrl,
            order_index: lastIndex // รันเลขต่อจากเดิม
        })
      }

      // Save to DB via API
      setProgress('กำลังบันทึกข้อมูล...')
      const res = await fetch('/api/episodes/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: episodeId,
          images: newImagesData
        })
      })

      if (!res.ok) throw new Error('API Failed')

      toast.success('✅ เพิ่มรูปสำเร็จ!')
      fetchData() // โหลดข้อมูลใหม่ทันที

    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setUploading(false)
      setProgress('')
      // ล้างค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
      e.target.value = ''
    }
  }

  // 3. ฟังก์ชันลบรูป
  const handleDeleteImage = async (imgId: string, imgUrl: string) => {
    if (!confirm('ยืนยันลบรูปนี้?')) return

    try {
      const res = await fetch('/api/episodes/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: imgId, image_url: imgUrl })
      })

      if (!res.ok) throw new Error('Failed')
      
      // ลบออกจากหน้าจอ
      setImages(images.filter(img => img.id !== imgId))

    } catch (error) {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  if (loading) return <div className="p-10 text-center text-white"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-[#1a1f29] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
            <Link href={`/admin/comics/${comicId}`} className="p-2 hover:bg-white/10 rounded-full transition text-white">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
                <h1 className="text-xl font-bold text-white">จัดการรูปภาพ</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">EP.{episodeInfo.number}</span>
                    <span>{episodeInfo.title}</span>
                </div>
            </div>
        </div>

        {/* ปุ่ม Upload ใหญ่ */}
        <div className="relative">
            <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleAddImages}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={uploading}
            />
            <Button className="bg-primary text-black hover:bg-primary/90 font-bold pl-3 pr-4">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-5 w-5" />}
                {uploading ? progress : 'เพิ่มรูปต่อท้าย'}
            </Button>
        </div>
      </div>

      {/* Grid แสดงรูปภาพ */}
      <Card className="bg-[#131720] border-white/10 min-h-[500px]">
        <CardHeader>
            <CardTitle className="text-white text-sm font-medium">
                รูปภาพทั้งหมด ({images.length} หน้า)
            </CardTitle>
        </CardHeader>
        <CardContent>
            {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {images.map((img) => (
                        <div key={img.id} className="relative aspect-[2/3] group bg-black rounded-lg border border-white/10 overflow-hidden hover:border-primary/50 transition-all">
                            <Image 
                                src={img.image_url} 
                                alt={`Page ${img.order_index}`} 
                                fill 
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            
                            {/* เลขหน้า */}
                            <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                #{img.order_index}
                            </div>

                            {/* ปุ่มลบ (โผล่ตอนเอาเมาส์ชี้) */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => handleDeleteImage(img.id, img.image_url)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ImagePlus className="h-12 w-12 mb-2 opacity-20" />
                    <p>ยังไม่มีรูปภาพในตอนนี้</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}