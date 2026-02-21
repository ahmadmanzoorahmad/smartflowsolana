# SmartFlow Pay — Architecture

## Program ID

Placeholder: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

After `anchor build`, run `anchor keys list` and update `declare_id!` in `lib.rs` and `Anchor.toml`.

---

## PDA Seeds

### GlobalConfig

| Seed | Type | Value |
|------|------|-------|
| `"config"` | static | literal bytes |

**Address derivation:**
```
PDA = findProgramAddress(["config"], program_id)
```

### Invoice

| Seed | Type | Value |
|------|------|-------|
| `"invoice"` | static | literal bytes |
| `merchant` | Pubkey | merchant's public key (32 bytes) |
| `invoice_id` | u64 | little-endian 8 bytes |

**Address derivation:**
```
PDA = findProgramAddress(
  ["invoice", merchant_pubkey, invoice_id.to_le_bytes()],
  program_id
)
```

This ensures each invoice is unique per merchant + invoice_id pair and cannot be re-initialized.

---

## Account Layouts

### GlobalConfig

| Field | Type | Size | Description |
|-------|------|------|-------------|
| discriminator | [u8; 8] | 8 | Anchor account discriminator |
| authority | Pubkey | 32 | Admin authority |
| bump | u8 | 1 | PDA bump seed |
| **Total** | | **41** | |

### Invoice

| Field | Type | Size | Description |
|-------|------|------|-------------|
| discriminator | [u8; 8] | 8 | Anchor account discriminator |
| merchant | Pubkey | 32 | Invoice creator |
| payer | Pubkey | 32 | Who paid (default until paid) |
| mint | Pubkey | 32 | SPL token mint |
| amount | u64 | 8 | Payment amount in token base units |
| status | u8 | 1 | 0=Created, 1=Paid, 2=Cancelled, 3=Expired |
| created_at | i64 | 8 | Unix timestamp of creation |
| expires_at | i64 | 8 | Unix timestamp of expiry |
| invoice_id | u64 | 8 | Unique ID per merchant |
| memo_hash | [u8; 32] | 32 | SHA-256 hash of memo (no raw text on-chain) |
| bump | u8 | 1 | PDA bump seed |
| **Total** | | **178** | |

### InvoiceStatus Enum

```rust
#[repr(u8)]
enum InvoiceStatus {
    Created   = 0,
    Paid      = 1,
    Cancelled = 2,
    Expired   = 3,
}
```

---

## Instructions

### 1. `initialize_config`

**Purpose:** One-time setup of the global config PDA.

**Signers:** `authority`

**Accounts:**
| Account | Mutable | Signer | Description |
|---------|---------|--------|-------------|
| config | ✅ | ❌ | GlobalConfig PDA (init) |
| authority | ✅ | ✅ | Deployer/admin |
| system_program | ❌ | ❌ | System program |

**Logic:**
- Creates GlobalConfig PDA with seeds `["config"]`
- Sets `authority` and `bump`

---

### 2. `create_invoice(invoice_id, amount, expires_at, memo_hash)`

**Purpose:** Merchant creates a new invoice.

**Signers:** `merchant`

**Accounts:**
| Account | Mutable | Signer | Description |
|---------|---------|--------|-------------|
| invoice | ✅ | ❌ | Invoice PDA (init) |
| merchant | ✅ | ✅ | Invoice creator |
| mint | ❌ | ❌ | SPL token mint |
| system_program | ❌ | ❌ | System program |

**Validation:**
- `amount > 0` (else `ZeroAmount`)
- `expires_at > Clock.unix_timestamp` (else `ExpiryInPast`)

**Logic:**
- Creates Invoice PDA with seeds `["invoice", merchant, invoice_id_le]`
- Sets all fields, status = `Created`, payer = `Pubkey::default()`
- Emits `InvoiceCreated` event

---

### 3. `pay_invoice(invoice_id)`

**Purpose:** Payer pays an outstanding invoice.

**Signers:** `payer`

**Accounts:**
| Account | Mutable | Signer | Description |
|---------|---------|--------|-------------|
| invoice | ✅ | ❌ | Invoice PDA |
| payer | ✅ | ✅ | Person paying |
| payer_token_account | ✅ | ❌ | Payer's token account |
| merchant_token_account | ✅ | ❌ | Merchant's token account |
| token_program | ❌ | ❌ | SPL Token program |

**Validation:**
- `invoice.status == Created` (else `InvalidStatus`)
- `Clock.unix_timestamp <= invoice.expires_at` (else `InvoiceExpired`)
- `payer_token_account.mint == invoice.mint` (else `MintMismatch`)
- `merchant_token_account.mint == invoice.mint` (else `MintMismatch`)
- `payer_token_account.owner == payer.key()`
- `merchant_token_account.owner == invoice.merchant`

**Logic:**
- CPI to `token::transfer` for `invoice.amount`
- Sets `invoice.payer` and `invoice.status = Paid`
- Emits `InvoicePaid` event

---

### 4. `cancel_invoice(invoice_id)`

**Purpose:** Merchant cancels an unpaid invoice.

**Signers:** `merchant`

**Accounts:**
| Account | Mutable | Signer | Description |
|---------|---------|--------|-------------|
| invoice | ✅ | ❌ | Invoice PDA |
| merchant | ❌ | ✅ | Must match invoice.merchant |

**Validation:**
- `has_one = merchant` (else `UnauthorizedMerchant`)
- `invoice.status == Created` (else `InvalidStatus`)

**Logic:**
- Sets `invoice.status = Cancelled`
- Emits `InvoiceCancelled` event

---

### 5. `mark_expired(invoice_id)`

**Purpose:** Anyone can mark an expired invoice.

**Signers:** None required (permissionless).

**Accounts:**
| Account | Mutable | Signer | Description |
|---------|---------|--------|-------------|
| invoice | ✅ | ❌ | Invoice PDA |

**Validation:**
- `invoice.status == Created` (else `InvalidStatus`)
- `Clock.unix_timestamp > invoice.expires_at` (else `NotYetExpired`)

**Logic:**
- Sets `invoice.status = Expired`
- Emits `InvoiceExpired` event

---

## State Transitions

```
         ┌──────────┐
         │ Created  │
         └────┬─────┘
              │
    ┌─────────┼──────────┐
    │         │          │
    ▼         ▼          ▼
┌──────┐  ┌──────────┐  ┌─────────┐
│ Paid │  │Cancelled │  │ Expired │
└──────┘  └──────────┘  └─────────┘
```

All transitions are **irreversible**. An invoice in `Paid`, `Cancelled`, or `Expired` state cannot be changed.

---

## Events

All events use Anchor's `emit!` macro and can be parsed from transaction logs.

| Event | Fields |
|-------|--------|
| `InvoiceCreated` | invoice_pda, merchant, mint, amount, expires_at, invoice_id |
| `InvoicePaid` | invoice_pda, merchant, payer, mint, amount, invoice_id |
| `InvoiceCancelled` | invoice_pda, merchant, invoice_id |
| `InvoiceExpired` | invoice_pda, invoice_id |

---

## Security Considerations

1. **No raw memo storage**: Only `memo_hash` (32 bytes) is stored on-chain. Raw text stays off-chain.
2. **No escrow**: Tokens transfer directly payer → merchant. No funds are held by the program.
3. **PDA uniqueness**: Seeds `[merchant, invoice_id]` prevent invoice ID collisions across merchants.
4. **Checked arithmetic**: Anchor and Rust's default overflow checks prevent arithmetic exploits.
5. **No `unsafe` code**: Entire program uses safe Rust only.
6. **Minimal attack surface**: 5 instructions, 2 account types, no admin controls over funds.
