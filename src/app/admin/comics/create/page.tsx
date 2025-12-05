'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge" // เพิ่ม Badge
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Upload, Loader2, ImagePlus, X, Save, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// รายชื่อหมวดหมู่ทั้งหมด
const GENRES_LIST = [
  'แอ็คชั่น', 'โรแมนติก', 'แฟนตาซี', 'ดราม่า', 'ตลก', 
  'ระทึกขวัญ', 'ชีวิตประจำวัน', 'สยองขวัญ', 'ผจญภัย', 
  'ไซไฟ', 'ลึกลับ', 'กีฬา', 'ต่างโลก', 'ฮาเร็ม', 'โรงเรียน',
  'สืบสวน', 'ย้อนยุค', 'ระบบ', 'ผู้หวนคืน', 'เกิดใหม่'
]

export default function CreateComicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]) // 👈 เปลี่ยนเป็น Array
  
  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (type === 'cover') {
        setCoverFile(file)
        setCoverPreview(url)
      } else {
        setBannerFile(file)
        setBannerPreview(url)
      }
    }
  }

  // ฟังก์ชันเลือก/ยกเลิกหมวดหมู่
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || selectedGenres.length === 0 || !coverFile) {
      alert("กรุณากรอกข้อมูลให้ครบ (ชื่อ, หมวดหมู่, รูปปก)")
      return
    }

    setLoading(true)

    try {
      // 1. Upload Cover
      const coverPath = `covers/${Date.now()}_cover_${coverFile.name}`
      await supabase.storage.from('comic-images').upload(coverPath, coverFile)
      const { data: coverUrlData } = supabase.storage.from('comic-images').getPublicUrl(coverPath)

      // 2. Upload Banner
      let bannerUrl = null
      if (bannerFile) {
        const bannerPath = `banners/${Date.now()}_banner_${bannerFile.name}`
        await supabase.storage.from('comic-images').upload(bannerPath, bannerFile)
        const { data: bannerUrlData } = supabase.storage.from('comic-images').getPublicUrl(bannerPath)
        bannerUrl = bannerUrlData.publicUrl
      }

      // 3. API Call
      const res = await fetch('/api/comics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          genre: selectedGenres, // 👈 ส่งเป็น Array ไปเลย
          cover_image_url: coverUrlData.publicUrl,
          banner_image_url: bannerUrl,
          is_published: true
        })
      })

      if (!res.ok) throw new Error('API Error')

      alert("✅ เพิ่มการ์ตูนสำเร็จ!")
      router.push('/admin/comics')

    } catch (error: any) {
      console.error(error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1016] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
          <h1 className="text-2xl font-bold text-white">เพิ่มการ์ตูนเรื่องใหม่</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Images Column */}
          <div className="space-y-6">
            <Card className="bg-[#131720] border-white/5">
              <CardHeader><CardTitle className="text-white text-base">รูปปก (แนวตั้ง)</CardTitle></CardHeader>
              <CardContent>
                <div className="relative aspect-[2/3] bg-black/40 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors group">
                  {coverPreview ? (
                    <>
                      <Image src={coverPreview} alt="Cover" fill className="object-cover" />
                      <button type="button" onClick={() => {setCoverFile(null); setCoverPreview(null)}} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <div className="text-center text-gray-500"><ImagePlus className="mx-auto mb-2" /><span className="text-xs">คลิกอัปโหลดปก</span></div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#131720] border-white/5">
              <CardHeader><CardTitle className="text-white text-base">ภาพพื้นหลัง Banner (แนวนอน)</CardTitle></CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-black/40 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors group">
                  {bannerPreview ? (
                    <>
                      <Image src={bannerPreview} alt="Banner" fill className="object-cover" />
                      <button type="button" onClick={() => {setBannerFile(null); setBannerPreview(null)}} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <div className="text-center text-gray-500"><ImagePlus className="mx-auto mb-2" /><span className="text-xs">คลิกอัปโหลด Banner</span></div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Column */}
          <Card className="lg:col-span-2 bg-[#131720] border-white/5 h-fit">
            <CardHeader><CardTitle className="text-white">ข้อมูลทั่วไป</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">ชื่อเรื่อง</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-black/20 border-white/10 text-white" required />
              </div>

              {/* 👇 ส่วนเลือกหมวดหมู่แบบ Multi-Select */}
              <div className="space-y-2">
                <Label className="text-gray-300">หมวดหมู่ <span className="text-red-500">*</span></Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-black/20 border-white/10 text-white hover:bg-white/5">
                      {selectedGenres.length > 0 
                        ? `เลือกแล้ว ${selectedGenres.length} หมวดหมู่` 
                        : "เลือกหมวดหมู่ (ได้มากกว่า 1)"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-[#1f2937] border-white/10 text-white max-h-60 overflow-y-auto">
                    <DropdownMenuLabel>หมวดหมู่ทั้งหมด</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {GENRES_LIST.map((g) => (
                      <DropdownMenuCheckboxItem
                        key={g}
                        checked={selectedGenres.includes(g)}
                        onCheckedChange={() => toggleGenre(g)}
                        className="focus:bg-primary/20 focus:text-white"
                      >
                        {g}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* แสดง Badges ของหมวดหมู่ที่เลือก */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedGenres.map(g => (
                    <Badge key={g} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => toggleGenre(g)}>
                      {g} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">เรื่องย่อ</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-black/20 border-white/10 text-white min-h-[150px]" />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" className="bg-primary text-black hover:bg-primary/90 font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>

        </form>
      </div>
    </div>
  )
}