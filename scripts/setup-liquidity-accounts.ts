/**
 * Helper script to create liquidity token accounts for a market
 * These accounts hold the YES/NO tokens and USDC for the AMM
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IndieStarMarket } from "../target/types/indie_star_market";
import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function setupLiquidityAccounts(marketPda: PublicKey) {
  // Set up provider
  let provider: anchor.AnchorProvider;
  
  try {
    provider = anchor.AnchorProvider.env();
  } catch (e) {
    const connection = new anchor.web3.Connection(
      process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899",
      "confirmed"
    );
    const keypair = Keypair.generate();
    const wallet = new anchor.Wallet(keypair);
    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    console.log("Using local provider. Make sure solana-test-validator is running!");
    
    // Airdrop SOL to wallet for local testing
    try {
      console.log("Requesting airdrop for local testing...");
      const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature, "confirmed");
      console.log("✅ Airdrop successful!\n");
    } catch (airdropErr: any) {
      if (airdropErr.message?.includes("ECONNREFUSED")) {
        console.error("❌ Cannot connect to validator. Please start solana-test-validator first.");
        throw airdropErr;
      }
      console.warn("⚠️  Airdrop failed, but continuing:", airdropErr.message);
    }
  }
  
  anchor.setProvider(provider);

  const program = anchor.workspace
    .indieStarMarket as Program<IndieStarMarket>;

  // Fetch market to get mint addresses
  const marketAccount = await program.account.marketState.fetch(marketPda);
  const yesMint = marketAccount.yesMint;
  const noMint = marketAccount.noMint;
  const usdcMint = marketAccount.usdcMint;

  console.log("Setting up liquidity accounts for market:", marketPda.toString());
  console.log("YES Mint:", yesMint.toString());
  console.log("NO Mint:", noMint.toString());
  console.log("USDC Mint:", usdcMint.toString());

  // Derive liquidity account PDAs
  const [yesLiquidityAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("yes")],
    program.programId
  );

  const [noLiquidityAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("no")],
    program.programId
  );

  const [usdcLiquidityAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("usdc")],
    program.programId
  );

  console.log("\nLiquidity Account PDAs:");
  console.log("YES Liquidity:", yesLiquidityAccount.toString());
  console.log("NO Liquidity:", noLiquidityAccount.toString());
  console.log("USDC Liquidity:", usdcLiquidityAccount.toString());

  // Create associated token accounts for PDAs
  // Note: These accounts will be owned by the liquidity PDA addresses
  console.log("\nCreating liquidity token accounts...");
  
  let createdCount = 0;
  
  // Create YES liquidity account
  try {
    const yesAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer as Keypair,
      yesMint,
      yesLiquidityAccount,
      true // allowOwnerOffCurve for PDA
    );
    if (yesAta.address) {
      console.log("✅ YES liquidity account:", yesAta.address.toString());
      createdCount++;
    }
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("✅ YES liquidity account already exists");
    } else {
      console.log("⚠️  YES liquidity account:", err.message);
    }
  }

  // Create NO liquidity account
  try {
    const noAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer as Keypair,
      noMint,
      noLiquidityAccount,
      true
    );
    if (noAta.address) {
      console.log("✅ NO liquidity account:", noAta.address.toString());
      createdCount++;
    }
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("✅ NO liquidity account already exists");
    } else {
      console.log("⚠️  NO liquidity account:", err.message);
    }
  }

  // Create USDC liquidity account
  try {
    const usdcAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer as Keypair,
      usdcMint,
      usdcLiquidityAccount,
      true
    );
    if (usdcAta.address) {
      console.log("✅ USDC liquidity account:", usdcAta.address.toString());
      createdCount++;
    }
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("✅ USDC liquidity account already exists");
    } else {
      console.log("⚠️  USDC liquidity account:", err.message);
    }
  }

  if (createdCount > 0) {
    console.log(`\n✅ Successfully created ${createdCount} liquidity account(s)!`);
  } else {
    console.log("\n✅ All liquidity accounts already exist");
  }
}

// Get market PDA from command line argument
const marketPdaArg = process.argv[2];
if (!marketPdaArg) {
  console.error("Usage: ts-node scripts/setup-liquidity-accounts.ts <market_pda>");
  process.exit(1);
}

setupLiquidityAccounts(new PublicKey(marketPdaArg))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

