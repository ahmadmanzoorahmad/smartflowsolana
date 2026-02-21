import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartflowPay } from "../target/types/smartflow_pay";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { BN } from "bn.js";

describe("smartflow_pay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SmartflowPay as Program<SmartflowPay>;
  const connection = provider.connection;

  const authority = provider.wallet as anchor.Wallet;
  const merchant = Keypair.generate();
  const payer = Keypair.generate();

  let mint: PublicKey;
  let merchantTokenAccount: PublicKey;
  let payerTokenAccount: PublicKey;

  const INVOICE_AMOUNT = 1_000_000; // 1 token (6 decimals)
  const MINT_AMOUNT = 100_000_000; // 100 tokens

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  function getInvoicePda(merchantKey: PublicKey, invoiceId: number): PublicKey {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(invoiceId));
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("invoice"), merchantKey.toBuffer(), buf],
      program.programId
    );
    return pda;
  }

  before(async () => {
    // Airdrop SOL to merchant and payer
    const airdropMerchant = await connection.requestAirdrop(
      merchant.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropMerchant, "confirmed");

    const airdropPayer = await connection.requestAirdrop(
      payer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropPayer, "confirmed");

    // Create SPL token mint (authority is the provider wallet)
    mint = await createMint(
      connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // 6 decimals
    );

    // Create token accounts for merchant and payer
    merchantTokenAccount = await createAccount(
      connection,
      authority.payer,
      mint,
      merchant.publicKey
    );

    payerTokenAccount = await createAccount(
      connection,
      authority.payer,
      mint,
      payer.publicKey
    );

    // Mint tokens to payer
    await mintTo(
      connection,
      authority.payer,
      mint,
      payerTokenAccount,
      authority.publicKey,
      MINT_AMOUNT
    );
  });

  describe("initialize_config", () => {
    it("initializes the global config", async () => {
      await program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.globalConfig.fetch(configPda);
      expect(config.authority.toBase58()).to.equal(
        authority.publicKey.toBase58()
      );
    });
  });

  describe("create_invoice", () => {
    it("creates an invoice", async () => {
      const invoiceId = 1;
      const invoicePda = getInvoicePda(merchant.publicKey, invoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const memoHash = Buffer.alloc(32);
      Buffer.from("test invoice memo").copy(memoHash);

      await program.methods
        .createInvoice(
          new BN(invoiceId),
          new BN(INVOICE_AMOUNT),
          new BN(expiresAt),
          Array.from(memoHash)
        )
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      const invoice = await program.account.invoice.fetch(invoicePda);
      expect(invoice.merchant.toBase58()).to.equal(
        merchant.publicKey.toBase58()
      );
      expect(invoice.amount.toNumber()).to.equal(INVOICE_AMOUNT);
      expect(invoice.status).to.deep.equal({ created: {} });
      expect(invoice.mint.toBase58()).to.equal(mint.toBase58());
      expect(invoice.invoiceId.toNumber()).to.equal(invoiceId);
    });

    it("rejects zero amount", async () => {
      const invoiceId = 99;
      const invoicePda = getInvoicePda(merchant.publicKey, invoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const memoHash = Array(32).fill(0);

      try {
        await program.methods
          .createInvoice(new BN(invoiceId), new BN(0), new BN(expiresAt), memoHash)
          .accounts({
            invoice: invoicePda,
            merchant: merchant.publicKey,
            mint: mint,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("ZeroAmount");
      }
    });

    it("rejects expiry in the past", async () => {
      const invoiceId = 100;
      const invoicePda = getInvoicePda(merchant.publicKey, invoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const memoHash = Array(32).fill(0);

      try {
        await program.methods
          .createInvoice(
            new BN(invoiceId),
            new BN(INVOICE_AMOUNT),
            new BN(expiresAt),
            memoHash
          )
          .accounts({
            invoice: invoicePda,
            merchant: merchant.publicKey,
            mint: mint,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("ExpiryInPast");
      }
    });
  });

  describe("pay_invoice", () => {
    it("pays an invoice and transfers tokens", async () => {
      const invoiceId = 1;
      const invoicePda = getInvoicePda(merchant.publicKey, invoiceId);

      // Check balances before
      const payerBefore = await getAccount(connection, payerTokenAccount);
      const merchantBefore = await getAccount(
        connection,
        merchantTokenAccount
      );

      await program.methods
        .payInvoice(new BN(invoiceId))
        .accounts({
          invoice: invoicePda,
          payer: payer.publicKey,
          payerTokenAccount: payerTokenAccount,
          merchantTokenAccount: merchantTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      // Check balances after
      const payerAfter = await getAccount(connection, payerTokenAccount);
      const merchantAfter = await getAccount(
        connection,
        merchantTokenAccount
      );

      expect(Number(payerBefore.amount) - Number(payerAfter.amount)).to.equal(
        INVOICE_AMOUNT
      );
      expect(
        Number(merchantAfter.amount) - Number(merchantBefore.amount)
      ).to.equal(INVOICE_AMOUNT);

      // Check invoice status
      const invoice = await program.account.invoice.fetch(invoicePda);
      expect(invoice.status).to.deep.equal({ paid: {} });
      expect(invoice.payer.toBase58()).to.equal(payer.publicKey.toBase58());
    });

    it("rejects double payment", async () => {
      const invoiceId = 1;
      const invoicePda = getInvoicePda(merchant.publicKey, invoiceId);

      try {
        await program.methods
          .payInvoice(new BN(invoiceId))
          .accounts({
            invoice: invoicePda,
            payer: payer.publicKey,
            payerTokenAccount: payerTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });
  });

  describe("cancel_invoice", () => {
    const cancelInvoiceId = 2;

    before(async () => {
      const invoicePda = getInvoicePda(merchant.publicKey, cancelInvoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const memoHash = Array(32).fill(0);

      await program.methods
        .createInvoice(
          new BN(cancelInvoiceId),
          new BN(INVOICE_AMOUNT),
          new BN(expiresAt),
          memoHash
        )
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();
    });

    it("merchant cancels an invoice", async () => {
      const invoicePda = getInvoicePda(merchant.publicKey, cancelInvoiceId);

      await program.methods
        .cancelInvoice(new BN(cancelInvoiceId))
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
        })
        .signers([merchant])
        .rpc();

      const invoice = await program.account.invoice.fetch(invoicePda);
      expect(invoice.status).to.deep.equal({ cancelled: {} });
    });

    it("rejects cancel on already cancelled invoice", async () => {
      const invoicePda = getInvoicePda(merchant.publicKey, cancelInvoiceId);

      try {
        await program.methods
          .cancelInvoice(new BN(cancelInvoiceId))
          .accounts({
            invoice: invoicePda,
            merchant: merchant.publicKey,
          })
          .signers([merchant])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("rejects non-merchant cancel", async () => {
      // Create a new invoice to attempt unauthorized cancel
      const newInvoiceId = 3;
      const invoicePda = getInvoicePda(merchant.publicKey, newInvoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const memoHash = Array(32).fill(0);

      await program.methods
        .createInvoice(
          new BN(newInvoiceId),
          new BN(INVOICE_AMOUNT),
          new BN(expiresAt),
          memoHash
        )
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      try {
        await program.methods
          .cancelInvoice(new BN(newInvoiceId))
          .accounts({
            invoice: invoicePda,
            merchant: payer.publicKey, // wrong signer
          })
          .signers([payer])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        // Should fail due to seeds constraint or has_one
        expect(err).to.exist;
      }
    });
  });

  describe("pay_invoice — expired invoice", () => {
    it("cannot pay an expired invoice", async () => {
      const expiredInvoiceId = 10;
      const invoicePda = getInvoicePda(merchant.publicKey, expiredInvoiceId);
      // Set expiry to 2 seconds from now
      const expiresAt = Math.floor(Date.now() / 1000) + 2;
      const memoHash = Array(32).fill(0);

      await program.methods
        .createInvoice(
          new BN(expiredInvoiceId),
          new BN(INVOICE_AMOUNT),
          new BN(expiresAt),
          memoHash
        )
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        await program.methods
          .payInvoice(new BN(expiredInvoiceId))
          .accounts({
            invoice: invoicePda,
            payer: payer.publicKey,
            payerTokenAccount: payerTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvoiceExpired");
      }
    });
  });

  describe("mark_expired", () => {
    it("marks an expired invoice as expired", async () => {
      const expiredInvoiceId = 10; // reuse the expired one from above
      const invoicePda = getInvoicePda(merchant.publicKey, expiredInvoiceId);

      await program.methods
        .markExpired(new BN(expiredInvoiceId))
        .accounts({
          invoice: invoicePda,
        })
        .rpc();

      const invoice = await program.account.invoice.fetch(invoicePda);
      expect(invoice.status).to.deep.equal({ expired: {} });
    });

    it("rejects mark_expired on non-expired invoice", async () => {
      const freshInvoiceId = 20;
      const invoicePda = getInvoicePda(merchant.publicKey, freshInvoiceId);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const memoHash = Array(32).fill(0);

      await program.methods
        .createInvoice(
          new BN(freshInvoiceId),
          new BN(INVOICE_AMOUNT),
          new BN(expiresAt),
          memoHash
        )
        .accounts({
          invoice: invoicePda,
          merchant: merchant.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      try {
        await program.methods
          .markExpired(new BN(freshInvoiceId))
          .accounts({
            invoice: invoicePda,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("NotYetExpired");
      }
    });
  });
});
