// src/app/admin/topup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban,
  Coins,
  Eye,
  Check,
  X,
  RefreshCw
} from 'lucide-react'
import { toast } from "sonner"
import type { TopupRequest } from '@/types/payment'

const STATUS_CONFIG = {
  pending: { label: 'รอตรวจสอบ', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'ปฏิเสธ', color: 'bg-red-500', icon: XCircle },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-500', icon: Ban },
}

export default function AdminTopupPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<TopupRequest[]>([])
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
  const [statusFilter, setStatusFilter] = useState('pending')
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null)
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchRequests = async () => {
    try {
      const url = `/api/admin/topup?status=${statusFilter}`
      const res = await fetch(url)
      
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
        setCounts(data.counts || { all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchRequests()
  }, [statusFilter])

  const handleApprove = async (req: TopupRequest) => {
    if (!confirm(`ยืนยันอนุมัติ ${req.coins_amount} Coins ให้ผู้ใช้?`)) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/topup/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('อนุมัติสำเร็จ!', {
        description: `เพิ่ม ${req.coins_amount} Coins ให้ผู้ใช้เรียบร้อย`
      })
      
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('กรุณาระบุเหตุผล')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/topup/${selectedRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject', 
          reject_reason: rejectReason 
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('ปฏิเสธคำขอเรียบร้อย')
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedRequest(null)
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-yellow-500" />
            จัดการเติมเงิน
          </h1>
          <p className="text-gray-400">ตรวจสอบและอนุมัติคำขอเติมเงิน</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => fetchRequests()}
          className="border-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = counts[key as keyof typeof counts]
          const isActive = statusFilter === key
          
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`p-4 rounded-xl border transition-all text-left ${
                isActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-white/10 bg-[#131720] hover:border-white/20'
              }`}
            >
              <p className="text-xs text-gray-400">{config.label}</p>
              <p className="text-2xl font-bold text-white">{count}</p>
            </button>
          )
        })}
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition-all text-left ${
            statusFilter === 'all' 
              ? 'border-primary bg-primary/10' 
              : 'border-white/10 bg-[#131720] hover:border-white/20'
          }`}
        >
          <p className="text-xs text-gray-400">ทั้งหมด</p>
          <p className="text-2xl font-bold text-white">{counts.all}</p>
        </button>
      </div>

      {/* Request List */}
      <Card className="bg-[#131720] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">รายการคำขอ</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => {
                const statusConfig = STATUS_CONFIG[req.status]
                const StatusIcon = statusConfig.icon
                const profile = req.profiles
                
                return (
                  <div 
                    key={req.id} 
                    className="p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-white/10">
                          <AvatarImage src={profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {profile?.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white">{profile?.username || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(req.created_at).toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-center">
                        <p className="text-xs text-gray-400">จำนวนเงิน</p>
                        <p className="text-lg font-bold text-white">฿{req.amount.toLocaleString()}</p>
                      </div>

                      {/* Coins */}
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Coins</p>
                        <p className="text-lg font-bold text-yellow-500">{req.coins_amount.toLocaleString()}</p>
                      </div>

                      {/* Status */}
                      <Badge className={`${statusConfig.color} text-white border-0`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {req.slip_image_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(req)
                              setShowSlipModal(true)
                            }}
                            className="border-white/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {req.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req)}
                              disabled={processing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(req)
                                setShowRejectModal(true)
                              }}
                              disabled={processing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {req.reject_reason && (
                      <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-sm text-red-400">
                          <strong>เหตุผล:</strong> {req.reject_reason}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              ไม่มีรายการ
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slip Preview Modal */}
      <Dialog open={showSlipModal} onOpenChange={setShowSlipModal}>
        <DialogContent className="bg-[#1a1f29] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>สลิปการโอนเงิน</DialogTitle>
            <DialogDescription>
              {selectedRequest?.profiles?.username} - ฿{selectedRequest?.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest?.slip_image_url && (
            <div className="flex justify-center">
              <Image
                src={selectedRequest.slip_image_url}
                alt="Slip"
                width={300}
                height={450}
                className="rounded-lg"
              />
            </div>
          )}
          
          <div className="space-y-2 text-sm">
            {selectedRequest?.transfer_reference && (
              <p><strong>เลขอ้างอิง:</strong> {selectedRequest.transfer_reference}</p>
            )}
            {selectedRequest?.transfer_datetime && (
              <p><strong>เวลาโอน:</strong> {new Date(selectedRequest.transfer_datetime).toLocaleString('th-TH')}</p>
            )}
          </div>
          
          {selectedRequest?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button
                onClick={() => {
                  setShowSlipModal(false)
                  handleApprove(selectedRequest)
                }}
                className="bg-green-600 hover:bg-green-700"
                disabled={processing}
              >
                <Check className="w-4 h-4 mr-2" />
                อนุมัติ
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowSlipModal(false)
                  setShowRejectModal(true)
                }}
                disabled={processing}
              >
                <X className="w-4 h-4 mr-2" />
                ปฏิเสธ
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="bg-[#1a1f29] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอ</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label>เหตุผล</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เช่น สลิปไม่ชัด, จำนวนเงินไม่ตรง..."
              className="bg-black/20 border-white/10 text-white min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันปฏิเสธ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}