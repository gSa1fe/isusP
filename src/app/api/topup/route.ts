// src/app/api/topup/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation Schema
const createTopupSchema = z.object({
  amount: z.number().min(1, 'จำนวนเงินต้องมากกว่า 0'),
  coins_amount: z.number().min(1, 'จำนวน Coins ต้องมากกว่า 0'),
  slip_image_url: z.string().url().optional().or(z.literal('')),
  transfer_reference: z.string().optional(),
  transfer_datetime: z.string().optional(),
})

// GET - ดึงรายการ topup requests ของ user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  try {
    // ตรวจสอบ user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('topup_requests')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - สร้าง topup request ใหม่
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // ตรวจสอบ user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate
    const validation = createTopupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ถูกต้อง', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    const { amount, coins_amount, slip_image_url, transfer_reference, transfer_datetime } = validation.data

    // เช็คว่ามี pending requests เกิน 5 อันไหม
    const { count: pendingCount } = await supabase
      .from('topup_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (pendingCount && pendingCount >= 5) {
      return NextResponse.json({ 
        error: 'คุณมีคำขอที่รอดำเนินการอยู่ครบ 5 รายการแล้ว กรุณารอให้ Admin ตรวจสอบก่อน' 
      }, { status: 400 })
    }

    // สร้าง topup request
    const { data, error } = await supabase
      .from('topup_requests')
      .insert({
        user_id: user.id,
        amount,
        coins_amount,
        slip_image_url: slip_image_url || null,
        transfer_reference: transfer_reference || null,
        transfer_datetime: transfer_datetime || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'สร้างคำขอเติมเงินสำเร็จ', 
      data 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}