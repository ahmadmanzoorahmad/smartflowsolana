use anchor_lang::prelude::*;

#[error_code]
pub enum SmartFlowError {
    #[msg("Invoice has already been paid")]
    AlreadyPaid,

    #[msg("Invoice has been cancelled")]
    InvoiceCancelled,

    #[msg("Invoice has expired")]
    InvoiceExpired,

    #[msg("Invoice is not in Created status")]
    InvalidStatus,

    #[msg("Expiry time must be in the future")]
    ExpiryInPast,

    #[msg("Invoice amount must be greater than zero")]
    ZeroAmount,

    #[msg("Token mint does not match the invoice")]
    MintMismatch,

    #[msg("Only the merchant can perform this action")]
    UnauthorizedMerchant,

    #[msg("Invoice has not yet expired")]
    NotYetExpired,

    #[msg("Arithmetic overflow")]
    Overflow,
}
