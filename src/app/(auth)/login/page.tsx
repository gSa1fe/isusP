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
import { Loader2, ShieldCheck, ArrowLeft, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Login State
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // 2FA State
  const [showMFA, setShowMFA] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)

  // 1. Login ชั้นแรก
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      // เช็ค 2FA
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (mfaError) throw mfaError

      // ถ้าต้องทำ 2FA (AAL2)
      if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        const allFactors = factorsData.all || []
        const totpFactor = allFactors.find(f => f.factor_type === 'totp' && f.status === 'verified')

        if (totpFactor) {
            setFactorId(totpFactor.id)
            setShowMFA(true) 
            setLoading(false)
            toast.info("กรุณากรอกรหัส 2FA 6 หลัก")
            return 
        } else {
            await supabase.auth.signOut()
            throw new Error("บัญชีนี้เปิด 2FA แต่ไม่พบอุปกรณ์ยืนยันตัวตน")
        }
      }

      // ถ้าไม่ต้องทำ 2FA
      toast.success("เข้าสู่ระบบสำเร็จ!")
      window.location.href = '/'

    } catch (err: any) {
      toast.error(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
      setLoading(false)
    }
  }

  // 2. ยืนยันรหัส 2FA (🔥 จุดที่แก้: เรียก API เพื่อ Sync Cookie)
  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    
    setLoading(true)
    const code = mfaCode.replace(/\s/g, '')

    try {
        // 2.1 ยืนยันกับ Supabase Client ก่อน
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({
            factorId,
            code
        })

        if (error) throw error

        // ✅ 2.2 ส่ง Session ใหม่ไปให้ Server บันทึก Cookie ทันที (แก้ปัญหา Middleware มึน)
        if (data.session) {
            const res = await fetch('/api/auth/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session: data.session })
            })
            
            if (!res.ok) {
                console.error('Failed to update server session')
                // ไม่ throw error เพราะ Client ผ่านแล้ว แค่ Server อาจจะช้า
            }
        }

        // ✅ 2.3 แจ้งเตือนสำเร็จ
        toast.success("ยืนยันตัวตนสำเร็จ! กำลังเข้าสู่ระบบ...", { duration: 2000 })
        
        // ✅ 2.4 รอสักนิดแล้ว Reload (ตอนนี้ Server มี Cookie ใหม่แล้ว ผ่านฉลุย)
        setTimeout(() => {
            window.location.href = '/'
        }, 1000)

    } catch (error: any) {
        toast.error("รหัส 2FA ไม่ถูกต้อง กรุณาลองใหม่")
        setLoading(false)
    }
  }

  if (showMFA) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md border-border bg-card animate-in fade-in zoom-in-95">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-foreground">ยืนยันตัวตน 2 ชั้น</CardTitle>
                    <CardDescription className="text-center text-muted-foreground">
                        ระบบตรวจพบว่าคุณเปิดใช้งาน 2FA<br/>กรุณากรอกรหัส 6 หลักจากแอป Authenticator
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleVerifyMFA}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-center block text-foreground/80">รหัสยืนยัน (Code)</Label>
                            <Input 
                                type="text" 
                                placeholder="000 000" 
                                className="bg-secondary/50 text-center text-2xl tracking-[0.5em] font-mono h-14 text-foreground"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                maxLength={7}
                                autoFocus
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button type="submit" className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            ยืนยัน
                        </Button>
                        <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={async () => {
                            setShowMFA(false)
                            setLoading(false)
                            await supabase.auth.signOut()
                            window.location.href = '/login'
                        }}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิก
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            ยินดีต้อนรับกลับ
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            เข้าสู่ระบบเพื่ออ่านการ์ตูนเรื่องโปรด
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="pl-10 bg-secondary/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="password"
                    type="password"
                    placeholder="รหัสผ่านของคุณ"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pl-10 bg-secondary/50"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full bg-primary mt-4 hover:bg-primary/90 text-primary-foreground font-bold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              ยังไม่มีบัญชี?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                สมัครสมาชิก
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}