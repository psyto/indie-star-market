/**
 * Helper script to create a new prediction market
 * This script creates the YES/NO token mints and initializes the market
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IndieStarMarket } from "../target/types/indie_star_market";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function createMarket() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .indieStarMarket as Program<IndieStarMarket>;

  // Market parameters
  const authority = provider.wallet;
  const fundraisingGoal = 100000; // 100k USDC
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const projectName = "My Indie Project";

  // USDC mint (use real USDC mint on mainnet/devnet)
  const USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC on mainnet
  );

  console.log("Creating prediction market...");
  console.log("Project:", projectName);
  console.log("Goal:", fundraisingGoal, "USDC");
  console.log("Deadline:", new Date(deadline * 1000).toISOString());

  // Step 1: Create YES token mint
  console.log("\n1. Creating YES token mint...");
  const yesMint = Keypair.generate();
  const yesMintRent = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );

  const createYesMintTx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: yesMint.publicKey,
      space: MINT_SIZE,
      lamports: yesMintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      yesMint.publicKey,
      9, // decimals
      authority.publicKey, // mint authority (can be changed to market PDA)
      null // freeze authority
    )
  );

  await provider.sendAndConfirm(createYesMintTx, [authority.payer, yesMint]);
  console.log("YES mint:", yesMint.publicKey.toString());

  // Step 2: Create NO token mint
  console.log("\n2. Creating NO token mint...");
  const noMint = Keypair.generate();
  const noMintRent = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );

  const createNoMintTx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: noMint.publicKey,
      space: MINT_SIZE,
      lamports: noMintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      noMint.publicKey,
      9, // decimals
      authority.publicKey, // mint authority
      null
    )
  );

  await provider.sendAndConfirm(createNoMintTx, [authority.payer, noMint]);
  console.log("NO mint:", noMint.publicKey.toString());

  // Step 3: Derive market PDA
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.publicKey.toBuffer()],
    program.programId
  );
  console.log("\n3. Market PDA:", marketPda.toString());

  // Step 4: Initialize market
  console.log("\n4. Initializing market...");
  try {
    const tx = await program.methods
      .initialize(
        new anchor.BN(fundraisingGoal),
        new anchor.BN(deadline),
        projectName
      )
      .accounts({
        market: marketPda,
        authority: authority.publicKey,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        usdcMint: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Market initialized! Transaction:", tx);

    // Fetch market state
    const marketAccount = await program.account.marketState.fetch(marketPda);
    console.log("\nMarket State:");
    console.log("  Project:", marketAccount.projectName);
    console.log("  Goal:", marketAccount.fundraisingGoal.toString(), "USDC");
    console.log("  Deadline:", new Date(marketAccount.deadline.toNumber() * 1000).toISOString());
    console.log("  YES Mint:", marketAccount.yesMint.toString());
    console.log("  NO Mint:", marketAccount.noMint.toString());
    console.log("  Settled:", marketAccount.isSettled);
  } catch (err) {
    console.error("Error initializing market:", err);
    throw err;
  }

  console.log("\n✅ Market created successfully!");
  console.log("\nNext steps:");
  console.log("1. Create liquidity token accounts (YES, NO, USDC)");
  console.log("2. Users can now buy/sell tokens");
  console.log("3. After deadline, call settleMarket()");
}

createMarket()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

