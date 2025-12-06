'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, User, Lock, Pen, UserPen, Mail, Camera, ShieldCheck, QrCode, Trash2, AlertTriangle, RefreshCcw, RotateCcw } from 'lucide-react'
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  
  const [loadingData, setLoadingData] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  // Data
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('') 
  const [newEmail, setNewEmail] = useState('') 
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // File Upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 2FA State
  const [factors, setFactors] = useState<any[]>([])
  const [enrollingData, setEnrollingData] = useState<any>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [loadingMFA, setLoadingMFA] = useState(false)
  const [fetchingMFA, setFetchingMFA] = useState(true) 

  // 1. Init Data
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setNewEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUsername(profile.username || '')
        setAvatarUrl(profile.avatar_url || '')
      }

      await fetchFactors()
      
      setLoadingData(false)
    }
    initData()
  }, [router])

  // ✅ แก้ไข: ใช้ data.all เพื่อดึงรายการที่ Pending (Unverified) มาด้วย
  const fetchFactors = async () => {
    setFetchingMFA(true)
    try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        
        // ดึงข้อมูลทั้งหมดจาก data.all แทน data.totp
        const allFactors = data.all || []
        
        // กรองเอาเฉพาะ type 'totp'
        const totpFactors = allFactors.filter((f: any) => f.factor_type === 'totp')

        const sorted = totpFactors.sort((a: any, b: any) => {
            // Verified ขึ้นก่อน
            if (a.status === 'verified' && b.status !== 'verified') return -1
            if (a.status !== 'verified' && b.status === 'verified') return 1
            return 0
        })
        setFactors(sorted)
    } catch (err) {
        console.error("Error fetching factors:", err)
    } finally {
        setFetchingMFA(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  // --- Profile Update Logic ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('comic-images').upload(fileName, avatarFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('comic-images').getPublicUrl(fileName)
        finalAvatarUrl = urlData.publicUrl
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', username, avatar_url: finalAvatarUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อย")
      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      router.refresh()
    } catch (error: any) {
      toast.error("บันทึกไม่สำเร็จ")
    } finally {
      setSavingProfile(false)
    }
  }

  // --- Password Update Logic ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || newPassword !== confirmPassword || newPassword.length < 6) {
        toast.error("กรุณาตรวจสอบข้อมูลรหัสผ่าน")
        return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, password: newPassword }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ!", { description: "กรุณาเข้าสู่ระบบใหม่" })
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error: any) {
      toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ")
    } finally {
      setSavingPassword(false)
    }
  }

  // --- Email Update Logic ---
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newEmail === email) return 
    setSavingEmail(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email: newEmail }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.info("ตรวจสอบอีเมล", { description: "ระบบได้ส่งลิงก์ยืนยันไปที่อีเมลใหม่และเก่าของคุณแล้ว" })
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
        setSavingEmail(false)
    }
  }

  // --- 2FA Logic ---
  
  const handleEnrollMFA = async () => {
    setLoadingMFA(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: username || email || 'My App User',
        issuer: 'HEEDOM881',
      })
      
      if (error) throw error
      setEnrollingData(data)
      
      // ดึงข้อมูลอีกครั้งเพื่อให้รายการ Pending ขึ้นมาแสดงทันที
      await fetchFactors()

    } catch (error: any) {
      if (error.message?.includes("already exists")) {
          toast.error("มีรายการ 2FA ค้างอยู่", {
            description: "กรุณาลบรายการ 'รอการยืนยัน' (สีเหลือง) ด้านล่างทิ้งก่อน แล้วลองใหม่ครับ"
          })
          // ดึงข้อมูลเพื่อให้เห็นรายการที่ค้าง
          await fetchFactors()
      } else {
          toast.error(error.message)
      }
    } finally {
      setLoadingMFA(false)
    }
  }

  const handleVerifyMFA = async () => {
    if (!verifyCode || !enrollingData) return
    setLoadingMFA(true)
    const code = verifyCode.replace(/\s/g, '') // ตัดช่องว่าง
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollingData.id,
        code: code
      })
      if (error) throw error

      toast.success("เปิดใช้งาน 2FA สำเร็จ!", {
        description: "บัญชีของคุณปลอดภัยขึ้นแล้ว"
      })
      
      setEnrollingData(null)
      setVerifyCode('')
      await fetchFactors()

    } catch (error: any) {
      console.error(error)
      toast.error("รหัสไม่ถูกต้อง หรือเกิดข้อผิดพลาด")
    } finally {
      setLoadingMFA(false)
    }
  }

  // ฟังก์ชันลบรายการเดียว (ใช้ Toast Confirm)
  const handleUnenrollMFA = (factorId: string) => {
    toast("ต้องการลบรายการ MFA นี้หรือไม่?", {
      description: "การกระทำนี้ไม่สามารถย้อนกลับได้",
      action: {
        label: "ลบเลย",
        onClick: () => confirmUnenroll(factorId),
      },
      cancel: {
        label: "ยกเลิก",
      },
      duration: 5000,
      position: "top-center",
    })
  }

  const confirmUnenroll = async (factorId: string) => {
    setLoadingMFA(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error

      toast.success("ลบรายการเรียบร้อยแล้ว")

      if (enrollingData?.id === factorId) {
        setEnrollingData(null)
        setVerifyCode("")
      }

      await fetchFactors()
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoadingMFA(false)
    }
  }

  // ✅ ฟังก์ชัน Reset All (เปลี่ยนมาใช้ Toast Confirm)
  const handleResetAllMFA = () => {
    toast("คำเตือน: ล้างค่า 2FA ทั้งหมด?", {
      description: "รายการทั้งหมดจะถูกลบ คุณต้องตั้งค่าใหม่หากต้องการใช้งาน",
      action: {
        label: "ยืนยันล้างข้อมูล",
        onClick: () => confirmResetAllMFA(),
      },
      cancel: {
        label: "ยกเลิก",
      },
      duration: 8000,
      position: "top-center",
    })
  }

  const confirmResetAllMFA = async () => {
    setLoadingMFA(true)
    try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error

        const allFactors = data.all || []

        if (allFactors.length === 0) {
            toast.info("ไม่พบรายการ 2FA ให้ลบ")
        } else {
            for (const factor of allFactors) {
                await supabase.auth.mfa.unenroll({ factorId: factor.id })
            }
            toast.success(`ล้างข้อมูลสำเร็จ (${allFactors.length} รายการ)`)
        }
        
        setFactors([])
        setEnrollingData(null)
        setVerifyCode('')
        await fetchFactors()

    } catch (error: any) {
        toast.error("เกิดข้อผิดพลาด: " + error.message)
    } finally {
        setLoadingMFA(false)
    }
  }

  const cancelEnroll = () => {
      setEnrollingData(null)
      setVerifyCode('')
  }

  if (loadingData) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>

  return (
    <div className="min-h-screen bg-[#0d1016] py-10 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">ตั้งค่าบัญชี</h1>
            <p className="text-gray-400 mt-1">จัดการข้อมูลส่วนตัวและความปลอดภัยของคุณ</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-[#1a1f29] p-1 rounded-xl border border-white/10 h-auto">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-black h-10"><User className="w-4 h-4 mr-2" /> โปรไฟล์</TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-black h-10"><Mail className="w-4 h-4 mr-2" /> บัญชี</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-black h-10"><ShieldCheck className="w-4 h-4 mr-2" /> ความปลอดภัย</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-white/10 bg-[#131720]">
              <CardHeader><CardTitle className="text-white">แก้ไขข้อมูลส่วนตัว</CardTitle><CardDescription className="text-gray-400">อัปเดตรูปโปรไฟล์และชื่อที่แสดง</CardDescription></CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                     <div className="relative group cursor-pointer">
                       <Avatar className="w-24 h-24 border-2 border-white/10 group-hover:border-primary/50 transition-all"><AvatarImage src={avatarPreview || avatarUrl} className="object-cover" /><AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                       <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-8 h-8 text-white" /></div>
                       <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer rounded-full" onChange={handleFileChange} />
                     </div>
                     <div className="flex-1 text-center sm:text-left"><Label className="text-base text-gray-200">รูปโปรไฟล์</Label><p className="text-xs text-gray-500 mt-1">คลิกที่รูปเพื่ออัปโหลดใหม่</p></div>
                  </div>
                  <div className="space-y-2"><Label className="text-gray-300">ชื่อผู้ใช้ (Username)</Label><Input className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="กรอกชื่อที่ต้องการแสดง" /></div>
                </CardContent>
                <CardFooter className="flex justify-end pt-6 border-t border-white/5"><Button type="submit" disabled={savingProfile} className="bg-primary text-white hover:bg-primary/90 font-bold min-w-[120px]">{savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPen className="mr-2 h-4 w-4" />}{savingProfile ? 'กำลังบันทึก...' : 'บันทึก'}</Button></CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card className="border-white/10 bg-[#131720]">
                <CardHeader><CardTitle className="text-white">จัดการอีเมล</CardTitle><CardDescription className="text-gray-400">อีเมลปัจจุบัน: <span className="text-white">{email}</span></CardDescription></CardHeader>
                <form onSubmit={handleUpdateEmail}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label className="text-gray-300">อีเมลใหม่</Label><Input type="email" className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /><p className="text-xs text-amber-500">* ระบบจะส่งลิงก์ยืนยันไปที่อีเมลใหม่และเก่า</p></div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-6 border-t border-white/5"><Button type="submit" disabled={savingEmail || newEmail === email} variant="secondary" className="min-w-[120px]">{savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} เปลี่ยนอีเมล</Button></CardFooter>
                </form>
            </Card>
            <Card className="border-white/10 bg-[#131720]">
              <CardHeader><CardTitle className="text-white">เปลี่ยนรหัสผ่าน</CardTitle><CardDescription className="text-gray-400">รักษาบัญชีของคุณให้ปลอดภัย</CardDescription></CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label className="text-gray-300">รหัสผ่านปัจจุบัน <span className="text-red-500">*</span></Label><Input type="password" className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
                  <div className="space-y-2"><Label className="text-gray-300">รหัสผ่านใหม่</Label><Input type="password" className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} /></div>
                  <div className="space-y-2"><Label className="text-gray-300">ยืนยันรหัสผ่านใหม่</Label><Input type="password" className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                </CardContent>
                <CardFooter className="flex justify-end pt-6 border-t border-white/5"><Button type="submit" variant="secondary" disabled={savingPassword || !newPassword}>{savingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังดำเนินการ...</> : <><Pen className="mr-2 h-4 w-4" /> เปลี่ยนรหัส</>}</Button></CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-white/10 bg-[#131720]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                Two-Factor Authentication (2FA)
                                {factors.some(f => f.status === 'verified') && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/50">เปิดใช้งานแล้ว</span>}
                            </CardTitle>
                            <CardDescription className="text-gray-400 mt-1">เพิ่มความปลอดภัยด้วย Google Authenticator</CardDescription>
                            <p className="text-[14px] text-amber-500 mt-2">*หากใส่รหัสแล้วรอนาน กรุณารีเฟรชหน้าเว็บใหม่</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchFactors} disabled={fetchingMFA} className="text-gray-400 hover:text-white">
                            <RefreshCcw className={`w-4 h-4 ${fetchingMFA ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Loading */}
                    {fetchingMFA && (
                        <div className="text-center py-10 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            กำลังโหลดข้อมูล...
                        </div>
                    )}

                    {/* Enroll Mode */}
                    {!fetchingMFA && enrollingData && (
                        <div className="bg-black/30 border border-primary/30 p-6 rounded-xl space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="bg-white p-2 rounded-lg shrink-0">
                                    <img src={enrollingData.totp.qr_code} alt="QR Code" width={150} height={150} className="block" />
                                </div>
                                <div className="space-y-2 text-center md:text-left">
                                    <h3 className="font-bold text-white text-lg">สแกน QR Code</h3>
                                    <p className="text-sm text-gray-400">ใช้แอป Authenticator สแกน QR Code นี้ หรือกรอกรหัส Secret Key ด้านล่าง</p>
                                    <div className="p-2 bg-black/50 border border-white/10 rounded text-xs font-mono text-primary break-all">
                                        {enrollingData.totp.secret}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <Label className="text-white mb-2 block">กรอกรหัส 6 หลักจากแอป</Label>
                                <div className="flex gap-2">
                                    <Input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="000 000" className="bg-black/20 border-white/10 text-white font-mono text-center tracking-widest text-lg" maxLength={6} />
                                    <Button onClick={handleVerifyMFA} disabled={loadingMFA || verifyCode.length < 6} className="bg-primary text-black font-bold">
                                        {loadingMFA ? <Loader2 className="animate-spin" /> : 'ยืนยัน'}
                                    </Button>
                                    <Button variant="ghost" onClick={cancelEnroll} className="text-gray-400 hover:text-white">ยกเลิก</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!fetchingMFA && !enrollingData && factors.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                            <ShieldCheck className="w-12 h-12 text-gray-500 mb-4" />
                            <h3 className="text-lg font-bold text-white">ยังไม่ได้เปิดใช้งาน 2FA</h3>
                            <p className="text-sm text-gray-400 text-center max-w-sm mb-6">
                                ปกป้องบัญชีของคุณด้วยการเพิ่มการยืนยันตัวตนอีกชั้น แนะนำให้เปิดใช้งานเพื่อความปลอดภัยสูงสุด
                            </p>
                            <Button onClick={handleEnrollMFA} disabled={loadingMFA} className="bg-primary text-black font-bold">
                                {loadingMFA ? <Loader2 className="mr-2 animate-spin" /> : <QrCode className="mr-2 w-4 h-4" />} ตั้งค่า 2FA ตอนนี้
                            </Button>
                        </div>
                    )}

                    {/* Active List */}
                    {!fetchingMFA && factors.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300">อุปกรณ์ / วิธีการยืนยันตัวตน</h3>
                            {factors.map((factor) => (
                                <div key={factor.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${factor.status === 'verified' ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${factor.status === 'verified' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                            {factor.status === 'verified' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{factor.friendly_name || 'Authenticator App'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${factor.status === 'verified' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                                                    {factor.status === 'verified' ? 'VERIFIED' : 'PENDING'}
                                                </span>
                                                {factor.status !== 'verified' && <span className="text-xs text-gray-500 hidden sm:inline">(สแกน QR ไม่สำเร็จ / ค้างอยู่)</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* เรียกฟังก์ชันลบแบบมี Confirm */}
                                        <Button variant="ghost" size="sm" onClick={() => handleUnenrollMFA(factor.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3">
                                            <Trash2 className="w-4 h-4 mr-2" /> ลบ
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            {/* ปุ่มเพิ่มใหม่ */}
                            {!enrollingData && (
                                <div className="pt-4 border-t border-white/10">
                                    <Button variant="outline" size="sm" onClick={handleEnrollMFA} className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 w-full sm:w-auto">
                                        <QrCode className="mr-2 w-4 h-4" /> เพิ่มอุปกรณ์ใหม่
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ปุ่ม Reset All (Toast Confirm) */}
                    {!fetchingMFA && (
                        <div className="mt-8 pt-8 border-t border-white/5">
                             <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">โซนอันตราย</h4>
                             <Button variant="Default" size="sm" onClick={handleResetAllMFA} disabled={loadingMFA} className="w-full sm:w-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">
                                {loadingMFA ? <Loader2 className="mr-2 animate-spin" /> : <RotateCcw className="mr-2 w-4 h-4" />}
                                ล้างค่า 2FA ทั้งหมด (Reset)
                             </Button>
                             <p className="text-[10px] text-gray-600 mt-2">
                                กดปุ่มนี้หากคุณพบปัญหารายการค้าง หรือไม่สามารถเพิ่มอุปกรณ์ใหม่ได้
                             </p>
                        </div>
                    )}

                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}