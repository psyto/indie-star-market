"use client";

import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
  const { connection } = useConnection();
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

        // Check if user has USDC balance
        try {
          const usdcAccountInfo = await getAccount(connection, userUsdcAccount);
          const balance = new BN(usdcAccountInfo.amount.toString());
          if (balance.lt(amountBN)) {
            throw new Error(`Insufficient USDC balance. You have ${Number(usdcAccountInfo.amount) / 1e6} USDC.`);
          }
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            throw new Error("USDC account not found. Please fund your wallet with USDC.");
          }
          // If it's another error, we might still want to proceed or rethrow
          // But for now let's assume if we can't read it, it might not exist or RPC issue
          console.error("Error checking USDC balance:", e);
          // If we can't verify balance, we should probably warn but maybe let it fail on chain?
          // Better to fail early if we are sure.
          if (e.message.includes("Insufficient")) throw e;
          throw new Error("Could not verify USDC balance. Please ensure you have USDC.");
        }

        setStatus("Sending transaction...");

        const transaction = new Transaction();

        // Check if user token account exists, if not add creation instruction
        try {
          await getAccount(connection, userTokenAccount);
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError" || e.message?.includes("doesn't exist")) {
            console.log("Adding create ATA instruction for", userTokenAccount.toString());
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

        // Outcome enum format for Anchor
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

        // Instead of calling .rpc() directly which sends a separate transaction,
        // we want to add the instruction to our transaction object if we added an ATA creation ix.
        // However, Anchor's methods().instruction() returns a TransactionInstruction.

        let instruction;
        const methodName = "buyTokens";

        // Helper to get instruction
        const getInstruction = async () => {
          if ((program.methods as any)[methodName]) {
            return await (program.methods as any)[methodName](amountBN, outcomeEnum)
              .accounts(accounts)
              .instruction();
          }
          const snakeCaseMethod = "buy_tokens";
          if ((program.methods as any)[snakeCaseMethod]) {
            return await (program.methods as any)[snakeCaseMethod](amountBN, outcomeEnum)
              .accounts(accounts)
              .instruction();
          }
          throw new Error("Method not found");
        };

        try {
          instruction = await getInstruction();
        } catch (err) {
          // Fallback to manual encoding if method not found or encoding fails
          console.log("Anchor method failed, trying manual encoding...");
          // ... (manual encoding logic) ...
          // We need to refactor the manual encoding to return an instruction instead of sending

          // Reuse the manual encoding logic from before but adapt it
          const outcomeU8 = outcome === "yes" ? 0 : 1;
          const originalIdl = (program as any)._idl;
          const buyTokensIx = originalIdl?.instructions.find((ix: any) => ix.name === "buy_tokens");

          if (!buyTokensIx || !buyTokensIx.discriminator) throw new Error("Could not find instruction discriminator");

          const discriminator = Buffer.from(buyTokensIx.discriminator);
          const amountBuffer = Buffer.allocUnsafe(8);
          amountBuffer.writeBigUInt64LE(BigInt(amountBN.toString()), 0);
          const argsBuffer = Buffer.concat([amountBuffer, Buffer.from([outcomeU8])]);
          const instructionData = Buffer.concat([discriminator, argsBuffer]);

          instruction = {
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
          };
        }

        transaction.add(instruction);

        // Send transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        if (!signTransaction) throw new Error("Wallet not connected");

        const signedTx = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature, "confirmed");

        setStatus(`✅ Success! Transaction: ${signature}`);
        setAmount("");
      } else {
        // Sell logic

        // Derive liquidity account PDAs (same as buy)
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

        // Check if user has enough tokens to sell
        try {
          const tokenAccountInfo = await getAccount(connection, userTokenAccount);
          const balance = new BN(tokenAccountInfo.amount.toString());
          // For tokens we assume 9 decimals usually, but let's check mint decimals if possible or assume standard
          // The amount input is likely in standard units.
          // If the mint has 9 decimals, we need to multiply by 1e9.
          // However, in the buy logic we multiplied by 1e6 for USDC.
          // Let's assume the tokens also use 6 decimals for simplicity or check if we can get mint info.
          // Wait, the buy logic used 1e6 because USDC has 6 decimals.
          // The tokens minted are SPL tokens. In `create-market.ts` (if I could see it) I'd know the decimals.
          // Standard for SPL is often 9. But let's look at `UserPortfolio.tsx` which divides by 1e9.
          // So tokens likely have 9 decimals.
          const amountTokensBN = new BN(parseFloat(amount) * 1e9);

          if (balance.lt(amountTokensBN)) {
            throw new Error(`Insufficient token balance. You have ${Number(tokenAccountInfo.amount) / 1e9} ${outcome.toUpperCase()}.`);
          }
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError") {
            throw new Error(`You don't have any ${outcome.toUpperCase()} tokens to sell.`);
          }
          if (e.message.includes("Insufficient")) throw e;
          throw new Error(`Could not verify token balance.`);
        }

        setStatus("Sending transaction...");

        const transaction = new Transaction();

        // Check if user USDC account exists, if not add creation instruction
        try {
          await getAccount(connection, userUsdcAccount);
        } catch (e: any) {
          if (e.name === "TokenAccountNotFoundError" || e.message?.includes("doesn't exist")) {
            console.log("Adding create ATA instruction for USDC", userUsdcAccount.toString());
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

        const outcomeEnum = outcome === "yes" ? { yes: {} } : { no: {} };
        const amountTokensBN = new BN(parseFloat(amount) * 1e9);

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

        let instruction;
        const methodName = "sellTokens";

        // Helper to get instruction
        const getInstruction = async () => {
          if ((program.methods as any)[methodName]) {
            return await (program.methods as any)[methodName](amountTokensBN, outcomeEnum)
              .accounts(accounts)
              .instruction();
          }
          const snakeCaseMethod = "sell_tokens";
          if ((program.methods as any)[snakeCaseMethod]) {
            return await (program.methods as any)[snakeCaseMethod](amountTokensBN, outcomeEnum)
              .accounts(accounts)
              .instruction();
          }
          throw new Error("Method not found");
        };

        try {
          instruction = await getInstruction();
        } catch (err) {
          console.log("Anchor method failed, trying manual encoding for sell...");

          const outcomeU8 = outcome === "yes" ? 0 : 1;
          const originalIdl = (program as any)._idl;
          const sellTokensIx = originalIdl?.instructions.find((ix: any) => ix.name === "sell_tokens");

          if (!sellTokensIx || !sellTokensIx.discriminator) throw new Error("Could not find instruction discriminator for sell_tokens");

          const discriminator = Buffer.from(sellTokensIx.discriminator);
          const amountBuffer = Buffer.allocUnsafe(8);
          amountBuffer.writeBigUInt64LE(BigInt(amountTokensBN.toString()), 0);
          const argsBuffer = Buffer.concat([amountBuffer, Buffer.from([outcomeU8])]);
          const instructionData = Buffer.concat([discriminator, argsBuffer]);

          instruction = {
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
          };
        }

        transaction.add(instruction);

        // Send transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        if (!signTransaction) throw new Error("Wallet not connected");

        const signedTx = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature, "confirmed");

        setStatus(`✅ Success! Sold tokens. Tx: ${signature}`);
        setAmount("");
      }
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
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${action === "buy"
            ? "bg-purple-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
        >
          Buy
        </button>
        <button
          onClick={() => setAction("sell")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${action === "sell"
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
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${outcome === "yes"
            ? "bg-green-500 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
        >
          YES
        </button>
        <button
          onClick={() => setOutcome("no")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${outcome === "no"
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

