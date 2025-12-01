"use client";

import { useState, useEffect } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface TradingPanelProps {
  marketPda: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  usdcMint: PublicKey;
  program: Program<any> | null;
  marketData?: any;
  onTransactionComplete?: () => void;
}

export function TradingPanelEnhanced({
  marketPda,
  yesMint,
  noMint,
  usdcMint,
  program,
  marketData,
  onTransactionComplete,
}: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [preview, setPreview] = useState<string>("");

  // Calculate price preview
  useEffect(() => {
    if (!amount || !marketData || parseFloat(amount) <= 0) {
      setPreview("");
      return;
    }

    try {
      const amountNum = parseFloat(amount);
      const yesLiq = marketData.yesLiquidity?.toNumber() || 0;
      const noLiq = marketData.noLiquidity?.toNumber() || 0;
      const usdcLiq = marketData.usdcLiquidity?.toNumber() || 0;

      if (action === "buy") {
        // Buying tokens with USDC
        const amountUsdcLamports = amountNum * 1e6; // USDC has 6 decimals
        const currentLiquidity = outcome === "yes" ? yesLiq : noLiq;

        let tokensOut;
        if (currentLiquidity === 0 || usdcLiq === 0) {
          // Initial 1:1 ratio (but tokens have 9 decimals, USDC has 6)
          tokensOut = amountUsdcLamports * 1000; // Convert 6 decimals to 9 decimals
        } else {
          // AMM formula: tokens_out = (amount_usdc * current_liquidity) / (usdc_liquidity + amount_usdc)
          tokensOut = (amountUsdcLamports * currentLiquidity) / (usdcLiq + amountUsdcLamports);
        }

        const tokensOutHuman = tokensOut / 1e9;
        const pricePerToken = amountNum / tokensOutHuman;
        setPreview(`You will receive ~${tokensOutHuman.toFixed(4)} ${outcome.toUpperCase()} tokens (~$${pricePerToken.toFixed(4)}/token)`);
      } else {
        // Selling tokens for USDC
        const amountTokensLamports = amountNum * 1e9; // Tokens have 9 decimals
        const currentLiquidity = outcome === "yes" ? yesLiq : noLiq;

        if (currentLiquidity === 0 || usdcLiq === 0) {
          setPreview("No liquidity available");
          return;
        }

        // AMM formula: usdc_out = (amount_tokens * usdc_liquidity) / (current_liquidity + amount_tokens)
        const usdcOut = (amountTokensLamports * usdcLiq) / (currentLiquidity + amountTokensLamports);
        const usdcOutHuman = usdcOut / 1e6;
        const pricePerToken = usdcOutHuman / amountNum;
        setPreview(`You will receive ~$${usdcOutHuman.toFixed(4)} USDC (~$${pricePerToken.toFixed(4)}/token)`);
      }
    } catch (err) {
      console.error("Preview calculation error:", err);
      setPreview("");
    }
  }, [amount, action, outcome, marketData]);

  const handleTrade = async () => {
    if (!program || !publicKey || !amount || parseFloat(amount) <= 0) {
      setStatus("❌ Please connect wallet and enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing transaction...");

      const amountNum = parseFloat(amount);

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

      // Get user token accounts
      const userTokenMint = outcome === "yes" ? yesMint : noMint;
      const userTokenAccount = await getAssociatedTokenAddress(userTokenMint, publicKey);
      const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, publicKey);

      const transaction = new Transaction();

      if (action === "buy") {
        const amountBN = new BN(amountNum * 1e6); // USDC has 6 decimals

        // Check USDC balance
        try {
          const usdcAccountInfo = await getAccount(connection, userUsdcAccount);
          const balance = new BN(usdcAccountInfo.amount.toString());
          if (balance.lt(amountBN)) {
            throw new Error(`Insufficient USDC. You have ${Number(usdcAccountInfo.amount) / 1e6} USDC, need ${amountNum}`);
          }
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            throw new Error("USDC account not found. Please fund your wallet with USDC first.");
          }
          if (e.message.includes("Insufficient")) throw e;
          throw new Error("Could not verify USDC balance.");
        }

        // Check if user token account exists
        try {
          await getAccount(connection, userTokenAccount);
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            console.log("Creating token account for", outcome.toUpperCase());
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                userTokenAccount,
                publicKey,
                userTokenMint
              )
            );
          }
        }

        setStatus("Creating buy instruction...");

        const outcomeEnum = outcome === "yes" ? { yes: {} } : { no: {} };
        const accounts = {
          market: marketPda,
          user: publicKey,
          yesMint,
          noMint,
          userTokenAccount,
          userUsdcAccount,
          yesLiquidityAccount,
          noLiquidityAccount,
          usdcLiquidityAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        };

        // Try to build instruction using Anchor
        let instruction;
        try {
          instruction = await (program.methods as any)
            .buyTokens(amountBN, outcomeEnum)
            .accounts(accounts)
            .instruction();
        } catch (err) {
          // Fallback to manual encoding if needed
          console.log("Using manual instruction encoding");
          const outcomeU8 = outcome === "yes" ? 0 : 1;
          const originalIdl = (program as any)._idl;
          const buyTokensIx = originalIdl?.instructions.find((ix: any) => ix.name === "buy_tokens");

          if (!buyTokensIx?.discriminator) throw new Error("Could not find instruction");

          const discriminator = Buffer.from(buyTokensIx.discriminator);
          const amountBuffer = Buffer.allocUnsafe(8);
          amountBuffer.writeBigUInt64LE(BigInt(amountBN.toString()), 0);
          const argsBuffer = Buffer.concat([amountBuffer, Buffer.from([outcomeU8])]);
          const instructionData = Buffer.concat([discriminator, argsBuffer]);

          instruction = {
            keys: [
              { pubkey: accounts.market, isSigner: false, isWritable: true },
              { pubkey: accounts.user, isSigner: true, isWritable: true },
              { pubkey: accounts.yesMint, isSigner: false, isWritable: true },
              { pubkey: accounts.noMint, isSigner: false, isWritable: true },
              { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.userUsdcAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.yesLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.noLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.usdcLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
            ],
            programId: program.programId,
            data: instructionData,
          };
        }

        transaction.add(instruction);
      } else {
        // SELL
        const amountTokensBN = new BN(amountNum * 1e9); // Tokens have 9 decimals

        // Check token balance
        try {
          const tokenAccountInfo = await getAccount(connection, userTokenAccount);
          const balance = new BN(tokenAccountInfo.amount.toString());
          if (balance.lt(amountTokensBN)) {
            throw new Error(`Insufficient ${outcome.toUpperCase()} tokens. You have ${Number(tokenAccountInfo.amount) / 1e9}, need ${amountNum}`);
          }
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            throw new Error(`You don't have any ${outcome.toUpperCase()} tokens to sell.`);
          }
          if (e.message.includes("Insufficient")) throw e;
          throw new Error("Could not verify token balance.");
        }

        // Check if USDC account exists
        try {
          await getAccount(connection, userUsdcAccount);
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            console.log("Creating USDC account");
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                userUsdcAccount,
                publicKey,
                usdcMint
              )
            );
          }
        }

        setStatus("Creating sell instruction...");

        const outcomeEnum = outcome === "yes" ? { yes: {} } : { no: {} };
        const accounts = {
          market: marketPda,
          user: publicKey,
          yesMint,
          noMint,
          userTokenAccount,
          userUsdcAccount,
          yesLiquidityAccount,
          noLiquidityAccount,
          usdcLiquidityAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        };

        let instruction;
        try {
          instruction = await (program.methods as any)
            .sellTokens(amountTokensBN, outcomeEnum)
            .accounts(accounts)
            .instruction();
        } catch (err) {
          console.log("Using manual instruction encoding for sell");
          const outcomeU8 = outcome === "yes" ? 0 : 1;
          const originalIdl = (program as any)._idl;
          const sellTokensIx = originalIdl?.instructions.find((ix: any) => ix.name === "sell_tokens");

          if (!sellTokensIx?.discriminator) throw new Error("Could not find sell instruction");

          const discriminator = Buffer.from(sellTokensIx.discriminator);
          const amountBuffer = Buffer.allocUnsafe(8);
          amountBuffer.writeBigUInt64LE(BigInt(amountTokensBN.toString()), 0);
          const argsBuffer = Buffer.concat([amountBuffer, Buffer.from([outcomeU8])]);
          const instructionData = Buffer.concat([discriminator, argsBuffer]);

          instruction = {
            keys: [
              { pubkey: accounts.market, isSigner: false, isWritable: true },
              { pubkey: accounts.user, isSigner: true, isWritable: true },
              { pubkey: accounts.yesMint, isSigner: false, isWritable: true },
              { pubkey: accounts.noMint, isSigner: false, isWritable: true },
              { pubkey: accounts.userTokenAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.userUsdcAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.yesLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.noLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.usdcLiquidityAccount, isSigner: false, isWritable: true },
              { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
            ],
            programId: program.programId,
            data: instructionData,
          };
        }

        transaction.add(instruction);
      }

      // Send transaction
      setStatus("Sending transaction...");
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      if (!signTransaction) throw new Error("Wallet not connected");

      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      setStatus("Confirming transaction...");
      await connection.confirmTransaction(signature, "confirmed");

      setStatus(`✅ Success! Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      setAmount("");

      // Trigger refresh with multiple attempts to account for RPC lag
      if (onTransactionComplete) {
        console.log("🔄 Triggering portfolio refresh...");
        // Immediate refresh
        onTransactionComplete();
        // Follow-up refreshes to catch RPC updates
        setTimeout(() => {
          console.log("✅ Refresh attempt 2");
          onTransactionComplete();
        }, 2000);
        setTimeout(() => {
          console.log("✅ Refresh attempt 3");
          onTransactionComplete();
        }, 4000);
      }
    } catch (err: any) {
      console.error("Trading error:", err);
      let errorMessage = err.message || "Transaction failed";

      // Better error messages
      if (errorMessage.includes("0x1")) {
        errorMessage = "Insufficient funds or account not initialized";
      } else if (errorMessage.includes("MarketSettled")) {
        errorMessage = "Market has already been settled. Trading is closed.";
      } else if (errorMessage.includes("DeadlinePassed")) {
        errorMessage = "Market deadline has passed. Trading is closed.";
      }

      setStatus(`❌ Error: ${errorMessage}`);
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
          min="0"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Price Preview */}
      {preview && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
            📊 Price Preview
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
            {preview}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleTrade}
        disabled={loading || !publicKey || !amount || parseFloat(amount) <= 0}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {loading ? "Processing..." : `${action === "buy" ? "Buy" : "Sell"} ${outcome.toUpperCase()} Tokens`}
      </button>

      {/* Status Message */}
      {status && (
        <div className={`mt-4 p-3 rounded-lg ${
          status.includes("✅")
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : status.includes("❌")
            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        }`}>
          <p className={`text-sm ${
            status.includes("✅")
              ? "text-green-800 dark:text-green-200"
              : status.includes("❌")
              ? "text-red-800 dark:text-red-200"
              : "text-blue-800 dark:text-blue-200"
          }`}>
            {status}
          </p>
        </div>
      )}

      {/* Helper Buttons for Testing */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Testing on Localnet? Need funds?
        </p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!publicKey) {
                setStatus("Please connect wallet first");
                return;
              }
              try {
                setLoading(true);
                setStatus("Airdropping 1 SOL...");
                const res = await fetch("/api/airdrop", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    recipient: publicKey.toString(),
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setStatus(`✅ Airdropped 1 SOL! Tx: ${data.signature.slice(0, 8)}...`);
                } else {
                  throw new Error(data.error);
                }
              } catch (e: any) {
                console.error(e);
                setStatus(`❌ Airdrop failed: ${e.message}`);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !publicKey}
            className="flex-1 py-2 px-4 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-300 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💧 Airdrop 1 SOL
          </button>
          <button
            onClick={async () => {
              if (!publicKey) {
                setStatus("Please connect wallet first");
                return;
              }
              try {
                setLoading(true);
                setStatus("Minting 1000 USDC...");
                const res = await fetch("/api/mint", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    marketPda: marketPda.toString(),
                    recipient: publicKey.toString(),
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setStatus(`✅ Minted 1000 USDC! Tx: ${data.signature.slice(0, 8)}...`);
                } else {
                  throw new Error(data.error);
                }
              } catch (e: any) {
                console.error(e);
                setStatus(`❌ Mint failed: ${e.message}`);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !publicKey}
            className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💸 Mint 1k USDC
          </button>
        </div>
      </div>
    </div>
  );
}
