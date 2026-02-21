use anchor_lang::prelude::*;
use crate::state::{Invoice, InvoiceStatus};
use crate::errors::SmartFlowError;
use crate::events::InvoiceCreated;

#[derive(Accounts)]
#[instruction(invoice_id: u64)]
pub struct CreateInvoice<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + Invoice::INIT_SPACE,
        seeds = [b"invoice", merchant.key().as_ref(), &invoice_id.to_le_bytes()],
        bump,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub mint: Account<'info, anchor_spl::token::Mint>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_invoice(
    ctx: Context<CreateInvoice>,
    invoice_id: u64,
    amount: u64,
    expires_at: i64,
    memo_hash: [u8; 32],
) -> Result<()> {
    require!(amount > 0, SmartFlowError::ZeroAmount);

    let clock = Clock::get()?;
    require!(expires_at > clock.unix_timestamp, SmartFlowError::ExpiryInPast);

    let invoice = &mut ctx.accounts.invoice;
    invoice.merchant = ctx.accounts.merchant.key();
    invoice.payer = Pubkey::default();
    invoice.mint = ctx.accounts.mint.key();
    invoice.amount = amount;
    invoice.status = InvoiceStatus::Created;
    invoice.created_at = clock.unix_timestamp;
    invoice.expires_at = expires_at;
    invoice.invoice_id = invoice_id;
    invoice.memo_hash = memo_hash;
    invoice.bump = ctx.bumps.invoice;

    emit!(InvoiceCreated {
        invoice_pda: invoice.key(),
        merchant: invoice.merchant,
        mint: invoice.mint,
        amount,
        expires_at,
        invoice_id,
    });

    Ok(())
}
