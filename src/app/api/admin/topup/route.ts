// src/app/api/admin/topup/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Admin ดึงรายการ topup requests ทั้งหมด
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

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

    // ดึงรายการพร้อมข้อมูล user
    let query = supabase
      .from('topup_requests')
      .select(`
        *,
        profiles!topup_requests_user_id_fkey (
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    // นับจำนวนแต่ละสถานะ
    const { data: statusCounts } = await supabase
      .from('topup_requests')
      .select('status')

    const counts = {
      all: statusCounts?.length || 0,
      pending: statusCounts?.filter(r => r.status === 'pending').length || 0,
      approved: statusCounts?.filter(r => r.status === 'approved').length || 0,
      rejected: statusCounts?.filter(r => r.status === 'rejected').length || 0,
      cancelled: statusCounts?.filter(r => r.status === 'cancelled').length || 0,
    }

    return NextResponse.json({
      data,
      counts,
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