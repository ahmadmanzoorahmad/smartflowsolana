use anchor_lang::prelude::*;
use crate::state::{Invoice, InvoiceStatus};
use crate::errors::SmartFlowError;
use crate::events::InvoiceExpired;

#[derive(Accounts)]
#[instruction(invoice_id: u64)]
pub struct MarkExpired<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.merchant.as_ref(), &invoice_id.to_le_bytes()],
        bump = invoice.bump,
        constraint = invoice.status == InvoiceStatus::Created @ SmartFlowError::InvalidStatus,
    )]
    pub invoice: Account<'info, Invoice>,
}

pub fn handle_mark_expired(ctx: Context<MarkExpired>, _invoice_id: u64) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp > invoice.expires_at,
        SmartFlowError::NotYetExpired
    );

    invoice.status = InvoiceStatus::Expired;

    emit!(InvoiceExpired {
        invoice_pda: invoice.key(),
        invoice_id: invoice.invoice_id,
    });

    Ok(())
}
