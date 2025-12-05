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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, LogOut, Camera, User, Lock, Pen, UserPen, Mail } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  
  const [loadingData, setLoadingData] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  // Data
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('') // อีเมลปัจจุบัน
  const [newEmail, setNewEmail] = useState('') // อีเมลใหม่ที่จะเปลี่ยน
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // File Upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 1. Init Data
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setNewEmail(user.email || '') // ตั้งค่าเริ่มต้นให้ input

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

  // ฟังก์ชันเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  // 2. Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setSavingProfile(true)

    try {
      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('comic-images')
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('comic-images')
          .getPublicUrl(fileName)
        
        finalAvatarUrl = urlData.publicUrl
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'profile',
          username, 
          avatar_url: finalAvatarUrl 
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMsg({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว!' })
      
      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      router.refresh()

    } catch (error: any) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setSavingProfile(false)
    }
  }

  // 3. Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    
    if (newPassword !== confirmPassword) {
        setMsg({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' })
        return
    }

    setSavingPassword(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'password',
          password: newPassword 
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert("✅ เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่")
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/login'

    } catch (error: any) {
      setMsg({ type: 'error', text: `เกิดข้อผิดพลาด: ${error.message}` })
      setSavingPassword(false)
    }
  }

  // 4. Update Email (ฟังก์ชันใหม่)
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (newEmail === email) return // ไม่เปลี่ยนถ้าเหมือนเดิม

    setSavingEmail(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'email',
          email: newEmail 
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert("📧 ระบบได้ส่งลิงก์ยืนยันไปที่อีเมลใหม่ (และอีเมลเก่า) ของคุณแล้ว\nกรุณาตรวจสอบและกดยืนยันทั้ง 2 ฉบับเพื่อเปลี่ยนอีเมลให้สมบูรณ์")
      
    } catch (error: any) {
      setMsg({ type: 'error', text: `เกิดข้อผิดพลาด: ${error.message}` })
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

        {msg && (
          <Alert variant={msg.type === 'error' ? 'destructive' : 'default'} className={`mb-6 border ${msg.type === 'success' ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-red-500/50 bg-red-500/10 text-red-400'}`}>
            <AlertDescription>{msg.text}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#1a1f29] p-1 rounded-xl border border-white/10 h-auto">
            <TabsTrigger 
              value="profile" 
              className="rounded-lg transition-all border-0 shadow-none data-[state=active]:shadow-none data-[state=active]:bg-primary data-[state=active]:text-black h-10"
            >
                <User className="w-4 h-4 mr-2" /> โปรไฟล์
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              className="rounded-lg transition-all border-0 shadow-none data-[state=active]:shadow-none data-[state=active]:bg-primary data-[state=active]:text-black h-10"
            >
                <Lock className="w-4 h-4 mr-2" /> ความปลอดภัย
            </TabsTrigger>
          </TabsList>

          {/* === Tab: Profile === */}
          <TabsContent value="profile">
            <Card className="border-white/10 bg-[#131720]">
              <CardHeader>
                <CardTitle className="text-white">แก้ไขข้อมูลส่วนตัว</CardTitle>
                <CardDescription className="text-gray-400">อัปเดตรูปโปรไฟล์และชื่อที่แสดง</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-8">
                  
                  {/* Avatar Upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                     <div className="relative group cursor-pointer">
                       <Avatar className="w-24 h-24 border-2 border-white/10 group-hover:border-primary/50 transition-all">
                          <AvatarImage src={avatarPreview || avatarUrl} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                              {username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                       </Avatar>
                       <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-8 h-8 text-white" />
                       </div>
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="absolute inset-0 opacity-0 cursor-pointer rounded-full" 
                         onChange={handleFileChange}
                       />
                     </div>
                     <div className="flex-1 text-center sm:text-left">
                        <Label className="text-base text-gray-200">รูปโปรไฟล์</Label>
                        <p className="text-xs text-gray-500 mt-1">คลิกที่รูปเพื่ออัปโหลดใหม่</p>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">ชื่อผู้ใช้ (Username)</Label>
                    <Input 
                        className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder="กรอกชื่อที่ต้องการแสดง"
                    />
                  </div>

                </CardContent>
                <CardFooter className="flex justify-end pt-6 border-t border-white/5">
                  <Button type="submit" disabled={savingProfile} className="bg-primary text-white hover:bg-primary/90 font-bold min-w-[120px]">
                    {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPen className="mr-2 h-4 w-4" />}
                    {savingProfile ? 'กำลังบันทึก...' : 'บันทึก'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* === Tab: Account (Email & Password) === */}
          <TabsContent value="account" className="space-y-6">
            
            {/* 1. จัดการอีเมล */}
            <Card className="border-white/10 bg-[#131720]">
                <CardHeader>
                    <CardTitle className="text-white">จัดการอีเมล</CardTitle>
                    <CardDescription className="text-gray-400">อีเมลปัจจุบัน: <span className="text-white">{email}</span></CardDescription>
                </CardHeader>
                <form onSubmit={handleUpdateEmail}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">อีเมลใหม่</Label>
                            <Input 
                                type="email"
                                className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)} 
                            />
                            <p className="text-xs text-yellow-500/80">* ระบบจะส่งลิงก์ยืนยันไปที่อีเมลใหม่และเก่า</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-6 border-t border-white/5">
                        <Button 
                            type="submit" 
                            disabled={savingEmail || newEmail === email} 
                            variant="secondary"
                            className="min-w-[120px]"
                        >
                            {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            เปลี่ยนอีเมล
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* 2. เปลี่ยนรหัสผ่าน */}
            <Card className="border-white/10 bg-[#131720]">
              <CardHeader>
                <CardTitle className="text-white">เปลี่ยนรหัสผ่าน</CardTitle>
                <CardDescription className="text-gray-400">รักษาบัญชีของคุณให้ปลอดภัย</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">รหัสผ่านใหม่</Label>
                    <Input 
                        type="password" 
                        className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        minLength={6} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">ยืนยันรหัสผ่านใหม่</Label>
                    <Input 
                        type="password" 
                        className="bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-6 border-t border-white/5">
                  <Button 
                    type="submit" 
                    variant="secondary"
                    disabled={savingPassword || !newPassword} 
                    
                  >
                    {savingPassword ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังดำเนินการ...</>
                    ) : (
                      <><Pen className="mr-2 h-4 w-4" /> เปลี่ยนรหัส</>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}