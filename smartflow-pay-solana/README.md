# SmartFlow Pay — Solana Edition

An audit-ready, minimal Anchor program for stablecoin invoice payments on Solana.

Built for the **Solana Audit Subsidy Program**.

## What It Does

SmartFlow Pay enables merchants to create on-chain invoices that customers can pay using SPL tokens (e.g. USDC, USDT). The protocol enforces:

- **Pay-once guarantee**: An invoice can only be paid once. After payment, the status is permanently set to `Paid`.
- **Merchant-only cancellation**: Only the merchant who created an invoice can cancel it.
- **Expiry enforcement**: Invoices have an expiration timestamp. Payments are rejected after expiry.
- **Permissionless expiry marking**: Anyone can mark an expired invoice as `Expired` to update its on-chain state.
- **Direct settlement**: Tokens transfer directly from payer to merchant — no escrow, no intermediary.

## Threat Model & Invariants

### Invariants

1. **No double payment**: Once `status == Paid`, the `pay_invoice` instruction will always reject.
2. **Only merchant cancels**: `cancel_invoice` requires the merchant's signature and uses `has_one` constraint.
3. **Expiry is enforced**: `pay_invoice` checks `Clock::get().unix_timestamp <= expires_at`.
4. **Correct token flow**: Anchor constraints verify mint matches, and token account owners match the expected merchant/payer.
5. **Status transitions are one-way**:
   - `Created → Paid` (via `pay_invoice`)
   - `Created → Cancelled` (via `cancel_invoice`)
   - `Created → Expired` (via `mark_expired`)
   - No other transitions are possible.

### Potential Attack Vectors (Mitigated)

| Vector | Mitigation |
|--------|-----------|
| Double payment | Status constraint `== Created` checked before payment |
| Unauthorized cancel | `has_one = merchant` + signer check |
| Expired invoice payment | Clock timestamp check in `pay_invoice` |
| Wrong token payment | `constraint = mint == invoice.mint` on token accounts |
| Wrong token account owner | `constraint = owner == payer/merchant` on token accounts |
| Replay / re-init | PDA seeds include `merchant + invoice_id` — unique per invoice |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed PDA seeds, account layouts, and instruction flow.

## Project Structure

```
smartflow-pay-solana/
├── programs/
│   └── smartflow_pay/
│       └── src/
│           ├── lib.rs              # Program entrypoint
│           ├── state.rs            # Account structs (GlobalConfig, Invoice)
│           ├── errors.rs           # Custom error codes
│           ├── events.rs           # Event definitions
│           └── instructions/
│               ├── mod.rs
│               ├── initialize_config.rs
│               ├── create_invoice.rs
│               ├── pay_invoice.rs
│               ├── cancel_invoice.rs
│               └── mark_expired.rs
├── tests/
│   └── smartflow_pay.ts            # Integration tests
├── docs/
│   └── ARCHITECTURE.md
├── app/                            # Frontend placeholder
├── Anchor.toml
├── Cargo.toml
└── package.json
```

## Prerequisites

Install Solana CLI and Anchor:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1
avm use 0.30.1

# Verify installations
solana --version
anchor --version
```

## How to Run Tests

```bash
cd smartflow-pay-solana

# Install JS dependencies
yarn install
# or
npm install

# Start local validator + build + deploy + test
anchor test

# If you want to run tests against an already-running validator:
anchor test --skip-local-validator
```

### Expected Test Results

- ✅ Initialize global config
- ✅ Create invoice (valid)
- ✅ Reject zero-amount invoice
- ✅ Reject expired invoice creation
- ✅ Pay invoice (tokens transfer correctly)
- ✅ Reject double payment
- ✅ Cancel invoice (merchant only)
- ✅ Reject unauthorized cancel
- ✅ Reject payment on expired invoice
- ✅ Mark expired invoice
- ✅ Reject mark_expired on valid invoice

## How to Deploy to Devnet

```bash
# Configure Solana CLI for devnet
solana config set --url https://api.devnet.solana.com

# Generate a keypair (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL for deployment
solana airdrop 2

# Build the program
anchor build

# Get the program ID
anchor keys list

# Update the program ID in:
# 1. programs/smartflow_pay/src/lib.rs  (declare_id!)
# 2. Anchor.toml                        ([programs.devnet])

# Rebuild with the correct program ID
anchor build

# Deploy
anchor deploy --provider.cluster devnet
```

## License

MIT
