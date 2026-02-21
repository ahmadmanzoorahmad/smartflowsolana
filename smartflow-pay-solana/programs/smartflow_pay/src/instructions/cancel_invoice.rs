use anchor_lang::prelude::*;
use crate::state::{Invoice, InvoiceStatus};
use crate::errors::SmartFlowError;
use crate::events::InvoiceCancelled;

#[derive(Accounts)]
#[instruction(invoice_id: u64)]
pub struct CancelInvoice<'info> {
    #[account(
        mut,
        seeds = [b"invoice", merchant.key().as_ref(), &invoice_id.to_le_bytes()],
        bump = invoice.bump,
        has_one = merchant @ SmartFlowError::UnauthorizedMerchant,
        constraint = invoice.status == InvoiceStatus::Created @ SmartFlowError::InvalidStatus,
    )]
    pub invoice: Account<'info, Invoice>,

    pub merchant: Signer<'info>,
}

pub fn handle_cancel_invoice(ctx: Context<CancelInvoice>, invoice_id: u64) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;
    invoice.status = InvoiceStatus::Cancelled;

    emit!(InvoiceCancelled {
        invoice_pda: invoice.key(),
        merchant: invoice.merchant,
        invoice_id,
    });

    Ok(())
}
