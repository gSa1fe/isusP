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
import { Loader2, User, Lock, Pen, UserPen, Mail, Camera } from 'lucide-react'
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

  // Provider info
  const [authProvider, setAuthProvider] = useState<string | null>(null)

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
      
      // เช็คว่า login มาจาก OAuth หรือ Email
      const provider = user.app_metadata?.provider
      setAuthProvider(provider || 'email')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUsername(profile.username || '')
        setAvatarUrl(profile.avatar_url || '')
      }
      
      setLoadingData(false)
    }
    initData()
  }, [router])

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

  if (loadingData) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>

  return (
    <div className="min-h-screen bg-[#0d1016] py-10 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">ตั้งค่าบัญชี</h1>
            <p className="text-gray-400 mt-1">จัดการข้อมูลส่วนตัวและความปลอดภัยของคุณ</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#1a1f29] p-1 rounded-xl border border-white/10 h-auto">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-black h-10"><User className="w-4 h-4 mr-2" /> โปรไฟล์</TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-black h-10"><Mail className="w-4 h-4 mr-2" /> บัญชี</TabsTrigger>
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
            {/* OAuth Provider Notice */}
            {authProvider && authProvider !== 'email' && (
              <Card className="border-blue-500/30 bg-blue-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">บัญชีเชื่อมต่อกับ Google</p>
                      <p className="text-xs text-gray-400">คุณสามารถเข้าสู่ระบบด้วย Google ได้โดยไม่ต้องใช้รหัสผ่าน</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/10 bg-[#131720]">
                <CardHeader><CardTitle className="text-white">จัดการอีเมล</CardTitle><CardDescription className="text-gray-400">อีเมลปัจจุบัน: <span className="text-white">{email}</span></CardDescription></CardHeader>
                <form onSubmit={handleUpdateEmail}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label className="text-gray-300">อีเมลใหม่</Label><Input type="email" className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /><p className="text-xs text-amber-500">* ระบบจะส่งลิงก์ยืนยันไปที่อีเมลใหม่และเก่า</p></div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-6 border-t border-white/5"><Button type="submit" disabled={savingEmail || newEmail === email} variant="secondary" className="min-w-[120px]">{savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} เปลี่ยนอีเมล</Button></CardFooter>
                </form>
            </Card>
            
            {/* แสดงส่วนเปลี่ยนรหัสผ่านเฉพาะ user ที่ login ด้วย email */}
            {authProvider === 'email' && (
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}