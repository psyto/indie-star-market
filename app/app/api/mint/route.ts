import { NextResponse } from "next/server";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

// Load IDL
const idlPath = path.resolve(process.cwd(), "../target/idl/indie_star_market.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { marketPda, recipient } = body;

        if (!marketPda || !recipient) {
            return NextResponse.json(
                { error: "Missing marketPda or recipient" },
                { status: 400 }
            );
        }

        // Connect to local validator
        const connection = new Connection("http://127.0.0.1:8899", "confirmed");

        // Load local wallet
        const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
        const walletKeypair = Keypair.fromSecretKey(Buffer.from(keypairData));
        const wallet = new anchor.Wallet(walletKeypair);

        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        anchor.setProvider(provider);

        // Initialize program to fetch market state
        // Anchor 0.30+ signature: new Program(idl, provider)
        // But we want to be safe, so we check if programId is needed or if it's in IDL
        const program = new anchor.Program(idl as any, provider);

        // Fetch market state to get USDC mint
        const marketPubkey = new PublicKey(marketPda);
        // Use bracket notation to avoid TS error about missing property on generic AccountNamespace
        const marketAccount = await (program.account as any)["marketState"].fetch(marketPubkey);

        // @ts-ignore
        const usdcMint = marketAccount.usdcMint;

        console.log(`Minting USDC to ${recipient}`);
        console.log(`USDC Mint: ${usdcMint.toString()}`);

        const recipientPubkey = new PublicKey(recipient);
        const amount = 1000 * 1_000_000; // 1000 USDC (6 decimals)

        // Get/Create ATA
        const userUsdcAccount = await getAssociatedTokenAddress(
            usdcMint,
            recipientPubkey
        );

        const tx = new anchor.web3.Transaction();

        // Check if account exists
        const accountInfo = await connection.getAccountInfo(userUsdcAccount);
        if (!accountInfo) {
            console.log("Creating associated token account...");
            tx.add(
                createAssociatedTokenAccountInstruction(
                    walletKeypair.publicKey, // Payer
                    userUsdcAccount,
                    recipientPubkey, // Owner
                    usdcMint
                )
            );
        }

        // Mint tokens
        tx.add(
            createMintToInstruction(
                usdcMint,
                userUsdcAccount,
                walletKeypair.publicKey, // Mint authority
                amount
            )
        );

        const signature = await provider.sendAndConfirm(tx, [walletKeypair]);

        return NextResponse.json({ success: true, signature, amount: 1000 });
    } catch (error: any) {
        console.error("Mint API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to mint USDC" },
            { status: 500 }
        );
    }
}
