"use client";

import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
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

        // Outcome enum format for Anchor
        // Anchor expects enum variants as objects with the variant name as key
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

        // Verify program methods are available
        if (!program.methods) {
          throw new Error("Program methods not available. Program may not be initialized correctly.");
        }

        // Anchor converts snake_case instruction names to camelCase
        // So buy_tokens becomes buyTokens
        const methodName = "buyTokens";
        if (!(program.methods as any)[methodName]) {
          // Try snake_case as fallback
          const snakeCaseMethod = "buy_tokens";
          if ((program.methods as any)[snakeCaseMethod]) {
            console.warn(`Using snake_case method name: ${snakeCaseMethod}`);
            const tx = await (program.methods as any)[snakeCaseMethod](amountBN, outcomeEnum)
              .accounts(accounts)
              .rpc();
            setStatus(`✅ Success! Transaction: ${tx}`);
            setAmount("");
            return;
          }
          throw new Error(`${methodName} method not found. Available methods: ${Object.keys(program.methods || {}).join(", ")}`);
        }

        console.log("Calling buyTokens with:", { amountBN: amountBN.toString(), outcomeEnum, accounts });
        console.log("Program methods available:", Object.keys(program.methods || {}));
        console.log("Program coder:", (program as any).coder);
        console.log("Instruction coder:", (program as any).coder?.instructions);

        try {
          // Try normal method first
          const tx = await (program.methods as any)[methodName](amountBN, outcomeEnum)
            .accounts(accounts)
            .rpc();
          
          setStatus(`✅ Success! Transaction: ${tx}`);
          setAmount("");
        } catch (encodeError: any) {
          console.error("Encoding error details:", encodeError);
          console.error("Error stack:", encodeError.stack);
          
          // If enum encoding fails, try manual encoding with u8 enum replacement
          if (encodeError.message?.includes("encode") || encodeError.message?.includes("undefined")) {
            console.log("Attempting manual instruction encoding with u8 enum...");
            
            try {
              // Use encoding coder if available (with u8 enum replacement)
              const encodingCoder = (program as any)._encodingCoder;
              if (!encodingCoder) {
                throw new Error("Encoding coder not available");
              }
              
              // Encode enum as u8: 0 for Yes, 1 for No
              const outcomeU8 = outcome === "yes" ? 0 : 1;
              
              // Get discriminator from original IDL (attached to program)
              const originalIdl = (program as any)._idl;
              if (!originalIdl || !originalIdl.instructions) {
                throw new Error("Original IDL not available on program");
              }
              
              const buyTokensIx = originalIdl.instructions.find((ix: any) => ix.name === "buy_tokens");
              if (!buyTokensIx || !buyTokensIx.discriminator) {
                throw new Error("Could not find buy_tokens instruction discriminator in IDL");
              }
              
              // Manually encode instruction arguments
              // Manual encoding: discriminator + args
              const discriminator = Buffer.from(buyTokensIx.discriminator);
              
              // Encode args manually
              // amount_usdc: u64 (8 bytes, little-endian)
              // outcome: u8 (1 byte)
              const amountBuffer = Buffer.allocUnsafe(8);
              amountBuffer.writeBigUInt64LE(BigInt(amountBN.toString()), 0);
              
              const argsBuffer = Buffer.concat([
                amountBuffer,
                Buffer.from([outcomeU8])
              ]);
              
              const instructionData = Buffer.concat([discriminator, argsBuffer]);
              
              console.log("Encoded instruction data length:", instructionData.length);
              console.log("Discriminator:", Array.from(discriminator));
              console.log("Args:", { amount_usdc: amountBN.toString(), outcome: outcomeU8 });
              
              // Build transaction manually
              const transaction = new Transaction();
              
              // Add instruction with manually encoded data
              transaction.add({
                keys: [
                  { pubkey: accounts.market, isSigner: false, isWritable: true },
                  { pubkey: accounts.user, isSigner: true, isWritable: true },
                  { pubkey: accounts.yesMint, isSigner: false, isWritable: false },
                  { pubkey: accounts.noMint, isSigner: false, isWritable: false },
                  { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
                  { pubkey: accounts.userUsdcAccount, isSigner: false, isWritable: true },
                  { pubkey: accounts.yesLiquidityAccount, isSigner: false, isWritable: true },
                  { pubkey: accounts.noLiquidityAccount, isSigner: false, isWritable: true },
                  { pubkey: accounts.usdcLiquidityAccount, isSigner: false, isWritable: true },
                  { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
                ],
                programId: program.programId,
                data: instructionData,
              });
              
              // Get recent blockhash
              const { blockhash } = await connection.getLatestBlockhash();
              transaction.recentBlockhash = blockhash;
              transaction.feePayer = publicKey;
              
              // Sign and send transaction using wallet adapter
              if (!signTransaction) {
                throw new Error("Wallet signTransaction not available");
              }
              
              const signedTx = await signTransaction(transaction);
              const signature = await connection.sendRawTransaction(signedTx.serialize());
              
              // Wait for confirmation
              await connection.confirmTransaction(signature, "confirmed");
              
              setStatus(`✅ Success! Transaction: ${signature}`);
              setAmount("");
            } catch (manualError: any) {
              console.error("Manual encoding also failed:", manualError);
              throw new Error(
                `Failed to encode instruction arguments. ` +
                `Tried both normal and manual encoding. ` +
                `Error: ${encodeError.message}`
              );
            }
          } else {
            throw encodeError;
          }
        }
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

