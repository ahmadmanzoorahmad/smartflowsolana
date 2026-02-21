import { Connection, clusterApiUrl } from '@solana/web3.js'

export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet')
export const SOLANA_EXPLORER = 'https://solscan.io'

export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed')
}

export function shortAddr(addr: string): string {
  if (!addr) return ''
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export function getExplorerTxUrl(signature: string): string {
  return `${SOLANA_EXPLORER}/tx/${signature}?cluster=${SOLANA_NETWORK}`
}

export function getExplorerAddressUrl(address: string): string {
  return `${SOLANA_EXPLORER}/account/${address}?cluster=${SOLANA_NETWORK}`
}

export function isDemoMode(): boolean {
  return true
}

export function isLiveMode(): boolean {
  return false
}

export function getTokenSymbol(mint: string): 'USDT' | 'USDC' {
  if (mint === USDT_MINT) return 'USDT'
  return 'USDC'
}

export function getTokenMint(token: 'USDT' | 'USDC'): string {
  return token === 'USDT' ? USDT_MINT : USDC_MINT
}
