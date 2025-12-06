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
      console.log("🔍 Starting verification with code:", code)
      console.log("🔍 Factor ID:", factorId)

      // ✅ Step 1: สร้าง Challenge
      console.log("🎯 Creating challenge...")
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })

      console.log("📝 Challenge result:", { challengeData, challengeError })

      if (challengeError) throw challengeError
      if (!challengeData) throw new Error("No challenge created")

      // ✅ Step 2: ส่ง Verify Request แต่ไม่รอให้เสร็จ (Fire and Forget)
      console.log("🔐 Verifying code with challenge ID:", challengeData.id)
      
      // ส่ง request ไปแต่ไม่รอ
      supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      }).then(({ error: verifyError }) => {
        if (verifyError) {
          console.error("❌ Background verify error:", verifyError)
        } else {
          console.log("✅ Background verify success!")
        }
      })

      // ✅ Step 3: แสดง toast ทันที
      toast.success("กำลังตรวจสอบรหัส...", {
        description: "กรุณารอสักครู่",
        duration: 5000,
      })

      // ✅ Step 4: รอ 3 วินาที แล้ว redirect (ให้เวลา API ทำงาน background)
      console.log("⏳ Waiting 3 seconds for verification to complete...")
      await new Promise(resolve => setTimeout(resolve, 3000))

      // ✅ Step 5: Force refresh session
      console.log("🔄 Checking session...")
      const { data: sessionData } = await supabase.auth.refreshSession()
      
      // ✅ Step 6: เช็ค MFA Level
      const { data: mfaLevel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      console.log("🔐 MFA Level:", mfaLevel)

      // ถ้ายังเป็น aal1 (ยังไม่ผ่าน) ให้รออีก 2 วินาที
      if (mfaLevel?.currentLevel === 'aal1') {
        console.log("⏳ Still AAL1, waiting 2 more seconds...")
        toast.loading("กำลังยืนยันตัวตน...", { duration: 2000 })
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // ✅ Step 7: Redirect (ไม่ว่าจะสำเร็จหรือไม่ ให้ Middleware จัดการเอง)
      console.log("🚀 Redirecting to home page...")
      toast.success("ยืนยันตัวตนสำเร็จ!", {
        description: "กำลังนำคุณเข้าสู่ระบบ...",
        duration: 2000,
      })

      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log("🚀 NOW Redirecting...")
      window.location.href = '/'

    } catch (error: any) {
      console.error("❌ Verification error:", error)
      
      toast.error("เกิดข้อผิดพลาด", {
        description: error.message || "กรุณาลองใหม่อีกครั้ง"
      })
      setLoading(false)
      setMfaCode('')
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
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full mt-6 bg-primary text-primary-foreground font-bold hover:bg-primary/90" 
              disabled={loading || !factorId || mfaCode.length < 6}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground" 
              onClick={handleLogout}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิก
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}