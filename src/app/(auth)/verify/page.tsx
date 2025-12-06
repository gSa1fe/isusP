'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function VerifyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)

  // 1. โหลดหน้ามาปุ๊บ หา Factor ID รอไว้เลย
  useEffect(() => {
    const getFactor = async () => {
  const { data: factors, error } = await supabase.auth.mfa.listFactors()
  
  if (error) {
    toast.error(error.message)
    return
  }

  console.log("FACTOR:", factors.all)

  const totp = factors.all?.find(f => f.factor_type === 'totp')

  if (totp) {
    setFactorId(totp.id)
  } else {
    toast.error("ไม่พบตัวเลือก 2FA")
    router.push('/login')
  }
}

    getFactor()
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!factorId) return

  setLoading(true)
  const code = mfaCode.replace(/\s/g, '')

  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (error) throw error

    // 🔥 Refresh session หลัง Verify (จำเป็นมาก)
    await supabase.auth.getSession()

    toast.success("ยืนยันตัวตนสำเร็จ!")

    // 🔥 ให้ toast แสดงทันก่อน redirect ช่วย delay 300ms
    setTimeout(() => {
      router.replace('/')
    }, 300)

  } catch (error: any) {
    console.error(error)
    toast.error("รหัสไม่ถูกต้อง กรุณาลองใหม่")
    setLoading(false)
  }
}


  const handleLogout = async () => {
      await supabase.auth.signOut()
      router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card animate-in fade-in zoom-in-95">
        <CardHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-foreground">ยืนยันตัวตน 2 ชั้น</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
                กรุณากรอกรหัส 6 หลักจากแอป Authenticator
            </CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-center block text-foreground/80">รหัสยืนยัน (Code)</Label>
                    <Input 
                        type="text" 
                        placeholder="000 000" 
                        className="bg-secondary/50 mt-2 text-center text-2xl tracking-[0.5em] font-mono h-14 text-foreground"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        maxLength={7}
                        autoFocus
                    />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full mt-6 bg-primary text-primary-foreground font-bold hover:bg-primary/90" disabled={loading || !factorId}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'ยืนยัน'}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิก
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  )
}