'use client'

import { useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Wallet, CheckCircle, LogOut } from 'lucide-react'
import { shortAddr } from '@/lib/solana'

interface WalletConnectButtonProps {
  size?: 'sm' | 'md' | 'lg'
  onConnect?: (address: string) => void
}

export function WalletConnectButton({ size = 'lg', onConnect }: WalletConnectButtonProps) {
  const { publicKey, connecting, disconnect } = useWallet()
  const { setVisible } = useWalletModal()

  useEffect(() => {
    if (publicKey) {
      onConnect?.(publicKey.toBase58())
    }
  }, [publicKey, onConnect])

  const handleClick = useCallback(() => {
    setVisible(true)
  }, [setVisible])

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-3',
  }

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          className={`
            inline-flex items-center font-semibold rounded-2xl
            bg-gradient-to-r from-green-500 to-emerald-600
            text-white shadow-lg shadow-green-500/25
            hover:shadow-xl hover:shadow-green-500/30
            hover:from-green-600 hover:to-emerald-700
            transition-all duration-300 ease-out
            ${sizeClasses[size]}
          `}
        >
          <CheckCircle className="w-5 h-5" />
          <span>{shortAddr(publicKey.toBase58())}</span>
        </button>
        <button
          onClick={() => disconnect()}
          className="p-3 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all duration-200"
          title="Disconnect wallet"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className={`
        inline-flex items-center font-semibold rounded-2xl
        bg-gradient-to-r from-amber-500 to-orange-500
        text-white shadow-lg shadow-orange-500/30
        hover:shadow-xl hover:shadow-orange-500/40
        hover:from-amber-600 hover:to-orange-600
        active:scale-[0.98]
        transition-all duration-300 ease-out
        disabled:opacity-60 disabled:cursor-not-allowed
        ${sizeClasses[size]}
      `}
    >
      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
        <Wallet className="w-5 h-5" />
      </div>
      <span>{connecting ? 'Connecting...' : 'Select Wallet'}</span>
    </button>
  )
}
