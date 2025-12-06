// src/app/api/topup/settings/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET - ดึง payment settings (PromptPay, rates, etc.)
export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('key, value, description')

    if (error) throw error

    // แปลงเป็น object ให้ใช้งานง่าย
    const settings: Record<string, string> = {}
    data?.forEach((item: any) => {
      settings[item.key] = item.value
    })

    return NextResponse.json({ settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}