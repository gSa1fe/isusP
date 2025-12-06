// src/app/api/topup/packages/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET - ดึง coin packages ที่ active
export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}