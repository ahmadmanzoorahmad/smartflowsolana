use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;

use instructions::*;

declare_id!("Ed9Un4UY1ixWgjYNAnaUV498JqKN1WJTtA3YU8XMjz5E");

#[program]
pub mod smartflow_pay {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        handle_initialize_config(ctx)
    }

    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: u64,
        amount: u64,
        expires_at: i64,
        memo_hash: [u8; 32],
    ) -> Result<()> {
        handle_create_invoice(ctx, invoice_id, amount, expires_at, memo_hash)
    }

    pub fn pay_invoice(ctx: Context<PayInvoice>, invoice_id: u64) -> Result<()> {
        handle_pay_invoice(ctx, invoice_id)
    }

    pub fn cancel_invoice(ctx: Context<CancelInvoice>, invoice_id: u64) -> Result<()> {
        handle_cancel_invoice(ctx, invoice_id)
    }

    pub fn mark_expired(ctx: Context<MarkExpired>, invoice_id: u64) -> Result<()> {
        handle_mark_expired(ctx, invoice_id)
    }
}
