'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, ImagePlus, ArrowLeft, X } from 'lucide-react'
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import Image from 'next/image'

const GENRES_LIST = [
  'แอ็คชั่น', 'โรแมนติก', 'แฟนตาซี', 'ดราม่า', 'ตลก', 
  'ระทึกขวัญ', 'ชีวิตประจำวัน', 'สยองขวัญ', 'ผจญภัย', 
  'ไซไฟ', 'ลึกลับ', 'กีฬา', 'ต่างโลก', 'ฮาเร็ม', 'โรงเรียน',
  'สืบสวน', 'ย้อนยุค', 'ระบบ', 'ผู้หวนคืน', 'เกิดใหม่'
]

export default function EditComicPage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  
  // Data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]) // 👈 Array
  const [isPublished, setIsPublished] = useState(false)

  // Images
  const [coverUrl, setCoverUrl] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('comics').select('*').eq('id', id).single()
      
      if (data) {
        setTitle(data.title)
        setDescription(data.description || '')
        setIsPublished(data.is_published)
        setCoverUrl(data.cover_image_url || '')
        setCoverPreview(data.cover_image_url || '')
        setBannerUrl(data.banner_image_url || '')
        setBannerPreview(data.banner_image_url || '')

        // จัดการ Genre (รองรับทั้งแบบเก่า String และแบบใหม่ Array)
        if (Array.isArray(data.genre)) {
            setSelectedGenres(data.genre)
        } else if (typeof data.genre === 'string') {
            // ถ้าเป็นข้อมูลเก่า (String) ให้จับใส่ Array
            setSelectedGenres([data.genre]) 
        } else {
            setSelectedGenres([])
        }
      }
      setFetching(false)
    }
    fetchData()
  }, [id])

  // Helper Functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (type === 'cover') { setCoverFile(file); setCoverPreview(url); }
      else { setBannerFile(file); setBannerPreview(url); }
    }
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let finalCoverUrl = coverUrl
      let finalBannerUrl = bannerUrl

      // Upload Images if changed
      if (coverFile) {
        const path = `covers/${Date.now()}_edit_cover`
        await supabase.storage.from('comic-images').upload(path, coverFile)
        const { data } = supabase.storage.from('comic-images').getPublicUrl(path)
        finalCoverUrl = data.publicUrl
      }
      if (bannerFile) {
        const path = `banners/${Date.now()}_edit_banner`
        await supabase.storage.from('comic-images').upload(path, bannerFile)
        const { data } = supabase.storage.from('comic-images').getPublicUrl(path)
        finalBannerUrl = data.publicUrl
      }

      // Update API
      const res = await fetch(`/api/comics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          genre: selectedGenres, // 👈 ส่ง Array ไป
          cover_image_url: finalCoverUrl,
          banner_image_url: finalBannerUrl,
          is_published: isPublished
        })
      })

      if (!res.ok) throw new Error('Update failed')

      toast.success('✅ แก้ไขข้อมูลเรียบร้อย!')
      router.push('/admin/comics')
      router.refresh()

    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-white">กำลังโหลดข้อมูล...</div>

  return (
    <div className="min-h-screen bg-[#0d1016] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/comics"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
          <h1 className="text-2xl font-bold text-white">แก้ไขการ์ตูน</h1>
        </div>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="space-y-6">
            <Card className="bg-[#131720] border-white/5">
                <CardHeader><CardTitle className="text-white text-base">รูปปก</CardTitle></CardHeader>
                <CardContent>
                    <div className="relative aspect-[2/3] bg-black/40 rounded-lg border-dashed border-2 border-white/10 flex items-center justify-center overflow-hidden">
                        {coverPreview ? <Image src={coverPreview} alt="" fill className="object-cover" /> : <ImagePlus className="text-gray-500" />}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'cover')} />
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-[#131720] border-white/5">
                <CardHeader><CardTitle className="text-white text-base">Banner</CardTitle></CardHeader>
                <CardContent>
                    <div className="relative aspect-video bg-black/40 rounded-lg border-dashed border-2 border-white/10 flex items-center justify-center overflow-hidden">
                        {bannerPreview ? <Image src={bannerPreview} alt="" fill className="object-cover" /> : <ImagePlus className="text-gray-500" />}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'banner')} />
                    </div>
                </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2 bg-[#131720] border-white/5 h-fit">
            <CardHeader><CardTitle className="text-white">ข้อมูลทั่วไป</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300">ชื่อเรื่อง</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-black/20 border-white/10 text-white" />
              </div>

              {/* Multi-Select Genres */}
              <div className="space-y-2">
                <Label className="text-gray-300">หมวดหมู่</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-black/20 border-white/10 text-white hover:bg-white/5">
                      {selectedGenres.length > 0 ? `เลือกแล้ว ${selectedGenres.length} หมวดหมู่` : "เลือกหมวดหมู่"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-[#1f2937] border-white/10 text-white max-h-60 overflow-y-auto">
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
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedGenres.map(g => (
                    <Badge key={g} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 cursor-pointer" onClick={() => toggleGenre(g)}>
                      {g} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">เรื่องย่อ</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-black/20 border-white/10 text-white min-h-[150px]" />
              </div>

              <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5">
                <div className="space-y-0.5"><Label className="text-gray-200">สถานะเผยแพร่</Label></div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="bg-primary text-black hover:bg-primary/90 font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} บันทึกการแก้ไข
                </Button>
              </div>
            </CardContent>
          </Card>

        </form>
      </div>
    </div>
  )
}