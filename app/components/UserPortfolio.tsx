"use client";

import { useEffect, useState } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface UserPortfolioProps {
  userPublicKey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  usdcMint: PublicKey;
  connection: Connection;
}

export function UserPortfolio({
  userPublicKey,
  yesMint,
  noMint,
  usdcMint,
  connection,
}: UserPortfolioProps) {
  const [yesBalance, setYesBalance] = useState<number>(0);
  const [noBalance, setNoBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setLoading(true);

        // Fetch YES token balance
        try {
          const yesTokenAccount = await getAssociatedTokenAddress(
            yesMint,
            userPublicKey
          );
          const yesAccount = await getAccount(connection, yesTokenAccount);
          setYesBalance(Number(yesAccount.amount) / 1e9); // Assuming 9 decimals
        } catch {
          setYesBalance(0);
        }

        // Fetch NO token balance
        try {
          const noTokenAccount = await getAssociatedTokenAddress(
            noMint,
            userPublicKey
          );
          const noAccount = await getAccount(connection, noTokenAccount);
          setNoBalance(Number(noAccount.amount) / 1e9); // Assuming 9 decimals
        } catch {
          setNoBalance(0);
        }

        // Fetch USDC balance
        try {
          const usdcTokenAccount = await getAssociatedTokenAddress(
            usdcMint,
            userPublicKey
          );
          const usdcAccount = await getAccount(connection, usdcTokenAccount);
          setUsdcBalance(Number(usdcAccount.amount) / 1e6); // USDC uses 6 decimals
        } catch {
          setUsdcBalance(0);
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [userPublicKey, yesMint, noMint, usdcMint, connection]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Your Portfolio
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">YES Tokens</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {yesBalance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">NO Tokens</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {noBalance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">USDC</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {usdcBalance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}



