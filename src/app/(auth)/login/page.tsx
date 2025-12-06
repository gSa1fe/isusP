'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      // เช็คว่าต้องไปต่อหน้า 2FA หรือไม่?
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      
      if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        // 🔥 เจอ 2FA -> ส่งไปหน้า Verify
        toast.info("กรุณายืนยันตัวตน 2FA")
        router.push('/verify')
      } else {
        // ✅ ผ่านฉลุย -> ไปหน้าแรก
        toast.success("เข้าสู่ระบบสำเร็จ!")
        router.refresh()
        router.push('/')
      }

    } catch (err: any) {
      toast.error(err.message || "เข้าสู่ระบบไม่สำเร็จ")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">ยินดีต้อนรับกลับ</CardTitle>
          <CardDescription className="text-center text-muted-foreground">เข้าสู่ระบบเพื่ออ่านการ์ตูนเรื่องโปรด</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="pl-10 bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="รหัสผ่านของคุณ" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="pl-10 bg-secondary/50" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full bg-primary mt-6 hover:bg-primary/90 text-primary-foreground font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'เข้าสู่ระบบ'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              ยังไม่มีบัญชี? <Link href="/signup" className="text-primary hover:underline font-medium">สมัครสมาชิก</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}