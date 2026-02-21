use anchor_lang::prelude::*;

#[event]
pub struct InvoiceCreated {
    pub invoice_pda: Pubkey,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub expires_at: i64,
    pub invoice_id: u64,
}

#[event]
pub struct InvoicePaid {
    pub invoice_pda: Pubkey,
    pub merchant: Pubkey,
    pub payer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub invoice_id: u64,
}

#[event]
pub struct InvoiceCancelled {
    pub invoice_pda: Pubkey,
    pub merchant: Pubkey,
    pub invoice_id: u64,
}

#[event]
pub struct InvoiceExpired {
    pub invoice_pda: Pubkey,
    pub invoice_id: u64,
}
