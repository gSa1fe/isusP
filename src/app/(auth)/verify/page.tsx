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

      // ✅ หา factor ที่ verified แล้วเท่านั้น
      const totp = factors.all?.find(f => f.factor_type === 'totp' && f.status === 'verified')

      if (totp) {
        setFactorId(totp.id)
      } else {
        toast.error("ไม่พบตัวเลือก 2FA ที่ยืนยันแล้ว")
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

    console.log("🔍 Starting verification...")
    console.log("Factor ID:", factorId)
    console.log("Code:", code)

    try {
      // ✅ Step 1: สร้าง Challenge
      console.log("Step 1: Creating challenge...")
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })

      if (challengeError) {
        console.error("❌ Challenge error:", challengeError)
        throw challengeError
      }
      
      if (!challengeData) {
        throw new Error("No challenge created")
      }
      
      console.log("✅ Challenge created:", challengeData.id)

      // ✅ Step 2: Verify (รอผลลัพธ์จริง)
      console.log("Step 2: Verifying code...")
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      })

      if (verifyError) {
        console.error("❌ Verify error:", verifyError)
        throw verifyError
      }

      console.log("✅ Verification successful!")

      // ✅ Step 3: Refresh session
      console.log("Step 3: Refreshing session...")
      const { error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.warn("Session refresh warning:", refreshError)
      }

      // ✅ Step 4: ตรวจสอบ MFA level
      const { data: mfaLevel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      console.log("🔐 MFA Level after verify:", mfaLevel)

      toast.success("ยืนยันตัวตนสำเร็จ!", {
        description: "กำลังนำคุณเข้าสู่ระบบ...",
      })

      // ✅ Step 5: Redirect ทันที
      console.log("🚀 Redirecting to home...")
      window.location.href = '/'

    } catch (error: any) {
      console.error("❌ Full verification error:", error)
      
      let errorMessage = "กรุณาลองใหม่อีกครั้ง"
      if (error.message?.includes("Invalid")) {
        errorMessage = "รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่"
      } else if (error.message?.includes("expired")) {
        errorMessage = "รหัสหมดอายุแล้ว กรุณาใช้รหัสใหม่จากแอป"
      }
      
      toast.error("ยืนยันไม่สำเร็จ", {
        description: errorMessage
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
                placeholder="000000" 
                className="bg-secondary/50 mt-2 text-center text-2xl tracking-[0.5em] font-mono h-14 text-foreground"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-center text-muted-foreground mt-2">
                รหัสจะเปลี่ยนทุก 30 วินาที
              </p>
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