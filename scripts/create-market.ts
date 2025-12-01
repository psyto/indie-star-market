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
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";

async function createMarket() {
  // Set up provider
  // For local testing: ensure solana-test-validator is running
  // For devnet/mainnet: set ANCHOR_PROVIDER_URL and ANCHOR_WALLET env vars
  let provider: anchor.AnchorProvider;

  try {
    provider = anchor.AnchorProvider.env();
  } catch (e) {
    // Fallback to local provider if env vars not set
    const connection = new anchor.web3.Connection(
      process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899",
      "confirmed"
    );

    // Try to load local wallet from default path
    let wallet: anchor.Wallet;
    try {
      const fs = require("fs");
      const os = require("os");
      const keypairData = JSON.parse(fs.readFileSync(os.homedir() + "/.config/solana/id.json", "utf-8"));
      const keypair = Keypair.fromSecretKey(Buffer.from(keypairData));
      wallet = new anchor.Wallet(keypair);
      console.log("Loaded local wallet from ~/.config/solana/id.json");
    } catch (err) {
      console.log("Could not load local wallet, generating a new one...");
      const keypair = Keypair.generate();
      wallet = new anchor.Wallet(keypair);
    }

    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    console.log("Using local provider. Make sure solana-test-validator is running!");
    console.log("Wallet:", wallet.publicKey.toString());
    console.log("\nTo start a local validator, run: solana-test-validator");
    console.log("Or set ANCHOR_PROVIDER_URL and ANCHOR_WALLET for devnet/mainnet\n");

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

  // Market parameters
  const authority = provider.wallet as anchor.Wallet;
  const fundraisingGoal = 100000; // 100k USDC
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const projectName = `Indie Project ${Date.now()}`; // Unique name to ensure fresh PDA

  // Determine if we're on localnet (need to create mock USDC) or devnet/mainnet (use real USDC)
  const isLocalnet = provider.connection.rpcEndpoint.includes("127.0.0.1") ||
    provider.connection.rpcEndpoint.includes("localhost");

  let usdcMint: PublicKey;

  if (isLocalnet) {
    // For local testing, we'll create a mock USDC mint
    console.log("Detected localnet - will create mock USDC mint");
    usdcMint = Keypair.generate().publicKey; // Will be created below
  } else {
    // Use real USDC mint for devnet/mainnet
    usdcMint = new PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC on mainnet/devnet
    );
    console.log("Using real USDC mint:", usdcMint.toString());
  }

  console.log("\nCreating prediction market...");
  console.log("Project:", projectName);
  console.log("Goal:", fundraisingGoal, "USDC");
  console.log("Deadline:", new Date(deadline * 1000).toISOString());

  // Step 0: Create USDC mint (if localnet)
  let usdcMintKeypair: Keypair | null = null;
  if (isLocalnet) {
    console.log("\n0. Creating mock USDC token mint...");
    usdcMintKeypair = Keypair.generate();
    const usdcMintRent = await getMinimumBalanceForRentExemptMint(
      provider.connection
    );

    const createUsdcMintTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: usdcMintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: usdcMintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        usdcMintKeypair.publicKey,
        6, // USDC uses 6 decimals
        authority.publicKey,
        null
      )
    );

    await provider.sendAndConfirm(createUsdcMintTx, [authority.payer, usdcMintKeypair]);
    usdcMint = usdcMintKeypair.publicKey;
    console.log("Mock USDC mint:", usdcMint.toString());
  }

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

  // Step 3: Check if program is deployed
  console.log("\n3. Checking if program is deployed...");
  try {
    const programInfo = await provider.connection.getAccountInfo(program.programId);
    if (!programInfo) {
      console.error("❌ Error: Program not deployed!");
      console.error("\nPlease deploy the program first:");
      console.error("  anchor deploy");
      console.error("\nOr for local testing:");
      console.error("  anchor build");
      console.error("  anchor deploy --provider.cluster localnet");
      process.exit(1);
    }
    console.log("✅ Program found at:", program.programId.toString());
  } catch (err) {
    console.error("❌ Error checking program:", err);
    process.exit(1);
  }

  // Step 4: Initialize market (Anchor will automatically derive the market PDA)
  console.log("\n4. Initializing market...");

  // Derive market PDA for display  // Derive Market PDA
  const [marketPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("market_v2"),
      authority.publicKey.toBuffer(),
      Buffer.from(projectName),
    ],
    program.programId
  );
  console.log("Market PDA:", marketPda.toString());

  try {
    const tx = await program.methods
      .initialize(
        new anchor.BN(fundraisingGoal),
        new anchor.BN(deadline),
        projectName
      )
      .accounts({
        authority: authority.publicKey,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        usdcMint: usdcMint,
        yesLiquidityAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("yes")],
          program.programId
        )[0],
        noLiquidityAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("no")],
          program.programId
        )[0],
        usdcLiquidityAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("usdc")],
          program.programId
        )[0],
      } as any)
      .rpc();

    console.log("Market initialized! Transaction:", tx);

    // Transfer mint authority to Market PDA
    console.log("\nTransferring mint authority to Market PDA...");

    const transferYesAuthTx = new anchor.web3.Transaction().add(
      createSetAuthorityInstruction(
        yesMint.publicKey,
        authority.publicKey,
        AuthorityType.MintTokens,
        marketPda
      )
    );
    await provider.sendAndConfirm(transferYesAuthTx, [authority.payer]);
    console.log("Transferred YES mint authority");

    const transferNoAuthTx = new anchor.web3.Transaction().add(
      createSetAuthorityInstruction(
        noMint.publicKey,
        authority.publicKey,
        AuthorityType.MintTokens,
        marketPda
      )
    );
    await provider.sendAndConfirm(transferNoAuthTx, [authority.payer]);
    console.log("Transferred NO mint authority");

    // Fetch market state
    const marketAccount = await program.account.marketState.fetch(marketPda);
    console.log("\nMarket State:");
    console.log("  Project:", marketAccount.projectName);
    console.log("  Goal:", marketAccount.fundraisingGoal.toString(), "USDC");
    console.log("  Deadline:", new Date(marketAccount.deadline.toNumber() * 1000).toISOString());
    console.log("  YES Mint:", marketAccount.yesMint.toString());
    console.log("  NO Mint:", marketAccount.noMint.toString());
    console.log("  Settled:", marketAccount.isSettled);
  } catch (err: any) {
    if (err.message?.includes("ECONNREFUSED")) {
      console.error("\n❌ Error: Cannot connect to Solana cluster.");
      console.error("Make sure solana-test-validator is running, or set ANCHOR_PROVIDER_URL for devnet/mainnet.");
      console.error("\nTo start local validator:");
      console.error("  solana-test-validator");
      console.error("\nOr use devnet:");
      console.error("  export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com");
      console.error("  export ANCHOR_WALLET=~/.config/solana/id.json");
    } else if (err.message?.includes("program that does not exist")) {
      console.error("\n❌ Error: Program not deployed to this cluster!");
      console.error("\nPlease deploy the program first:");
      console.error("  anchor deploy");
      console.error("\nOr for local testing:");
      console.error("  anchor build");
      console.error("  anchor deploy --provider.cluster localnet");
    } else {
      console.error("Error initializing market:", err);
    }
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

