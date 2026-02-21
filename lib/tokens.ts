export const TOKENS = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
} as const

export type TokenSymbol = keyof typeof TOKENS

export function getTokenInfo(symbol: TokenSymbol) {
  return TOKENS[symbol]
}

export function getTokenMintForSymbol(symbol: TokenSymbol): string {
  return TOKENS[symbol].mint
}

export function getTokenSymbolForMint(mint: string): TokenSymbol | null {
  if (mint === TOKENS.USDT.mint) return 'USDT'
  if (mint === TOKENS.USDC.mint) return 'USDC'
  return null
}
