/**
 * Quick script to mint USDC to a user's wallet
 * Usage: npx ts-node scripts/mint-usdc-for-user.ts <USER_WALLET_ADDRESS>
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

async function mintUsdcToUser() {
  // Get user wallet address from command line
  const userWallet = process.argv[2];

  if (!userWallet) {
    console.error("Usage: npx ts-node scripts/mint-usdc-for-user.ts <USER_WALLET_ADDRESS>");
    console.error("\nExample:");
    console.error("npx ts-node scripts/mint-usdc-for-user.ts 7ovLUqT7P5peZDsw2Mb92uv5K2ANjsegCcYrGbMfcMB1");
    process.exit(1);
  }

  const marketPda = "7ovLUqT7P5peZDsw2Mb92uv5K2ANjsegCcYrGbMfcMB1";
  const usdcMint = new PublicKey("W7ezBiYC8qxgeDofYeRSnxrFAwri9i7oBpcC9czdLpT");

  console.log("\n🏦 Minting USDC to user wallet...");
  console.log("User:", userWallet);
  console.log("USDC Mint:", usdcMint.toString());

  // Connect to local validator
  const connection = new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899",
    "confirmed",
  );

  // Load local wallet (authority)
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authorityKeypair = Keypair.fromSecretKey(Buffer.from(keypairData));

  console.log("Authority:", authorityKeypair.publicKey.toString());

  const userPubkey = new PublicKey(userWallet);
  const amount = 1000 * 1_000_000; // 1000 USDC (6 decimals)

  // Get user's USDC token account
  const userUsdcAccount = await getAssociatedTokenAddress(
    usdcMint,
    userPubkey
  );

  console.log("User USDC Account:", userUsdcAccount.toString());

  const tx = new anchor.web3.Transaction();

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(userUsdcAccount);
  if (!accountInfo) {
    console.log("Creating associated token account...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        authorityKeypair.publicKey, // Payer
        userUsdcAccount,
        userPubkey, // Owner
        usdcMint
      )
    );
  } else {
    console.log("Token account already exists");
  }

  // Mint tokens
  console.log("Minting 1000 USDC...");
  tx.add(
    createMintToInstruction(
      usdcMint,
      userUsdcAccount,
      authorityKeypair.publicKey, // Mint authority
      amount
    )
  );

  // Send transaction
  const signature = await connection.sendTransaction(tx, [authorityKeypair]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("\n✅ Success!");
  console.log("Transaction:", signature);
  console.log(`Minted 1000 USDC to ${userWallet}`);
  console.log("\nYou can now use the frontend to trade!");
}

mintUsdcToUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
