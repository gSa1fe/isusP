// src/app/api/topup/[id]/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET - ดูรายละเอียด topup request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - ยกเลิก topup request (เฉพาะ pending เท่านั้น)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ดึงข้อมูล request ก่อน
    const { data: existingRequest, error: fetchError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })
    }

    // เช็คว่าเป็น pending ไหม
    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'ไม่สามารถยกเลิกรายการที่ดำเนินการไปแล้วได้' 
      }, { status: 400 })
    }

    // อัปเดตสถานะเป็น cancelled
    const { data, error } = await supabase
      .from('topup_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'ยกเลิกคำขอสำเร็จ', 
      data 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}