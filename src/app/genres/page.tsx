'use client'

import Link from 'next/link'
import { BookOpen, Compass, Sword, Heart, Ghost, Smile, Zap, Search } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

// รายการหมวดหมู่ (ภาษาไทย)
const GENRES = [
    { name: 'แอ็คชั่น', icon: Sword, color: 'from-red-500 to-orange-500' },
    { name: 'โรแมนติก', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { name: 'แฟนตาซี', icon: Zap, color: 'from-purple-500 to-indigo-500' },
    { name: 'ดราม่า', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
    { name: 'ตลก', icon: Smile, color: 'from-yellow-400 to-orange-400' },
    { name: 'สยองขวัญ', icon: Ghost, color: 'from-gray-700 to-black' },
    { name: 'ผจญภัย', icon: Compass, color: 'from-green-500 to-emerald-500' },
    { name: 'ระทึกขวัญ', color: 'from-slate-600 to-slate-800' },
    { name: 'ชีวิตประจำวัน', color: 'from-teal-400 to-teal-600' },
    { name: 'ไซไฟ', color: 'from-indigo-600 to-blue-800' },
    { name: 'ลึกลับ', color: 'from-violet-600 to-purple-800' },
    { name: 'กีฬา', color: 'from-orange-400 to-red-500' },
    { name: 'ต่างโลก', color: 'from-sky-400 to-blue-600' },
    { name: 'ฮาเร็ม', color: 'from-pink-400 to-red-400' },
    { name: 'โรงเรียน', color: 'from-emerald-400 to-green-600' },
    { name: 'สืบสวน', color: 'from-indigo-500 to-indigo-700' },
    { name: 'ย้อนยุค', color: 'from-amber-500 to-yellow-700' },
    { name: 'ระบบ', color: 'from-cyan-500 to-blue-700' },
    { name: 'ผู้หวนคืน', color: 'from-rose-500 to-pink-700' },
    { name: 'เกิดใหม่', color: 'from-lime-500 to-green-700' },

]

export default function GenresPage() {
    return (
        <div className="min-h-screen bg-[#0d1016] text-white pt-8 pb-20">
            <div className="container mx-auto px-4 max-w-5xl">

                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-12 font-black tracking-tight bg-gradient-to-r from-primary via-white to-primary bg-clip-text text-transparent animate-gradient">
                        หมวดหมู่การ์ตูน
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        ค้นพบเรื่องราวที่คุณชื่นชอบจากหลากหลายรสชาติที่เราคัดสรรมาให้
                    </p>

                    {/* Search Bar Shortcut */}
                    <div className="flex justify-center mt-6">
                        <Link href="/search" className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group">
                            <Search className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="text-gray-300 group-hover:text-white">ค้นหาขั้นสูง</span>
                        </Link>
                    </div>
                </div>

                {/* Genres Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {GENRES.map((genre) => {
                        const Icon = genre.icon || BookOpen // ถ้าไม่มีไอคอนให้ใช้รูปสมุด
                        return (
                            <Link
                                key={genre.name}
                                href={`/search?genre=${encodeURIComponent(genre.name)}`}
                                className="group block"
                            >
                                <Card className="border-0 bg-[#1a1f29] hover:bg-[#252b36] transition-all duration-300 overflow-hidden relative h-32 hover:-translate-y-1 hover:shadow-xl group">
                                    <CardContent className="p-0 h-full flex flex-col items-center justify-center relative z-10">
                                        <div className={`p-3 rounded-full mb-2 bg-gradient-to-br ${genre.color} bg-opacity-20`}>
                                            <Icon className="w-6 h-6 text-white drop-shadow-md" />
                                        </div>
                                        <span className="font-bold text-lg text-gray-200 group-hover:text-white transition-colors">
                                            {genre.name}
                                        </span>
                                    </CardContent>

                                    {/* Background Glow Effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                                    <div className={`absolute -bottom-10 -right-10 w-24 h-24 bg-gradient-to-br ${genre.color} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                                </Card>
                            </Link>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}