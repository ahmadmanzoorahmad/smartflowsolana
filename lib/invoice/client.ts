import { isDemoMode, getTokenMint } from '../solana'

export interface Invoice {
  invoiceId: string
  merchant: string
  token: string
  tokenSymbol: 'USDT' | 'USDC'
  amount: string
  note: string
  createdAt: number
  expiresAt: number
  paid: boolean
  payer: string
  paidAt: number
}

export interface CreateInvoiceParams {
  token: 'USDT' | 'USDC'
  amount: string
  note: string
  expiresAt?: number
}

export interface PayInvoiceResult {
  txHash: string
  isDemo: boolean
}

export interface WithdrawResult {
  txHash: string
  isDemo: boolean
}

const DEMO_STORAGE_KEY = 'smartflow-demo-invoices'

function getDemoInvoices(): Record<string, Invoice> {
  if (typeof window === 'undefined') return {}
  const stored = localStorage.getItem(DEMO_STORAGE_KEY)
  return stored ? JSON.parse(stored) : {}
}

function saveDemoInvoices(invoices: Record<string, Invoice>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(invoices))
}

function generateDemoId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 44)
}

export async function createInvoice(
  merchantAddress: string,
  params: CreateInvoiceParams
): Promise<{ invoiceId: string; txHash: string; isDemo: boolean }> {
  const tokenMint = getTokenMint(params.token)
  const expiresAt = params.expiresAt || 0

  const invoiceId = generateDemoId()
  const invoice: Invoice = {
    invoiceId,
    merchant: merchantAddress,
    token: tokenMint,
    tokenSymbol: params.token,
    amount: params.amount,
    note: params.note,
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt,
    paid: false,
    payer: '',
    paidAt: 0,
  }

  const invoices = getDemoInvoices()
  invoices[invoiceId] = invoice
  saveDemoInvoices(invoices)

  return { invoiceId, txHash: generateDemoId(), isDemo: true }
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const invoices = getDemoInvoices()
  return invoices[invoiceId] || null
}

export async function payInvoice(
  invoiceId: string,
  payerAddress: string
): Promise<PayInvoiceResult> {
  await new Promise(resolve => setTimeout(resolve, 1500))

  const invoices = getDemoInvoices()
  const invoice = invoices[invoiceId]
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.paid) throw new Error('This invoice has already been paid')

  invoice.paid = true
  invoice.payer = payerAddress
  invoice.paidAt = Math.floor(Date.now() / 1000)
  saveDemoInvoices(invoices)

  return { txHash: generateDemoId(), isDemo: true }
}

export async function getMerchantBalance(
  merchantAddress: string,
  token: 'USDT' | 'USDC'
): Promise<string> {
  const invoices = getDemoInvoices()
  let total = 0
  const tokenMint = getTokenMint(token)

  Object.values(invoices).forEach(inv => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase() &&
        inv.token === tokenMint &&
        inv.paid) {
      total += parseFloat(inv.amount)
    }
  })

  return total.toFixed(2)
}

export async function withdraw(
  token: 'USDT' | 'USDC',
  amount: string,
  toAddress: string
): Promise<WithdrawResult> {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return { txHash: generateDemoId(), isDemo: true }
}

export async function getMerchantInvoices(merchantAddress: string): Promise<Invoice[]> {
  const invoices = getDemoInvoices()
  return Object.values(invoices).filter(
    inv => inv.merchant.toLowerCase() === merchantAddress.toLowerCase()
  ).sort((a, b) => b.createdAt - a.createdAt)
}

export { isDemoMode }
export function isLiveMode(): boolean { return false }
