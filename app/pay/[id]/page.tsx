'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { usePaymentStore } from '@/lib/store'
import { getInvoice, payInvoice, isDemoMode, Invoice } from '@/lib/invoice/client'
import { shortAddr, getExplorerTxUrl } from '@/lib/solana'
import { ArrowLeft, Wallet, Loader2, AlertCircle, CheckCircle, ExternalLink, Clock, XCircle } from 'lucide-react'

function formatCurrency(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

function isExpired(expiresAt: number): boolean {
  if (expiresAt === 0) return false
  return Math.floor(Date.now() / 1000) > expiresAt
}

function formatExpiry(expiresAt: number): string {
  if (expiresAt === 0) return 'No expiration'
  const date = new Date(expiresAt * 1000)
  return date.toLocaleString()
}

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const invoiceId = (params?.id as string) ?? ''
  const updatePayment = usePaymentStore((state) => state.updatePayment)
  const payments = usePaymentStore((state) => state.payments)

  const walletAddress = publicKey?.toBase58() || null

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'idle' | 'paying' | 'success'>('idle')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [isDemo, setIsDemo] = useState(false)

  const isConnected = !!walletAddress || isDemoMode()
  const DEMO_PAYER = 'DemoPayer11111111111111111111111111111111111'

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      const data = await getInvoice(invoiceId)
      setInvoice(data)
      setIsDemo(isDemoMode())
    } catch (err) {
      console.error('Failed to load invoice:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    setVisible(true)
  }

  const handlePay = async () => {
    if (!invoice) return
    
    const payerAddr = walletAddress || (isDemoMode() ? DEMO_PAYER : null)
    if (!payerAddr) {
      setError('Please connect your wallet first')
      return
    }

    if (isExpired(invoice.expiresAt)) {
      setError('This invoice has expired')
      return
    }

    if (invoice.paid) {
      setError('This invoice has already been paid')
      return
    }

    setIsPaying(true)
    setError('')
    setPaymentStep('paying')

    try {
      const result = await payInvoice(invoiceId, payerAddr)
      setTxHash(result.txHash)
      setIsDemo(result.isDemo)
      setPaymentStep('success')

      const payment = payments.find(p => p.invoiceId === invoiceId)
      if (payment) {
        updatePayment(payment.id, { status: 'completed', txHash: result.txHash })
      }

      await loadInvoice()
    } catch (err: any) {
      setPaymentStep('idle')
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('already paid')) {
        setError('This invoice has already been paid.')
        await loadInvoice()
      } else if (msg.includes('not found')) {
        setError('Invoice not found. It may have been removed.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">
            This payment link is invalid or the invoice no longer exists.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </Card>
      </div>
    )
  }

  const expired = isExpired(invoice.expiresAt)

  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Logo />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Confirmed!</h1>
            <p className="text-gray-600 mb-6">Your payment has been processed and the merchant has been notified.</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
              <p className="text-2xl font-bold">
                {formatCurrency(invoice.amount)} {invoice.tokenSymbol}
              </p>
            </div>

            {txHash && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Transaction Reference</p>
                <p className="font-mono text-xs break-all mb-3">{txHash}</p>
                {isDemo && (
                  <p className="text-xs text-yellow-600">Demo Mode - No real transaction</p>
                )}
              </div>
            )}

            <Button onClick={() => router.push('/')} className="w-full">
              Done
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                Demo Mode
              </span>
            )}
            {walletAddress ? (
              <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {shortAddr(walletAddress)}
              </span>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleConnect}>
                Connect
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Payment Request</h1>
          
          <div className="text-4xl font-bold my-6">
            {formatCurrency(invoice.amount)} {invoice.tokenSymbol}
          </div>

          {invoice.note && (
            <p className="text-gray-600 mb-4">{invoice.note}</p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500 mb-1">Pay to</p>
            <p className="font-mono text-sm">
              {shortAddr(invoice.merchant)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Solana Devnet</p>
          </div>

          {invoice.expiresAt > 0 && (
            <div className={`rounded-xl p-3 mb-4 flex items-center justify-center gap-2 ${
              expired ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {expired ? 'Expired' : `Expires: ${formatExpiry(invoice.expiresAt)}`}
              </span>
            </div>
          )}

          {invoice.paid ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <p className="font-medium">Already Paid</p>
              </div>
              {invoice.payer && (
                <p className="text-sm text-green-600 mt-2">
                  Paid by {shortAddr(invoice.payer)}
                </p>
              )}
            </div>
          ) : expired ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                <p className="font-medium">Invoice Expired</p>
              </div>
              <p className="text-sm text-red-600 mt-2">
                This payment link is no longer valid
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {!isConnected && (
                <Button
                  onClick={handleConnect}
                  size="lg"
                  className="w-full mb-4"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Wallet to Pay
                </Button>
              )}

              {isConnected && (
                <Button
                  onClick={handlePay}
                  disabled={isPaying}
                  size="lg"
                  className="w-full"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirming Payment...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </Button>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
