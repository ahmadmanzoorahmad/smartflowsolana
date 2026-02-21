use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Invoice, InvoiceStatus};
use crate::errors::SmartFlowError;
use crate::events::InvoicePaid;

#[derive(Accounts)]
#[instruction(invoice_id: u64)]
pub struct PayInvoice<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.merchant.as_ref(), &invoice_id.to_le_bytes()],
        bump = invoice.bump,
        constraint = invoice.status == InvoiceStatus::Created @ SmartFlowError::InvalidStatus,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = payer_token_account.mint == invoice.mint @ SmartFlowError::MintMismatch,
        constraint = payer_token_account.owner == payer.key(),
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.mint == invoice.mint @ SmartFlowError::MintMismatch,
        constraint = merchant_token_account.owner == invoice.merchant,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_pay_invoice(ctx: Context<PayInvoice>, invoice_id: u64) -> Result<()> {
    let invoice = &ctx.accounts.invoice;

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp <= invoice.expires_at,
        SmartFlowError::InvoiceExpired
    );

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.merchant_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    token::transfer(cpi_ctx, invoice.amount)?;

    let invoice = &mut ctx.accounts.invoice;
    invoice.payer = ctx.accounts.payer.key();
    invoice.status = InvoiceStatus::Paid;

    emit!(InvoicePaid {
        invoice_pda: invoice.key(),
        merchant: invoice.merchant,
        payer: invoice.payer,
        mint: invoice.mint,
        amount: invoice.amount,
        invoice_id,
    });

    Ok(())
}
