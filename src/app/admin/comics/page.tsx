'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Pencil, Trash2, Layers, Search, Loader2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ComicsListPage() {
  const [comics, setComics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ดึงข้อมูลการ์ตูน
  const fetchComics = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comics')
      .select('*, episodes(count)') // ดึงจำนวนตอนมาด้วย
      .order('created_at', { ascending: false })
    
    if (!error) setComics(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchComics()
  }, [])

  // ฟังก์ชันลบจริง
const confirmDelete = async (id: string) => {
  const { error } = await supabase.from('comics').delete().eq('id', id)

  if (error) {
    toast.error('ลบไม่สำเร็จ: ' + error.message)
  } else {
    setComics(comics.filter(c => c.id !== id))
    toast.success("ลบการ์ตูนสำเร็จ")
  }
}

// ฟังก์ชันแสดง Confirm
const handleDelete = (id: string) => {
  toast.warning("คุณแน่ใจหรือไม่ที่จะลบเรื่องนี้?", {
    description: "การกระทำนี้ไม่สามารถย้อนกลับได้",
    action: {
      label: "ลบเลย",
      onClick: () => confirmDelete(id),
    },
    duration: 5000,
    position: "top-center",
  })
}


  // กรองการค้นหา
  const filteredComics = comics.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">จัดการการ์ตูน</h1>
          <p className="text-gray-400">รายการการ์ตูนทั้งหมดในระบบ</p>
        </div>
        <Button asChild className="bg-primary text-[#0d1016] hover:bg-primary/90 font-bold">
          <Link href="/admin/comics/create">
            <Plus className="mr-2 h-4 w-4" /> เพิ่มเรื่องใหม่
          </Link>
        </Button>
      </div>

      <Card className="bg-[#1a1f29] border-white/5 text-white">
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="ค้นหาชื่อเรื่อง..." 
              className="pl-9 bg-[#131720] border-white/10 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-gray-400">ปก</TableHead>
                  <TableHead className="text-gray-400">ชื่อเรื่อง</TableHead>
                  <TableHead className="text-gray-400">ตอน</TableHead>
                  <TableHead className="text-gray-400">สถานะ</TableHead>
                  <TableHead className="text-gray-400 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComics.map((comic) => (
                  <TableRow key={comic.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <Avatar className="h-12 w-12 rounded-md border border-white/10">
                        <AvatarImage src={comic.cover_image_url} className="object-cover" />
                        <AvatarFallback className="rounded-md">IMG</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {comic.title}
                      <div className="text-xs text-gray-500">{comic.genre}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                        {comic.episodes?.[0]?.count || 0} ตอน
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${comic.is_published ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} border-0`}>
                        {comic.is_published ? 'เผยแพร่' : 'ร่าง'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* ปุ่มดูรายชื่อตอน */}
                        <Button asChild size="icon" variant="ghost" className="hover:bg-blue-500/10 hover:text-blue-400">
                          <Link href={`/admin/comics/${comic.id}`} title="จัดการตอน">
                            <Layers className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        {/* ปุ่มแก้ไข */}
                        <Button asChild size="icon" variant="ghost" className="hover:bg-yellow-500/10 hover:text-yellow-400">
                          <Link href={`/admin/comics/${comic.id}/edit`} title="แก้ไขข้อมูล">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>

                        {/* ปุ่มลบ */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => handleDelete(comic.id)}
                          title="ลบเรื่อง"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}