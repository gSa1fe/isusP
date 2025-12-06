'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. เช็ค username ซ้ำก่อนสมัคร
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username)
        .maybeSingle()

      if (existingUser) {
        throw new Error("Username นี้ถูกใช้แล้ว กรุณาใช้ชื่ออื่น")
      }

      // 2. สมัครสมาชิก
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.username,
            username: formData.username
          }
        }
      })

      // 3. เช็คอีเมลซ้ำ
      if (signUpError) {
        if (signUpError.message.includes("registered")) {
          throw new Error("อีเมลนี้ถูกใช้แล้ว กรุณาใช้เมลอื่น")
        }
        throw signUpError
      }

      // 4. สมัครสำเร็จ
      if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        toast.success("กรุณาเช็คอีเมลเพื่อยืนยันตัวตน!")
      }

    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด", { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">สร้างบัญชีใหม่</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            กรอกข้อมูลเพื่อเริ่มต้นใช้งาน
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="ตั้งชื่อผู้ใช้ของคุณ" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
                className="bg-secondary/50"
              />
            </div>

            <Button 
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center text-muted-foreground">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              เข้าสู่ระบบ
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}