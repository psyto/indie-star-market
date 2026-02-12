import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { recipient } = body;

        if (!recipient) {
            return NextResponse.json(
                { error: "Missing recipient" },
                { status: 400 }
            );
        }

        // Connect to local validator
        const connection = new Connection(
            process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899",
            "confirmed",
        );
        const recipientPubkey = new PublicKey(recipient);

        console.log(`Airdropping 1 SOL to ${recipient}`);

        const signature = await connection.requestAirdrop(
            recipientPubkey,
            1 * LAMPORTS_PER_SOL
        );

        await connection.confirmTransaction(signature);

        return NextResponse.json({ success: true, signature });
    } catch (error: any) {
        console.error("Airdrop API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to airdrop SOL" },
            { status: 500 }
        );
    }
}
