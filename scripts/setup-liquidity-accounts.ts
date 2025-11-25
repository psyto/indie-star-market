/**
 * Helper script to create liquidity token accounts for a market
 * These accounts hold the YES/NO tokens and USDC for the AMM
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IndieStarMarket } from "../target/types/indie_star_market";
import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function setupLiquidityAccounts(marketPda: PublicKey) {
  const provider = anchor.AnchorProvider.env();
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

  // Create associated token accounts
  const instructions = [];

  // Create YES liquidity account
  try {
    const yesAta = await getAssociatedTokenAddress(
      yesMint,
      yesLiquidityAccount,
      true // allowOwnerOffCurve
    );
    instructions.push(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        yesAta,
        yesLiquidityAccount,
        yesMint
      )
    );
  } catch (err) {
    console.log("YES liquidity account may already exist");
  }

  // Create NO liquidity account
  try {
    const noAta = await getAssociatedTokenAddress(
      noMint,
      noLiquidityAccount,
      true
    );
    instructions.push(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        noAta,
        noLiquidityAccount,
        noMint
      )
    );
  } catch (err) {
    console.log("NO liquidity account may already exist");
  }

  // Create USDC liquidity account
  try {
    const usdcAta = await getAssociatedTokenAddress(
      usdcMint,
      usdcLiquidityAccount,
      true
    );
    instructions.push(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        usdcAta,
        usdcLiquidityAccount,
        usdcMint
      )
    );
  } catch (err) {
    console.log("USDC liquidity account may already exist");
  }

  if (instructions.length > 0) {
    const tx = await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(...instructions)
    );
    console.log("\n✅ Liquidity accounts created! Transaction:", tx);
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

