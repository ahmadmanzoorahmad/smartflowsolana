# SmartFlow Pay

## Overview
A Next.js merchant stablecoin payment application for Solana Devnet. Enables merchants to receive USDT and USDC payments with Phantom/Solflare wallet integration and local invoice management (Demo Mode). Also includes an audit-ready Anchor program for on-chain stablecoin invoices on Solana Devnet.

## Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: @solana/wallet-adapter-react, @solana/wallet-adapter-phantom, @solana/wallet-adapter-solflare
- **Blockchain**: Solana Devnet (@solana/web3.js v1)
- **State Management**: Zustand
- **UI Components**: Custom components with Lucide icons
- **Smart Contracts (Solana)**: Anchor 0.30.1 + Rust
- **Deployment**: Netlify-ready with @netlify/plugin-nextjs
- **Explorer**: Solscan (devnet)

## Project Structure
```
/app                 - Next.js App Router pages
  /dashboard         - Merchant dashboard (sales, balance, transactions)
  /create            - Create payment links / invoices
  /pay/[id]          - Customer payment page
  /tx/[hash]         - Transaction confirmation
  /transactions      - Full transaction history
/components          - Reusable UI components
  Providers.tsx      - Solana wallet adapter context providers (Phantom, Solflare)
  WalletConnectButton.tsx - WalletMultiButton wrapper with onConnect callback
/lib                 - Utilities and helpers
  solana.ts          - Solana connection, Solscan URLs, utilities
  store.ts           - Zustand payment store
  events.ts          - Transaction event helpers (demo mode)
  tokens.ts          - Token mint definitions (USDT, USDC)
  utils.ts           - General formatting utilities
  /invoice/client.ts - Invoice CRUD operations (demo/localStorage)
/public              - Static assets (logo)
/smartflow-pay-solana  - Solana Anchor program workspace
  /programs/smartflow_pay/src  - Rust program source
    /instructions    - Instruction handlers
    lib.rs           - Program entrypoint
    state.rs         - Account structs
    errors.rs        - Error codes
    events.rs        - Event definitions
  /tests             - TypeScript integration tests
  /docs              - Architecture documentation
```

## Solana Program (smartflow_pay)
- **Program ID**: Placeholder (update after `anchor keys list`)
- Instructions: `initialize_config`, `create_invoice`, `pay_invoice`, `cancel_invoice`, `mark_expired`
- PDAs: GlobalConfig (seeds: ["config"]), Invoice (seeds: ["invoice", merchant, invoice_id])
- Compiles with `cargo check` — requires Solana CLI + Anchor CLI for full `anchor build` and `anchor test`

## Frontend Modes
- **Demo Mode** (default): All invoices stored in localStorage, wallet connection is real but payments are simulated
- **Live Mode**: When Solana program is deployed, will connect to on-chain program

## Token Support
- **USDT** (Tether USD) - SPL Token on Solana
- **USDC** (USD Coin) - SPL Token on Solana

## Environment Variables
- `NEXT_PUBLIC_SOLANA_NETWORK` - Network (devnet/mainnet-beta)
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Custom RPC endpoint
- `NEXT_PUBLIC_SOLANA_PROGRAM_ID` - Deployed program ID (empty = demo mode)

## Development
- Frontend: `npm run dev` (runs on port 5000)
- Solana: `cd smartflow-pay-solana && anchor test` (requires Solana CLI + Anchor CLI)
- Build: `npm run build`

## Deployment
### Netlify
- `netlify.toml` is pre-configured
- Uses `@netlify/plugin-nextjs` for SSR support

### Replit
- Frontend binds to 0.0.0.0:5000

## Recent Changes
- Fully cleaned codebase of all EVM/BNB Chain/MetaMask/ethers.js/wagmi/viem references
- Removed legacy /contracts directory (BNB Chain smart contracts)
- Removed lib/contracts/abi.ts (EVM ABI)
- Switched explorer links from explorer.solana.com to Solscan (solscan.io)
- Updated .env.example to Solana-only config
- Using individual wallet adapter packages (@solana/wallet-adapter-phantom, @solana/wallet-adapter-solflare) instead of heavy meta-package
- WalletConnectButton uses standard WalletMultiButton from wallet adapter UI
- lib/solana.ts reads RPC/network from env vars with devnet defaults
- tsconfig.json excludes smartflow-pay-solana and contracts from build
- npm run build passes cleanly with zero errors
