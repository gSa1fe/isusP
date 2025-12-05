'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Save, ArrowLeft, X, GripVertical, UploadCloud } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'

// Interface สำหรับเก็บข้อมูลรูปภาพใน State
interface ImageItem {
  id?: string; // มี id = รูปเดิมใน DB, ไม่มี id = รูปใหม่
  image_url: string;
  file?: File; // เก็บไฟล์จริงถ้าเป็นรูปใหม่
}

export default function EditEpisodePage() { 
  const router = useRouter()
  const params = useParams() 

  const comicId = params?.id as string
  const episodeId = params?.episodeId as string 

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // ✅ State สำหรับข้อมูลตอน
  const [title, setTitle] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState<string>('') // ใช้ string เพื่อให้แก้ง่าย (ลบจนว่างได้)

  // State นี้จะเก็บทั้งรูปเก่าและรูปใหม่ผสมกัน ตามลำดับที่ user จัด
  const [imageList, setImageList] = useState<ImageItem[]>([])

  // 1. ดึงข้อมูลตอนและรูปภาพเดิม
  useEffect(() => {
    const fetchEpisodeData = async () => {
      // ดึงข้อมูลตอน
      const { data: epData, error: epError } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .single()
      
      if (epError) {
        toast.error('Error fetching episode: ' + epError.message)
        router.back()
        return
      }

      setTitle(epData.title)
      setEpisodeNumber(epData.episode_number.toString()) // ✅ Set ค่าเริ่มต้น

      // ดึงรูปภาพและเรียงตาม order_index
      const { data: imgData, error: imgError } = await supabase
        .from('episode_images')
        .select('id, image_url')
        .eq('episode_id', episodeId)
        .order('order_index', { ascending: true })
      
      if (imgError) {
        toast.error('Error fetching images: ' + imgError.message)
      } else {
        // เซตลง state (รูปเดิมจะมี id ติดมาด้วย)
        setImageList(imgData || [])
      }

      setLoading(false)
    }
    fetchEpisodeData()
  }, [episodeId, router])

  // 2. ฟังก์ชันจัดการ Drag and Drop
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(imageList)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setImageList(items)
  }

  // 3. ฟังก์ชันลบรูปออกจากรายการ
  const removeImage = (index: number) => {
    const newList = [...imageList]
    newList.splice(index, 1)
    setImageList(newList)
  }

  // 4. ฟังก์ชัน Dropzone สำหรับเพิ่มรูปใหม่
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // สร้าง Preview URL สำหรับรูปใหม่
    const newImages = acceptedFiles.map(file => ({
      image_url: URL.createObjectURL(file),
      file: file // เก็บไฟล์ไว้รออัปโหลด
      // ไม่มี id เพราะเป็นรูปใหม่
    }))
    // ต่อท้ายรายการเดิม
    setImageList(prev => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  })

  // 5. ฟังก์ชันบันทึกข้อมูล (Upload -> Call API)
  const handleSave = async () => {
    if (!title || !episodeNumber || imageList.length === 0) {
        return toast.error('กรุณากรอกชื่อตอน, ลำดับตอน และต้องมีรูปภาพอย่างน้อย 1 รูป')
    }

    // ✅ ตรวจสอบว่าเป็นตัวเลขหรือไม่
    const epNum = parseFloat(episodeNumber)
    if (isNaN(epNum)) {
        return toast.error('ลำดับตอนต้องเป็นตัวเลขเท่านั้น')
    }

    setSaving(true)

    try {
      // 5.1 อัปโหลดรูปใหม่ (ที่มี property 'file') ไป Storage ก่อน
      const finalImagesList = await Promise.all(imageList.map(async (imgItem) => {
        if (imgItem.file) {
          // ถ้ามีไฟล์ แสดงว่าเป็นรูปใหม่ ต้องอัปโหลด
          const fileExt = imgItem.file.name.split('.').pop()
          const fileName = `episodes/${comicId}/${episodeId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('comic-images')
            .upload(fileName, imgItem.file)

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from('comic-images')
            .getPublicUrl(fileName)
          
          // คืนค่า object ที่เป็น URL จริงๆ และไม่มี property 'file' แล้ว
          return { image_url: urlData.publicUrl }
        } else {
          // รูปเดิม ส่งกลับไปเหมือนเดิม (มี id และ image_url)
          return imgItem
        }
      }))

      // 5.2 ส่งข้อมูลทั้งหมดไปที่ API PUT
      const res = await fetch('/api/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: episodeId,
          title,
          episode_number: epNum, // ✅ ส่งเลขตอนที่แก้ไขแล้วไปด้วย
          images: finalImagesList // ส่งรายการที่จัดเรียงและได้ URL ครบแล้วไป
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('บันทึกการแก้ไขเรียบร้อยแล้ว!')
      router.back() // กลับไปหน้ารายการตอน

    } catch (error: any) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2" /> กลับ
        </Button>
        <div>
            <h1 className="text-2xl font-bold text-white">แก้ไขตอนที่ {episodeNumber}</h1>
            <p className="text-gray-400">จัดการข้อมูลตอนและจัดเรียงรูปภาพ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form & Upload */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="bg-[#1a1f29] border-white/10">
                <CardContent className="p-6 space-y-4">
                    
                    {/* ✅ เพิ่มช่องแก้ไขลำดับตอน */}
                    <div className="space-y-2">
                        <Label className="text-white">ลำดับตอนที่ (Episode No.)</Label>
                        <Input 
                            type="number"
                            value={episodeNumber} 
                            onChange={e => setEpisodeNumber(e.target.value)} 
                            className="bg-black/20 border-white/10 text-white"
                            placeholder="เช่น 1, 1.5, 2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white">ชื่อตอน</Label>
                        <Input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="bg-black/20 border-white/10 text-white"
                            placeholder="เช่น จุดเริ่มต้น"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#1a1f29] border-white/10">
                <CardContent className="p-6">
                    <Label className="text-white mb-2 block">เพิ่มรูปภาพใหม่ (ต่อท้าย)</Label>
                    <div 
                        {...getRootProps()} 
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                            isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-primary/50 hover:bg-white/5'
                        }`}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-300 font-medium">คลิก หรือ ลากรูปมาวางที่นี่</p>
                        <p className="text-gray-500 text-sm mt-1">รองรับ JPG, PNG (เลือกได้หลายรูป)</p>
                    </div>
                </CardContent>
            </Card>

            <Button 
                onClick={handleSave} 
                disabled={saving || imageList.length === 0} 
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-12 text-lg"
            >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                บันทึกการแก้ไข
            </Button>
        </div>

        {/* Right Column: Image Reordering List */}
        <div className="lg:col-span-2">
            <Card className="bg-[#1a1f29] border-white/10 h-full">
                <CardContent className="p-6">
                    <Label className="text-white mb-4 block">
                        รายการรูปภาพ ({imageList.length} รูป) - <span className="text-primary">ลากวางเพื่อจัดเรียง</span>
                    </Label>
                    
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="episode-images">
                            {(provided) => (
                                <div 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef}
                                    className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
                                >
                                    {imageList.map((img, index) => (
                                        <Draggable key={img.id || `new-${index}`} draggableId={img.id || `new-${index}`} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-center gap-4 p-2 rounded-lg border border-white/10 bg-black/20 group ${snapshot.isDragging ? 'shadow-lg border-primary bg-primary/10' : ''}`}
                                                >
                                                    {/* Drag Handle */}
                                                    <div {...provided.dragHandleProps} className="cursor-grab text-gray-500 hover:text-white">
                                                        <GripVertical className="w-5 h-5" />
                                                    </div>
                                                    
                                                    {/* Image Preview */}
                                                    <div className="relative w-16 h-20 bg-black/50 rounded overflow-hidden shrink-0">
                                                        <Image src={img.image_url} alt="" fill className="object-cover" />
                                                    </div>
                                                    
                                                    {/* Info & Delete */}
                                                    <div className="flex-1 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-white font-medium">หน้าที่ {index + 1}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {img.id ? 'รูปเดิม' : 'รูปใหม่ (รออัปโหลด)'}
                                                            </p>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => removeImage(index)}
                                                            className="text-gray-500 hover:text-red-500 hover:bg-red-500/10"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {imageList.length === 0 && (
                        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-white/10 rounded-xl mt-4">
                            ยังไม่มีรูปภาพ
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}