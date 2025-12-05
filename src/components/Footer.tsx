import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 text-gray-400 pt-16 pb-8">
      <div className="container mx-auto px-4">
        
        {/* Top Section: Grid Layout (ปรับเป็น 3 คอลัมน์เพื่อให้สมดุล) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-12">
          
          {/* Col 1: Brand & About (โลโก้และโซเชียล) */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white tracking-tighter">
              HEEDOM881
            </h2>
            <p className="text-sm leading-relaxed max-w-xs">
              แพลตฟอร์มอ่านการ์ตูนออนไลน์ที่รวบรวมความสนุกจากทั่วทุกมุมโลก 
              อ่านฟรี คุณภาพสูง อัปเดตไวทันใจ พร้อมชุมชนนักอ่านที่อบอุ่น
            </p>
            <div className="flex gap-4 pt-2">
              <SocialIcon icon={Facebook} href="#" />
              <SocialIcon icon={Twitter} href="#" />
              <SocialIcon icon={Instagram} href="#" />
              <SocialIcon icon={Youtube} href="#" />
            </div>
          </div>

          {/* Col 2: Quick Links (เมนูลัด - เพิ่มมาเพื่อให้ Footer ไม่โล่งเกินไป) */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">เมนูแนะนำ</h3>
            <ul className="space-y-2 text-sm">
              <li><FooterLink href="/">หน้าหลัก</FooterLink></li>
              <li><FooterLink href="/search?sort=newest">มาใหม่ล่าสุด</FooterLink></li>
              <li><FooterLink href="/genres">หมวดหมู่ทั้งหมด</FooterLink></li>
              <li><FooterLink href="/search?status=Completed">เรื่องที่จบแล้ว</FooterLink></li>
            </ul>
          </div>

          {/* Col 3: Support (ช่วยเหลือ) */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">ช่วยเหลือ</h3>
            <ul className="space-y-2 text-sm">
              <li><FooterLink href="/faq">คำถามที่พบบ่อย</FooterLink></li>
              <li><FooterLink href="/contact">ติดต่อเรา</FooterLink></li>
              <li><FooterLink href="/terms">ข้อตกลงการใช้งาน</FooterLink></li>
              <li><FooterLink href="/privacy">นโยบายความเป็นส่วนตัว</FooterLink></li>
            </ul>
            
            
          </div>

        </div>

        {/* Bottom Section: Copyright (ส่วนลิขสิทธิ์) */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} HEEDOM881. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}

// Helper Component: Link
function FooterLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-primary transition-colors hover:translate-x-1 inline-block duration-200">
      {children}
    </Link>
  )
}

// Helper Component: Social Icon
function SocialIcon({ icon: Icon, href }: { icon: any, href: string }) {
  return (
    <Link href={href} className="p-2 bg-white/5 rounded-full hover:bg-primary hover:text-black transition-all duration-300">
      <Icon className="w-4 h-4" />
    </Link>
  )
}