'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Send, Megaphone } from 'lucide-react'

export default function AnnouncePage() {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !message) return

    if (!confirm('ยืนยันที่จะส่งประกาศหา "ทุกคน" ในระบบ?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, link })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert(`✅ ส่งประกาศสำเร็จ! (${data.message})`)
      // เคลียร์ฟอร์ม
      setTitle('')
      setMessage('')
      setLink('')

    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-primary" /> ส่งประกาศ
        </h1>
        <p className="text-gray-400">ส่งข้อความแจ้งเตือนหา User ทุกคนในระบบ</p>
      </div>

      <Card className="bg-[#131720] border-white/10">
        <CardHeader>
            <CardTitle className="text-white">รายละเอียดประกาศ</CardTitle>
            <CardDescription>ข้อความนี้จะไปปรากฏที่กระดิ่งแจ้งเตือนของทุกคน</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-gray-300">หัวข้อเรื่อง <span className="text-red-500">*</span></Label>
                    <Input 
                        placeholder="เช่น ประกาศปิดปรับปรุงระบบ, แจ้งโปรโมชั่น" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="bg-black/20 border-white/10 text-white"
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-300">ข้อความ <span className="text-red-500">*</span></Label>
                    <Textarea 
                        placeholder="รายละเอียดเพิ่มเติม..." 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="bg-black/20 border-white/10 text-white min-h-[120px]"
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-300">ลิงก์แนบ (Optional)</Label>
                    <Input 
                        placeholder="เช่น /comic/..., https://..." 
                        value={link}
                        onChange={e => setLink(e.target.value)}
                        className="bg-black/20 border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-500">ถ้าใส่ลิงก์ เมื่อ User กดที่แจ้งเตือนจะเด้งไปหน้านั้น</p>
                </div>

                <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading} className="bg-primary text-black hover:bg-primary/90 font-bold min-w-[150px]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        ส่งประกาศ
                    </Button>
                </div>
            </form>
        </CardContent>
      </Card>
    </div>
  )
}