export function formatAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getExplorerUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}?cluster=devnet`
}

export function getAddressExplorerUrl(address: string): string {
  return `https://solscan.io/account/${address}?cluster=devnet`
}
