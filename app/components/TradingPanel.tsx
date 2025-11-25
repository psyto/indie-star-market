"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface TradingPanelProps {
  marketPda: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  usdcMint: PublicKey;
  program: Program<any> | null;
}

export function TradingPanel({
  marketPda,
  yesMint,
  noMint,
  usdcMint,
  program,
}: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet();
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handleTrade = async () => {
    if (!program || !publicKey || !amount) {
      setStatus("Please connect wallet and enter amount");
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing transaction...");

      const amountBN = new BN(parseFloat(amount) * 1e6); // Convert to smallest unit (assuming 6 decimals for USDC)

      if (action === "buy") {
        // Derive liquidity account PDAs
        const [yesLiquidityAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("liquidity"),
            marketPda.toBuffer(),
            Buffer.from("yes"),
          ],
          program.programId
        );

        const [noLiquidityAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("liquidity"),
            marketPda.toBuffer(),
            Buffer.from("no"),
          ],
          program.programId
        );

        const [usdcLiquidityAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("liquidity"),
            marketPda.toBuffer(),
            Buffer.from("usdc"),
          ],
          program.programId
        );

        // Get user token accounts
        const userTokenMint = outcome === "yes" ? yesMint : noMint;
        const userTokenAccount = await getAssociatedTokenAddress(
          userTokenMint,
          publicKey
        );

        const userUsdcAccount = await getAssociatedTokenAddress(
          usdcMint,
          publicKey
        );

        setStatus("Sending transaction...");

        const outcomeEnum = outcome === "yes" ? { yes: {} } : { no: {} };
        const accounts = {
          market: marketPda,
          user: publicKey,
          yesMint: yesMint,
          noMint: noMint,
          userTokenAccount: userTokenAccount,
          userUsdcAccount: userUsdcAccount,
          yesLiquidityAccount: yesLiquidityAccount,
          noLiquidityAccount: noLiquidityAccount,
          usdcLiquidityAccount: usdcLiquidityAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        };

        const tx = await (program.methods as any)
          .buyTokens(amountBN, outcomeEnum)
          .accounts(accounts)
          .rpc();

        setStatus(`✅ Success! Transaction: ${tx}`);
      } else {
        // Sell logic would go here
        setStatus("Sell functionality coming soon...");
      }

      setAmount("");
    } catch (err: any) {
      console.error("Trading error:", err);
      setStatus(`❌ Error: ${err.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Trade Tokens
      </h3>

      {/* Action Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAction("buy")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            action === "buy"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setAction("sell")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            action === "sell"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOutcome("yes")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            outcome === "yes"
              ? "bg-green-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setOutcome("no")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            outcome === "no"
              ? "bg-red-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          NO
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Amount ({action === "buy" ? "USDC" : "Tokens"})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleTrade}
        disabled={loading || !publicKey || !amount}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {loading ? "Processing..." : `${action === "buy" ? "Buy" : "Sell"} ${outcome.toUpperCase()} Tokens`}
      </button>

      {/* Status Message */}
      {status && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {status}
        </p>
      )}
    </div>
  );
}

