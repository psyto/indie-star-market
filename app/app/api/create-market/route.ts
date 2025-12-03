import { NextResponse } from "next/server";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

// Load IDL - try multiple possible paths
let idl: any;
try {
  // Try from app directory (when running from app/)
  const idlPath1 = path.resolve(process.cwd(), "../../target/idl/indie_star_market.json");
  if (fs.existsSync(idlPath1)) {
    idl = JSON.parse(fs.readFileSync(idlPath1, "utf-8"));
  } else {
    // Try from root directory (when running from root)
    const idlPath2 = path.resolve(process.cwd(), "../target/idl/indie_star_market.json");
    idl = JSON.parse(fs.readFileSync(idlPath2, "utf-8"));
  }
} catch (error) {
  console.error("Failed to load IDL:", error);
  throw new Error("IDL file not found. Please run 'anchor build' first.");
}

// Local Wallet implementation
class NodeWallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction(tx: any) {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(txs: any[]) {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }

  get publicKey() {
    return this.payer.publicKey;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, fundraisingGoal, deadlineDays } = body;

    // Validate inputs
    if (!projectName || projectName.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const goal = fundraisingGoal ? parseInt(fundraisingGoal) : 100000; // Default 100k USDC
    const days = deadlineDays ? parseInt(deadlineDays) : 30; // Default 30 days
    const deadline = Math.floor(Date.now() / 1000) + 86400 * days;

    // Connect to local validator
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");

    // Load local wallet
    const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const walletKeypair = Keypair.fromSecretKey(Buffer.from(keypairData));
    const wallet = new NodeWallet(walletKeypair);

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Initialize program
    const program = new anchor.Program(idl as any, provider);
    const authority = wallet;

    // Check if we're on localnet (need to create mock USDC) or devnet/mainnet
    const isLocalnet = connection.rpcEndpoint.includes("127.0.0.1") ||
      connection.rpcEndpoint.includes("localhost");

    let usdcMint: PublicKey;

    if (isLocalnet) {
      // For localnet, create a mock USDC mint
      console.log("Creating mock USDC mint for localnet...");
      const usdcKeypair = Keypair.generate();
      const mintRent = await getMinimumBalanceForRentExemptMint(connection);

      const createUsdcTx = new anchor.web3.Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: authority.publicKey,
          newAccountPubkey: usdcKeypair.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          usdcKeypair.publicKey,
          6, // USDC has 6 decimals
          authority.publicKey,
          null // No freeze authority
        )
      );

      await provider.sendAndConfirm(createUsdcTx, [usdcKeypair]);
      usdcMint = usdcKeypair.publicKey;
      console.log("Mock USDC mint created:", usdcMint.toString());
    } else {
      // For devnet/mainnet, use real USDC mint
      // Devnet USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
      // Mainnet USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
      usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    }

    // Create YES token mint
    console.log("Creating YES token mint...");
    const yesKeypair = Keypair.generate();
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);

    const createYesTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: yesKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        yesKeypair.publicKey,
        9, // Standard SPL token decimals
        authority.publicKey,
        null
      )
    );

    await provider.sendAndConfirm(createYesTx, [yesKeypair]);
    console.log("YES mint created:", yesKeypair.publicKey.toString());

    // Create NO token mint
    console.log("Creating NO token mint...");
    const noKeypair = Keypair.generate();
    const createNoTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: noKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        noKeypair.publicKey,
        9,
        authority.publicKey,
        null
      )
    );

    await provider.sendAndConfirm(createNoTx, [noKeypair]);
    console.log("NO mint created:", noKeypair.publicKey.toString());

    // Derive Market PDA
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_v2"),
        authority.publicKey.toBuffer(),
        Buffer.from(projectName),
      ],
      program.programId
    );

    console.log("Market PDA:", marketPda.toString());

    // Initialize market
    const initTx = await program.methods
      .initialize(
        new anchor.BN(goal),
        new anchor.BN(deadline),
        projectName
      )
      .accounts({
        authority: authority.publicKey,
        yesMint: yesKeypair.publicKey,
        noMint: noKeypair.publicKey,
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

    console.log("Market initialized! Transaction:", initTx);

    // Transfer mint authority to Market PDA
    console.log("Transferring mint authority to Market PDA...");

    const transferYesAuthTx = new anchor.web3.Transaction().add(
      createSetAuthorityInstruction(
        yesKeypair.publicKey,
        authority.publicKey,
        AuthorityType.MintTokens,
        marketPda
      )
    );
    await provider.sendAndConfirm(transferYesAuthTx, [walletKeypair]);
    console.log("Transferred YES mint authority");

    const transferNoAuthTx = new anchor.web3.Transaction().add(
      createSetAuthorityInstruction(
        noKeypair.publicKey,
        authority.publicKey,
        AuthorityType.MintTokens,
        marketPda
      )
    );
    await provider.sendAndConfirm(transferNoAuthTx, [walletKeypair]);
    console.log("Transferred NO mint authority");

    // Fetch market state
    const marketAccount = await (program.account as any)["marketState"].fetch(marketPda);

    return NextResponse.json({
      success: true,
      marketPda: marketPda.toString(),
      yesMint: yesKeypair.publicKey.toString(),
      noMint: noKeypair.publicKey.toString(),
      usdcMint: usdcMint.toString(),
      transaction: initTx,
      marketState: {
        projectName: marketAccount.projectName?.toString(),
        fundraisingGoal: marketAccount.fundraisingGoal?.toString(),
        deadline: marketAccount.deadline?.toString(),
      },
    });
  } catch (error: any) {
    console.error("Create Market API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create market" },
      { status: 500 }
    );
  }
}

