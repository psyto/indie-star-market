"use client";

import { useEffect, useState } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface UserPortfolioProps {
  userPublicKey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  usdcMint: PublicKey;
  connection: Connection;
  refreshTrigger?: number;
}

export function UserPortfolio({
  userPublicKey,
  yesMint,
  noMint,
  usdcMint,
  connection,
  refreshTrigger,
}: UserPortfolioProps) {
  const [yesBalance, setYesBalance] = useState<number>(0);
  const [noBalance, setNoBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [yesRawAmount, setYesRawAmount] = useState<bigint | number>(0);
  const [noRawAmount, setNoRawAmount] = useState<bigint | number>(0);
  const [usdcRawAmount, setUsdcRawAmount] = useState<bigint | number>(0);
  const [loading, setLoading] = useState(true);
  const [manualTrigger, setManualTrigger] = useState(0);

  useEffect(() => {
    console.log("👛 UserPortfolio: useEffect triggered", { 
      refreshTrigger, 
      manualTrigger,
      currentBalances: { yesBalance, noBalance, usdcBalance }
    });
    let isMounted = true;

    const fetchBalances = async () => {
      try {
        // Show loading only on initial load (when all balances are 0)
        const isInitialLoad = yesBalance === 0 && noBalance === 0 && usdcBalance === 0;
        if (isInitialLoad) {
          setLoading(true);
        }

        // Validate mint addresses are PublicKey objects
        if (!(yesMint instanceof PublicKey) || !(noMint instanceof PublicKey) || !(usdcMint instanceof PublicKey)) {
          console.error("❌ Invalid mint addresses:", { yesMint, noMint, usdcMint });
          return;
        }

        console.log("🔍 Fetching balances for mints:", {
          yesMint: yesMint.toString(),
          noMint: noMint.toString(),
          usdcMint: usdcMint.toString(),
          userPublicKey: userPublicKey.toString(),
        });

        // Fetch mint decimals for accurate conversion
        const [yesMintInfo, noMintInfo, usdcMintInfo] = await Promise.all([
          getMint(connection, yesMint).catch((err) => {
            console.error("Failed to fetch YES mint info:", err);
            return null;
          }),
          getMint(connection, noMint).catch((err) => {
            console.error("Failed to fetch NO mint info:", err);
            return null;
          }),
          getMint(connection, usdcMint).catch((err) => {
            console.error("Failed to fetch USDC mint info:", err);
            return null;
          }),
        ]);

        const yesDecimals = yesMintInfo?.decimals ?? 9;
        const noDecimals = noMintInfo?.decimals ?? 9;
        const usdcDecimals = usdcMintInfo?.decimals ?? 6;
        
        console.log("📊 Mint Decimals:", {
          yes: yesMintInfo ? `${yesDecimals} (from mint)` : `${yesDecimals} (default)`,
          no: noMintInfo ? `${noDecimals} (from mint)` : `${noDecimals} (default)`,
          usdc: usdcMintInfo ? `${usdcDecimals} (from mint)` : `${usdcDecimals} (default)`,
        });

        // Fetch YES token balance
        try {
          const yesTokenAccount = await getAssociatedTokenAddress(
            yesMint,
            userPublicKey
          );
          console.log("🔍 Checking YES token account:", yesTokenAccount.toString());
          console.log("🔍 YES mint:", yesMint.toString());
          
          // Check if account exists first
          const yesAccountInfo = await connection.getAccountInfo(yesTokenAccount);
          if (!yesAccountInfo) {
            console.warn("⚠️ YES token account does not exist yet:", yesTokenAccount.toString());
            console.warn("   This is normal if you haven't bought YES tokens yet.");
            console.warn("   Token Account Address:", yesTokenAccount.toString());
            console.warn("   User PublicKey:", userPublicKey.toString());
            console.warn("   YES Mint:", yesMint.toString());
            if (isMounted) {
              setYesBalance(0);
              setYesRawAmount(0);
            }
          } else {
            console.log("✅ YES token account exists, fetching balance...");
            const yesAccount = await getAccount(connection, yesTokenAccount);
            if (isMounted) {
              // Handle bigint properly - amount is a bigint from spl-token
              const rawAmount = yesAccount.amount;
              const rawAmountStr = rawAmount.toString();
              const rawAmountNum = typeof rawAmount === 'bigint' 
                ? Number(rawAmount) 
                : Number(rawAmount);
              
              // Store raw amount (like Market Statistics)
              setYesRawAmount(rawAmount);
              
              // Convert using the actual decimals from mint
              const divisor = Math.pow(10, yesDecimals);
              const newBalance = rawAmountNum / divisor;
              
              console.log("💰 YES Balance Calculation:", {
                rawAmount: rawAmountStr,
                rawAmountType: typeof rawAmount,
                decimals: yesDecimals,
                divisor: divisor,
                calculatedBalance: newBalance,
                mint: yesMint.toString(),
                tokenAccount: yesTokenAccount.toString()
              });
              
              if (newBalance > 0) {
                console.log("✅ YES Balance found:", newBalance);
              } else {
                console.warn("⚠️ YES Balance is 0 (account exists but empty)");
              }
              
              setYesBalance(newBalance);
            }
          }
        } catch (err: any) {
          console.error("❌ Error fetching YES balance:", err.message || err);
          console.error("   Error name:", err.name);
          console.error("   Error stack:", err.stack);
          try {
            const yesTokenAccount = await getAssociatedTokenAddress(yesMint, userPublicKey);
            console.error("   YES Token Account:", yesTokenAccount.toString());
            console.error("   YES Mint:", yesMint.toString());
            console.error("   User PublicKey:", userPublicKey.toString());
          } catch (e) {
            console.error("   Could not derive token account address");
          }
          if (isMounted) {
            setYesBalance(0);
            setYesRawAmount(0);
          }
        }

        // Fetch NO token balance
        try {
          const noTokenAccount = await getAssociatedTokenAddress(
            noMint,
            userPublicKey
          );
          console.log("🔍 Checking NO token account:", noTokenAccount.toString());
          console.log("🔍 NO mint:", noMint.toString());
          
          // Check if account exists first
          const noAccountInfo = await connection.getAccountInfo(noTokenAccount);
          if (!noAccountInfo) {
            console.warn("⚠️ NO token account does not exist yet:", noTokenAccount.toString());
            console.warn("   This is normal if you haven't bought NO tokens yet.");
            console.warn("   Token Account Address:", noTokenAccount.toString());
            console.warn("   User PublicKey:", userPublicKey.toString());
            console.warn("   NO Mint:", noMint.toString());
            if (isMounted) {
              setNoBalance(0);
              setNoRawAmount(0);
            }
          } else {
            console.log("✅ NO token account exists, fetching balance...");
            const noAccount = await getAccount(connection, noTokenAccount);
            if (isMounted) {
              // Handle bigint properly - amount is a bigint from spl-token
              const rawAmount = noAccount.amount;
              const rawAmountStr = rawAmount.toString();
              const rawAmountNum = typeof rawAmount === 'bigint' 
                ? Number(rawAmount) 
                : Number(rawAmount);
              
              // Store raw amount (like Market Statistics)
              setNoRawAmount(rawAmount);
              
              // Convert using the actual decimals from mint
              const divisor = Math.pow(10, noDecimals);
              const newBalance = rawAmountNum / divisor;
              
              console.log("💰 NO Balance Calculation:", {
                rawAmount: rawAmountStr,
                rawAmountType: typeof rawAmount,
                decimals: noDecimals,
                divisor: divisor,
                calculatedBalance: newBalance,
                mint: noMint.toString(),
                tokenAccount: noTokenAccount.toString()
              });
              
              if (newBalance > 0) {
                console.log("✅ NO Balance found:", newBalance);
              } else {
                console.warn("⚠️ NO Balance is 0 (account exists but empty)");
              }
              
              setNoBalance(newBalance);
            }
          }
        } catch (err: any) {
          console.error("❌ Error fetching NO balance:", err.message || err);
          console.error("   Error name:", err.name);
          console.error("   Error stack:", err.stack);
          try {
            const noTokenAccount = await getAssociatedTokenAddress(noMint, userPublicKey);
            console.error("   NO Token Account:", noTokenAccount.toString());
            console.error("   NO Mint:", noMint.toString());
            console.error("   User PublicKey:", userPublicKey.toString());
          } catch (e) {
            console.error("   Could not derive token account address");
          }
          if (isMounted) {
            setNoBalance(0);
            setNoRawAmount(0);
          }
        }

        // Fetch USDC balance
        try {
          const usdcTokenAccount = await getAssociatedTokenAddress(
            usdcMint,
            userPublicKey
          );
          const usdcAccount = await getAccount(connection, usdcTokenAccount);
          if (isMounted) {
            const rawAmount = usdcAccount.amount;
            const rawAmountNum = typeof rawAmount === 'bigint' 
              ? Number(rawAmount) 
              : Number(rawAmount);
            
            // Store raw amount (like Market Statistics)
            setUsdcRawAmount(rawAmount);
            
            const newBalance = rawAmountNum / Math.pow(10, usdcDecimals);
            console.log("💰 USDC Balance:", newBalance, `(raw: ${rawAmount.toString()}, decimals: ${usdcDecimals})`);
            setUsdcBalance(newBalance);
          }
        } catch {
          if (isMounted) {
            setUsdcBalance(0);
            setUsdcRawAmount(0);
          }
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Fetch immediately
    fetchBalances();
    
    // If refreshTrigger changed (and is > 0), also fetch after a delay to account for RPC lag
    let delayedFetchTimeout: NodeJS.Timeout | null = null;
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      delayedFetchTimeout = setTimeout(() => {
        if (isMounted) {
          console.log("🔄 Refresh trigger - delayed fetch for RPC lag...", refreshTrigger);
          fetchBalances();
        }
      }, 1500); // Wait 1.5 seconds for RPC to catch up
    }
    
    // Set up polling interval for regular updates
    const interval = setInterval(() => {
      if (isMounted) {
        fetchBalances();
      }
    }, 10000); // Refresh every 10 seconds

    return () => {
      isMounted = false;
      if (delayedFetchTimeout) clearTimeout(delayedFetchTimeout);
      clearInterval(interval);
    };
  }, [userPublicKey, yesMint, noMint, usdcMint, connection, refreshTrigger, manualTrigger]);

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

  const manualRefresh = () => {
    console.log("🔄 Manual refresh button clicked");
    setManualTrigger(prev => prev + 1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Portfolio
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Refresh: {refreshTrigger || 0}
          </span>
          <button
            onClick={manualRefresh}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      {/* Debug info - remove in production */}
      <details className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">Debug Info</summary>
        <div className="mt-2 space-y-1 font-mono">
          <div>YES Mint: {yesMint?.toString()}</div>
          <div>NO Mint: {noMint?.toString()}</div>
          <div>USDC Mint: {usdcMint?.toString()}</div>
          <div>User: {userPublicKey?.toString()}</div>
          <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
            <div className="font-semibold">Current Balances (raw):</div>
            <div>YES: {yesBalance.toFixed(9)}</div>
            <div>NO: {noBalance.toFixed(9)}</div>
            <div>USDC: {usdcBalance.toFixed(6)}</div>
          </div>
        </div>
      </details>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">YES Tokens</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {Number(yesRawAmount).toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">NO Tokens</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {Number(noRawAmount).toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">USDC</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {Number(usdcRawAmount).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}





