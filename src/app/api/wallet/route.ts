// src/app/api/wallet/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET - ดึงข้อมูล wallet ของ user
export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ดึง coins จาก profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // นับ pending topups
    const { count: pendingCount } = await supabase
      .from('topup_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')

    // คำนวณ total topped up (จาก transactions)
    const { data: topupTxns } = await supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'topup')

    const totalToppedUp = topupTxns?.reduce((sum, t) => sum + t.amount, 0) || 0

    // คำนวณ total spent (purchase)
    const { data: purchaseTxns } = await supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'purchase')

    const totalSpent = purchaseTxns?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    return NextResponse.json({
      coins: profile?.coins || 0,
      pending_topups: pendingCount || 0,
      total_topped_up: totalToppedUp,
      total_spent: totalSpent
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}