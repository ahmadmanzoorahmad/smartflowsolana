import { isDemoMode } from './solana'

export interface ContractEvent {
  type: 'InvoiceCreated' | 'InvoicePaid' | 'Withdrawal'
  invoiceId?: string
  merchant: string
  payer?: string
  to?: string
  token: string
  tokenSymbol: 'USDT' | 'USDC'
  amount: string
  note?: string
  txHash: string
  blockNumber: number
  timestamp?: number
}

export async function getContractEvents(
  merchantAddress: string,
  _blocksBack: number = 50
): Promise<ContractEvent[]> {
  return getDemoEvents(merchantAddress)
}

export async function getTodaysSales(merchantAddress: string): Promise<{ usdt: number; usdc: number }> {
  return getDemoTodaysSales(merchantAddress)
}

function getDemoEvents(merchantAddress: string): ContractEvent[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem('smartflow-demo-invoices')
  if (!stored) return []

  const invoices = JSON.parse(stored)
  const events: ContractEvent[] = []

  Object.values(invoices).forEach((inv: any) => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase()) {
      events.push({
        type: 'InvoiceCreated',
        invoiceId: inv.invoiceId,
        merchant: inv.merchant,
        token: inv.token,
        tokenSymbol: inv.tokenSymbol,
        amount: inv.amount,
        note: inv.note,
        txHash: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        blockNumber: Math.floor(Date.now() / 1000),
      })

      if (inv.paid) {
        events.push({
          type: 'InvoicePaid',
          invoiceId: inv.invoiceId,
          merchant: inv.merchant,
          payer: inv.payer,
          token: inv.token,
          tokenSymbol: inv.tokenSymbol,
          amount: inv.amount,
          txHash: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          blockNumber: Math.floor(Date.now() / 1000) + 1,
        })
      }
    }
  })

  return events.sort((a, b) => b.blockNumber - a.blockNumber)
}

function getDemoTodaysSales(merchantAddress: string): { usdt: number; usdc: number } {
  if (typeof window === 'undefined') return { usdt: 0, usdc: 0 }

  const stored = localStorage.getItem('smartflow-demo-invoices')
  if (!stored) return { usdt: 0, usdc: 0 }

  const invoices = JSON.parse(stored)
  let usdtTotal = 0
  let usdcTotal = 0
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400

  Object.values(invoices).forEach((inv: any) => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase() &&
        inv.paid &&
        inv.paidAt > oneDayAgo) {
      if (inv.tokenSymbol === 'USDT') {
        usdtTotal += parseFloat(inv.amount)
      } else {
        usdcTotal += parseFloat(inv.amount)
      }
    }
  })

  return { usdt: usdtTotal, usdc: usdcTotal }
}
