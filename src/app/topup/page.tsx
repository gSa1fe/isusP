'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface CoinPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  coins: number;
  bonus_coins: number;
  is_featured: boolean;
}

interface PaymentSettings {
  promptpay?: {
    enabled: boolean;
    phone_number: string;
    name: string;
    qr_image_url?: string;
  };
  coin_rate?: {
    baht_per_coin: number;
    min_topup: number;
    max_topup: number;
  };
}

interface WalletInfo {
  coins: number;
  pending_topups: number;
}

export default function TopupPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>({});
  const [wallet, setWallet] = useState<WalletInfo>({ coins: 0, pending_topups: 0 });
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [slipImage, setSlipImage] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>('');
  const [transferRef, setTransferRef] = useState('');
  const [transferTime, setTransferTime] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [packagesRes, settingsRes, walletRes] = await Promise.all([
        fetch('/api/topup/packages'),
        fetch('/api/topup/settings'),
        fetch('/api/wallet')
      ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.data || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data || {});
      }

      if (walletRes.ok) {
        const data = await walletRes.json();
        setWallet(data.data || { coins: 0, pending_topups: 0 });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSlip = async (): Promise<string | null> => {
    if (!slipImage) return null;
    
    // TODO: Implement actual upload to Supabase Storage
    // For now, return preview URL (ในโปรเจคจริงต้อง upload ไป storage)
    return slipPreview;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPackage) {
      setError('กรุณาเลือกแพ็คเกจ');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const slipUrl = await uploadSlip();

      const response = await fetch('/api/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: selectedPackage.id,
          slip_image_url: slipUrl,
          transfer_reference: transferRef || undefined,
          transfer_datetime: transferTime ? new Date(transferTime).toISOString() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit topup request');
      }

      setSuccess('ส่งคำขอเติมเงินเรียบร้อยแล้ว! กรุณารอ Admin ตรวจสอบ');
      setSelectedPackage(null);
      setSlipImage(null);
      setSlipPreview('');
      setTransferRef('');
      setTransferTime('');
      
      // Refresh wallet info
      fetchData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate PromptPay QR URL
  const getPromptPayQR = (amount: number) => {
    const phone = settings.promptpay?.phone_number || '';
    // ใช้ API สร้าง QR (PromptPay QR Generator)
    return `https://promptpay.io/${phone}/${amount}.png`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">เติมเงิน</h1>
          <p className="text-gray-400">เติม Coins เพื่อปลดล็อคตอนพิเศษ</p>
        </div>

        {/* Wallet Info */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Coins ของคุณ</p>
              <p className="text-4xl font-bold">{wallet.coins.toLocaleString()}</p>
            </div>
            <div className="text-right">
              {wallet.pending_topups > 0 && (
                <p className="text-sm text-yellow-300">
                  รอตรวจสอบ {wallet.pending_topups} รายการ
                </p>
              )}
              <Link 
                href="/wallet/history"
                className="text-sm text-white/70 hover:text-white"
              >
                ดูประวัติ →
              </Link>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Package Selection */}
          <div>
            <h2 className="text-xl font-semibold mb-4">เลือกแพ็คเกจ</h2>
            <div className="space-y-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPackage?.id === pkg.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  } ${pkg.is_featured ? 'ring-2 ring-yellow-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{pkg.name}</span>
                        {pkg.is_featured && (
                          <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                            ยอดนิยม
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {pkg.coins.toLocaleString()} Coins
                        {pkg.bonus_coins > 0 && (
                          <span className="text-green-400 ml-1">
                            +{pkg.bonus_coins} โบนัส
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-400">
                        ฿{pkg.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Payment */}
          <div>
            <h2 className="text-xl font-semibold mb-4">ชำระเงิน</h2>
            
            {selectedPackage ? (
              <div className="bg-gray-800 rounded-xl p-6">
                {/* PromptPay QR */}
                {settings.promptpay?.enabled && (
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-400 mb-2">สแกน QR Code เพื่อชำระเงิน</p>
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img
                        src={getPromptPayQR(selectedPackage.price)}
                        alt="PromptPay QR"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      {settings.promptpay.name}
                    </p>
                    <p className="text-lg font-semibold text-purple-400">
                      ฿{selectedPackage.price.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Slip Upload */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      อัปโหลด Slip การโอน
                    </label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                      {slipPreview ? (
                        <div className="relative">
                          <img
                            src={slipPreview}
                            alt="Slip preview"
                            className="max-h-48 mx-auto rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSlipImage(null);
                              setSlipPreview('');
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-1">คลิกเพื่ออัปโหลด</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSlipChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Transfer Reference (Optional) */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      เลขที่อ้างอิง (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      placeholder="เลขที่อ้างอิงจาก Slip"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Transfer Time (Optional) */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      วันเวลาที่โอน (ถ้ามี)
                    </label>
                    <input
                      type="datetime-local"
                      value={transferTime}
                      onChange={(e) => setTransferTime(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">แพ็คเกจ</span>
                      <span>{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Coins ที่จะได้รับ</span>
                      <span className="text-green-400">
                        {(selectedPackage.coins + selectedPackage.bonus_coins).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-gray-600 pt-2 mt-2">
                      <span>ยอดชำระ</span>
                      <span className="text-purple-400">฿{selectedPackage.price.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
                  >
                    {submitting ? 'กำลังส่ง...' : 'ยืนยันการเติมเงิน'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    * Coins จะเข้าบัญชีหลังจาก Admin ตรวจสอบ Slip เรียบร้อยแล้ว
                  </p>
                </form>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
                <p>← เลือกแพ็คเกจเพื่อดำเนินการต่อ</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests Link */}
        <div className="mt-8 text-center">
          <Link
            href="/wallet/requests"
            className="text-purple-400 hover:text-purple-300"
          >
            ดูรายการเติมเงินที่รอตรวจสอบ →
          </Link>
        </div>
      </div>
    </div>
  );
}
