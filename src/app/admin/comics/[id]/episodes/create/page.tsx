'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Loader2, FileImage, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

// ฟังก์ชันสำหรับหน่วงเวลา (Cooldown)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function CreateEpisodePage() {
  const router = useRouter()
  const { id: comicId } = useParams()
  
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  
  const [title, setTitle] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  // 1. เลือกไฟล์ (Append & Sort)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      const combinedFiles = [...selectedFiles, ...newFiles]

      // กรองไฟล์ซ้ำ
      const uniqueFiles = combinedFiles.filter((file, index, self) =>
        index === self.findIndex((t) => (
          t.name === file.name && t.size === file.size
        ))
      )

      // เรียงตามชื่อไฟล์
      uniqueFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      
      setSelectedFiles(uniqueFiles)
      const newPreviews = uniqueFiles.map(file => URL.createObjectURL(file))
      setPreviews(newPreviews)
      
      e.target.value = '' // Reset input
    }
  }

  // 2. ลบรูป
  const removeImage = (indexToRemove: number) => {
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove)
    setSelectedFiles(newFiles)
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    setPreviews(newPreviews)
  }

  // 3. ฟังก์ชันอัปโหลดทีละ Batch
  const uploadImagesInBatches = async (files: File[]) => {
    const batchSize = 5; 
    const results = [];
    const total = files.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      setUploadProgress(`กำลังอัปโหลดชุดที่ ${Math.floor(i/batchSize) + 1}... (${i}/${total})`);

      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        const fileExt = file.name.split('.').pop();
        const fileName = `temp_${Date.now()}_${globalIndex}.${fileExt}`;
        const filePath = `episodes/${comicId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comic-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('comic-images')
          .getPublicUrl(filePath);

        return {
          image_url: urlData.publicUrl,
          page_number: globalIndex + 1 
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !episodeNumber || selectedFiles.length === 0) {
      toast.error("กรุณากรอกข้อมูลให้ครบและเลือกรูปภาพ")
      return
    }

    setLoading(true)
    
    try {
      // 1. เริ่มอัปโหลดรูปภาพ
      const uploadedImagesData = await uploadImagesInBatches(selectedFiles);

      // --- เพิ่มส่วน Cooldown ---
      setUploadProgress('อัปโหลดเสร็จสิ้น! กำลังประมวลผล (รอสักครู่)...')
      await delay(5000); // หน่วงเวลา 5 วินาที (5000ms) ให้แน่ใจว่าไฟล์เข้า Server ครบ
      // -----------------------

      // 2. บันทึกข้อมูลลง Database
      setUploadProgress('กำลังบันทึกข้อมูลลงฐานข้อมูล...')
      
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comic_id: comicId,
          title,
          episode_number: episodeNumber,
          images: uploadedImagesData
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setUploadProgress('เสร็จเรียบร้อย!')
      await delay(500); // หน่วงนิดหน่อยให้เห็นข้อความสำเร็จ

      toast.success("✅ เพิ่มตอนใหม่เรียบร้อยแล้ว!")
      router.push(`/admin/comics/${comicId}`)

    } catch (error: any) {
      console.error(error)
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/comics/${comicId}`} className="p-2 hover:bg-white/10 rounded-full transition text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white">เพิ่มตอนใหม่</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left: Form Input & Uploader */}
        <Card className="md:col-span-1 bg-[#131720] border-white/10 h-fit sticky top-4">
          <CardHeader>
            <CardTitle className="text-white">ข้อมูลตอน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">เลขตอนที่ (EP)</Label>
                <Input 
                  type="number" 
                  placeholder="เช่น 1" 
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">ชื่อตอน</Label>
                <Input 
                  placeholder="เช่น จุดเริ่มต้น..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10">
                <Label className="text-gray-300 mb-2 block">เพิ่มรูปภาพเนื้อหา</Label>
                
                {/* ปุ่มเพิ่มรูป */}
                <div className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="bg-primary/10 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">กดเพื่อเพิ่มรูปภาพ</span>
                  <span className="text-[10px] text-gray-500 mt-1">เลือกเพิ่มทีละหลายรูปได้</span>
                </div>

                <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-gray-400">
                        {selectedFiles.length > 0 
                            ? `เลือกแล้ว ${selectedFiles.length} รูป` 
                            : 'ยังไม่เลือกรูป'}
                    </span>
                    {selectedFiles.length > 0 && (
                        <button 
                            type="button"
                            onClick={() => { setSelectedFiles([]); setPreviews([]); }}
                            className="text-red-400 hover:text-red-300 hover:underline"
                        >
                            ลบทั้งหมด
                        </button>
                    )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-[#0d1016] hover:bg-primary/90 font-bold mt-4"
                disabled={loading || selectedFiles.length === 0}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {loading ? 'กำลังดำเนินการ...' : 'บันทึกตอนใหม่'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Image Previews */}
        <Card className="md:col-span-2 bg-[#131720] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex justify-between items-center">
              <span>ตัวอย่างรูปภาพ ({selectedFiles.length})</span>
              {loading && <span className="text-sm text-primary animate-pulse">{uploadProgress}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {previews.map((src, index) => (
                  <div key={index} className="relative aspect-[2/3] group bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                    <Image 
                      src={src} 
                      alt={`Page ${index + 1}`} 
                      fill 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    
                    {/* Badge เลขหน้า */}
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/10 shadow-sm backdrop-blur-sm">
                      #{index + 1}
                    </div>

                    {/* ปุ่มลบรูป */}
                    <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 shadow-md"
                        title="ลบรูปนี้"
                    >
                        <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-lg bg-white/5">
                <FileImage className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-lg font-medium text-gray-400">ยังไม่มีรูปภาพ</p>
                <p className="text-sm text-gray-600">กดปุ่ม + ทางซ้ายเพื่อเพิ่มรูป</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}