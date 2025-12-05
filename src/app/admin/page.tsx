import { createClient } from '@/lib/supabase-server' // เรียกใช้ Server Client
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookOpen, Users, Layers, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { OverviewChart } from '@/app/admin/OverviewChart' // อย่าลืมสร้างไฟล์นี้นะครับ (ขั้นตอนถัดไป)

// ฟังก์ชันดึงข้อมูล (Server-Side)
async function getDashboardData() {
  const supabase = await createClient()

  // 1. ดึงจำนวนการ์ตูนทั้งหมด
  const { count: comicsCount } = await supabase
    .from('comics')
    .select('*', { count: 'exact', head: true })

  // 2. ดึงจำนวนตอนทั้งหมด
  const { count: episodesCount } = await supabase
    .from('episodes')
    .select('*', { count: 'exact', head: true })

  // 3. ดึงจำนวนสมาชิก (Profiles)
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 4. ดึงการ์ตูน 5 เรื่องล่าสุด
  const { data: recentComics } = await supabase
    .from('comics')
    .select('*, profiles(username)')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    comicsCount: comicsCount || 0,
    episodesCount: episodesCount || 0,
    usersCount: usersCount || 0,
    recentComics: recentComics || []
  }
}

export default async function AdminDashboard() {
  // ดึงข้อมูลจริงจาก Database
  const { comicsCount, episodesCount, usersCount, recentComics } = await getDashboardData()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">ภาพรวมระบบ</p>
        </div>
      </div>

      {/* 1. Stats Grid (ข้อมูลจริง) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="การ์ตูนทั้งหมด" 
          value={comicsCount} 
          sub="เรื่อง" 
          icon={<BookOpen className="text-primary h-5 w-5" />} 
        />
        <StatCard 
          title="ตอนทั้งหมด" 
          value={episodesCount} 
          sub="ตอน" 
          icon={<Layers className="text-blue-400 h-5 w-5" />} 
        />
        <StatCard 
          title="สมาชิก" 
          value={usersCount} 
          sub="คน" 
          icon={<Users className="text-green-400 h-5 w-5" />} 
        />
        {/* รายได้ยังเป็น Mockup เพราะเรายังไม่ได้ทำระบบ Coin */}
        <StatCard 
          title="รายได้ (Coin)" 
          value="฿0" 
          sub="บาท" 
          icon={<TrendingUp className="text-yellow-400 h-5 w-5" />} 
        />
      </div>

      {/* 2. Content Area */}
      <div className="grid gap-6 md:grid-cols-7">
        
        {/* ตารางการ์ตูนล่าสุด (พื้นที่กว้าง) */}
        <Card className="col-span-4 bg-[#1a1f29] border-white/5 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>การ์ตูนมาใหม่ล่าสุด</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:text-primary hover:bg-primary/10">
              <Link href="/admin/comics">ดูทั้งหมด <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-gray-400">ชื่อเรื่อง</TableHead>
                  <TableHead className="text-gray-400">หมวดหมู่</TableHead>
                  <TableHead className="text-gray-400 text-right">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentComics.length > 0 ? (
                  recentComics.map((comic) => (
                    <TableRow key={comic.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-md border border-white/10">
                            <AvatarImage src={comic.cover_image_url} className="object-cover" />
                            <AvatarFallback className="rounded-md bg-gray-800">IMG</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px]">{comic.title}</span>
                            <span className="text-[10px] text-gray-500">{new Date(comic.created_at).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 text-gray-300 font-normal">
                          {comic.genre}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={`${comic.is_published ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} border-0`}>
                          {comic.is_published ? 'เผยแพร่' : 'ร่าง'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      ยังไม่มีข้อมูลการ์ตูน
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* กราฟสถิติ (พื้นที่แคบ) */}
        <Card className="col-span-3 bg-[#1a1f29] border-white/5 text-white shadow-xl flex flex-col">
           <CardHeader>
             <CardTitle>สถิติยอดวิวรายเดือน</CardTitle>
           </CardHeader>
           <CardContent className="flex-1 min-h-[300px]">
             {/* เรียกใช้ Component กราฟ */}
             <OverviewChart />
           </CardContent>
        </Card>

      </div>
    </div>
  )
}

// Component ย่อยสำหรับ Card สถิติ
function StatCard({ title, value, sub, icon }: { title: string, value: number | string, sub: string, icon: any }) {
  return (
    <Card className="bg-[#1a1f29] border-white/5 text-white hover:border-primary/50 transition-colors shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-xs text-gray-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}