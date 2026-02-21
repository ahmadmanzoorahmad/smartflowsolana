use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
#[repr(u8)]
pub enum InvoiceStatus {
    Created = 0,
    Paid = 1,
    Cancelled = 2,
    Expired = 3,
}

#[account]
#[derive(InitSpace)]
pub struct Invoice {
    pub merchant: Pubkey,
    pub payer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub status: InvoiceStatus,
    pub created_at: i64,
    pub expires_at: i64,
    pub invoice_id: u64,
    pub memo_hash: [u8; 32],
    pub bump: u8,
}
