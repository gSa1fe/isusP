// src/types/payment.ts

// ===== Topup Request =====
export interface TopupRequest {
  id: string
  user_id: string
  amount: number
  coins_amount: number
  slip_image_url: string | null
  transfer_reference: string | null
  transfer_datetime: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by: string | null
  reviewed_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
  // Relations
  profiles?: {
    username: string
    email: string
    avatar_url: string | null
  }
  reviewer?: {
    username: string
  }
}

// ===== Coin Transaction =====
export interface CoinTransaction {
  id: string
  user_id: string
  type: 'topup' | 'purchase' | 'refund' | 'bonus' | 'admin_adjust'
  amount: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  metadata: Record<string, any> | null
  created_by: string | null
  created_at: string
}

// ===== Coin Package =====
export interface CoinPackage {
  id: string
  name: string
  description: string | null
  price: number
  coins: number
  bonus_coins: number
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
}

// ===== Payment Settings =====
export interface PaymentSettings {
  id: string
  key: string
  value: string
  description: string | null
  updated_at: string
}

// ===== Wallet Info =====
export interface WalletInfo {
  coins: number
  pending_topups: number
  total_topped_up: number
  total_spent: number
}

// ===== API Request/Response Types =====
export interface CreateTopupRequest {
  package_id?: string
  amount: number
  coins_amount: number
  slip_image_url?: string
  transfer_reference?: string
  transfer_datetime?: string
}

export interface TopupActionRequest {
  action: 'approve' | 'reject'
  reject_reason?: string
}

export interface TransactionFilter {
  type?: string
  page?: number
  limit?: number
}