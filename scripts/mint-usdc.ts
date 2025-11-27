import * as anchor from "@coral-xyz/anchor";
import {
    PublicKey,
    Keypair,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { IndieStarMarket } from "../target/types/indie_star_market";
const idl = require("../target/idl/indie_star_market.json");

async function mintUsdc() {
    const marketPdaArg = process.argv[2];
    const recipientArg = process.argv[3];

    if (!marketPdaArg || !recipientArg) {
        console.error("Usage: yarn mint-usdc <MARKET_PDA> <RECIPIENT_ADDRESS> [AMOUNT]");
        process.exit(1);
    }

    let marketPda: PublicKey;
    let recipient: PublicKey;
    try {
        marketPda = new PublicKey(marketPdaArg);
        recipient = new PublicKey(recipientArg);
    } catch (e) {
        console.error("Invalid address format");
        process.exit(1);
    }

    const amount = process.argv[4] ? parseFloat(process.argv[4]) : 1000; // Default 1000 USDC

    // Set up provider
    let provider: anchor.AnchorProvider;
    try {
        provider = anchor.AnchorProvider.env();
    } catch (e) {
        const connection = new anchor.web3.Connection(
            process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899",
            "confirmed"
        );
        const wallet = new anchor.Wallet(Keypair.fromSecretKey(
            Buffer.from(JSON.parse(require("fs").readFileSync(require("os").homedir() + "/.config/solana/id.json", "utf-8")))
        ));
        provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    }
    anchor.setProvider(provider);

    // Fetch market account to get USDC mint
    const program = new Program(idl as any, provider);

    console.log(`Fetching market state for ${marketPda.toString()}...`);
    let usdcMint: PublicKey;

    try {
        // @ts-ignore
        const marketAccount = await program.account.marketState.fetch(marketPda);
        usdcMint = marketAccount.usdcMint;
        console.log(`Found USDC Mint: ${usdcMint.toString()}`);
    } catch (e) {
        console.error("Failed to fetch market account. Make sure the Market PDA is correct.");
        console.error(e);
        process.exit(1);
    }

    console.log(`Minting ${amount} USDC to ${recipient.toString()}...`);
    console.log(`USDC Mint: ${usdcMint.toString()}`);

    // Get/Create ATA
    const userUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        recipient
    );

    const tx = new anchor.web3.Transaction();

    // Check if account exists
    const accountInfo = await provider.connection.getAccountInfo(userUsdcAccount);
    if (!accountInfo) {
        console.log("Creating associated token account...");
        tx.add(
            createAssociatedTokenAccountInstruction(
                provider.wallet.publicKey,
                userUsdcAccount,
                recipient,
                usdcMint
            )
        );
    }

    // Mint tokens
    tx.add(
        createMintToInstruction(
            usdcMint,
            userUsdcAccount,
            provider.wallet.publicKey, // Mint authority
            amount * 1e6 // 6 decimals
        )
    );

    const signature = await provider.sendAndConfirm(tx);
    console.log("✅ Success! Transaction:", signature);
}

mintUsdc().catch(console.error);
