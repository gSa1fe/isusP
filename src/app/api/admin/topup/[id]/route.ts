// src/app/api/admin/topup/[id]/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Admin ดูรายละเอียด topup request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    // ตรวจสอบ Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('topup_requests')
      .select(`
        *,
        profiles!topup_requests_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('id', id)
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

// POST - Admin อนุมัติ/ปฏิเสธ topup request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    // ตรวจสอบ Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, reject_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // ดึงข้อมูล request
    const { data: existingRequest, error: fetchError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'รายการนี้ถูกดำเนินการไปแล้ว' 
      }, { status: 400 })
    }

    if (action === 'approve') {
      // เรียก function add_coins_from_topup
      const { data, error } = await supabase.rpc('add_coins_from_topup', {
        p_topup_id: id,
        p_admin_id: user.id
      })

      if (error) throw error

      return NextResponse.json({ 
        message: 'อนุมัติสำเร็จ เพิ่ม Coins เรียบร้อย',
        data
      })
    } else {
      // Reject
      if (!reject_reason) {
        return NextResponse.json({ 
          error: 'กรุณาระบุเหตุผลในการปฏิเสธ' 
        }, { status: 400 })
      }

      const { data, error } = await supabase.rpc('reject_topup_request', {
        p_topup_id: id,
        p_admin_id: user.id,
        p_reason: reject_reason
      })

      if (error) throw error

      return NextResponse.json({ 
        message: 'ปฏิเสธคำขอเรียบร้อย',
        data
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}