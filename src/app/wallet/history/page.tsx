// src/app/wallet/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, 
  ArrowLeft,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Gift,
  Settings,
  Wallet
} from 'lucide-react'
import type { CoinTransaction, WalletInfo } from '@/types/payment'

const TYPE_CONFIG = {
  topup: { 
    label: 'เติมเงิน', 
    icon: ArrowDownCircle, 
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  },
  purchase: { 
    label: 'ซื้อ', 
    icon: ArrowUpCircle, 
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  refund: { 
    label: 'คืนเงิน', 
    icon: RotateCcw, 
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  bonus: { 
    label: 'โบนัส', 
    icon: Gift, 
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  admin_adjust: { 
    label: 'ปรับปรุง', 
    icon: Settings, 
    color: 'text-purple-500',
    bg: 'bg-purple-500/10'
  },
}

export default function WalletHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // ดึง wallet info
        const walletRes = await fetch('/api/wallet')
        if (walletRes.ok) {
          const data = await walletRes.json()
          setWalletInfo(data)
        }

        // ดึง transactions
        const url = typeFilter === 'all' 
          ? '/api/wallet/transactions' 
          : `/api/wallet/transactions?type=${typeFilter}`
        
        const txnRes = await fetch(url)
        if (txnRes.ok) {
          const data = await txnRes.json()
          setTransactions(data.data || [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [typeFilter])

  return (
    <div className="min-h-screen bg-[#0d1016] py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              กระเป๋าเงิน
            </h1>
            <p className="text-gray-400 text-sm">ประวัติการใช้ Coins</p>
          </div>
        </div>

        {/* Wallet Summary */}
        {walletInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">Coins คงเหลือ</p>
                <p className="text-2xl font-bold text-yellow-500">{walletInfo.coins.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#131720] border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">เติมเงินรวม</p>
                <p className="text-xl font-bold text-green-500">+{walletInfo.total_topped_up.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#131720] border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">ใช้ไปแล้ว</p>
                <p className="text-xl font-bold text-red-500">-{walletInfo.total_spent.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-[#131720] border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">รอดำเนินการ</p>
                <p className="text-xl font-bold text-yellow-500">{walletInfo.pending_topups}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ประวัติรายการ</h2>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] bg-[#1a1f29] border-white/10 text-white">
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f29] border-white/10 text-white">
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="topup">เติมเงิน</SelectItem>
              <SelectItem value="purchase">ซื้อ</SelectItem>
              <SelectItem value="refund">คืนเงิน</SelectItem>
              <SelectItem value="bonus">โบนัส</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((txn) => {
              const config = TYPE_CONFIG[txn.type] || TYPE_CONFIG.topup
              const Icon = config.icon
              const isPositive = txn.amount > 0
              
              return (
                <Card key={txn.id} className="bg-[#131720] border-white/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{config.label}</p>
                          <Badge variant="outline" className="text-xs border-white/10 text-gray-400">
                            {txn.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.created_at).toLocaleString('th-TH')}
                        </p>
                        {txn.description && (
                          <p className="text-xs text-gray-400 mt-1">{txn.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{txn.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        คงเหลือ: {txn.balance_after.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="bg-[#131720] border-white/10">
            <CardContent className="py-12 text-center">
              <Coins className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">ยังไม่มีประวัติรายการ</p>
              <Link href="/topup" className="mt-4 inline-block">
                <Button className="bg-primary text-black">เติมเงินเลย</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}