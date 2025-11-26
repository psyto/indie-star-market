"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState, useMemo } from "react";
import { useProgram } from "@/lib/program";
import { TradingPanel } from "./TradingPanel";
import { MarketStats } from "./MarketStats";
import { UserPortfolio } from "./UserPortfolio";

interface MarketDashboardProps {
  marketAddress: string;
}

export function MarketDashboard({ marketAddress }: MarketDashboardProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [marketState, setMarketState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const marketPda = useMemo(() => {
    try {
      return new PublicKey(marketAddress);
    } catch {
      return null;
    }
  }, [marketAddress]);

  useEffect(() => {
    if (!program || !marketPda) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isInitialLoad = true;

    const fetchMarket = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        
        // Try standard account fetch first
        let market;
        if ((program.account as any)?.marketState?.fetch) {
          market = await (program.account as any).marketState.fetch(marketPda);
        } else if ((program as any).customFetchAccount) {
          // Fallback to custom fetch method if account clients aren't available
          market = await (program as any).customFetchAccount("MarketState", marketPda);
        } else {
          // Last resort: fetch account info directly and decode manually
          const accountInfo = await connection.getAccountInfo(marketPda);
          if (!accountInfo) {
            throw new Error("Market account not found");
          }
          const coder = (program as any).coder?.accounts;
          if (coder) {
            market = coder.decode("MarketState", accountInfo.data);
          } else {
            throw new Error("Unable to decode market account");
          }
        }
        
        setMarketState(market);
        setError(null);
        setLoading(false);
        
        // Start polling only after successful initial fetch
        if (isInitialLoad && !intervalId) {
          isInitialLoad = false;
          // Poll every 15 seconds (less frequent to avoid annoying refreshes)
          intervalId = setInterval(() => {
            fetchMarket(false).catch(() => {
              // Stop polling on error
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            });
          }, 15000);
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to fetch market";
        setError(errorMessage);
        setLoading(false);
        
        // Stop polling on error
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        
        console.error("Error fetching market:", err);
        
        // If account not found, provide helpful guidance
        if (errorMessage.includes("not found")) {
          console.info(
            "💡 Tip: The market PDA was derived, but the market account hasn't been created yet.\n" +
            "To create a market, run: yarn create-market\n" +
            "Make sure you're connected to the correct network (devnet/localnet)."
          );
        }
      }
    };

    // Initial fetch with loading indicator
    fetchMarket(true);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [program, marketPda, connection]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAccountNotFound = error.includes("not found");
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="space-y-3">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error: {error}</p>
          {isAccountNotFound && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-900 dark:text-blue-200 font-medium mb-2">
                💡 Market Not Created Yet
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                This PDA address was derived, but the market account hasn't been created on-chain yet.
              </p>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p className="font-medium">To create a market:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open a terminal in the project root</li>
                  <li>Run: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">yarn create-market</code></li>
                  <li>Copy the "Market PDA" address from the output</li>
                  <li>Paste it in the input field above</li>
                </ol>
                <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                  Note: Make sure you're connected to the correct network (devnet/localnet) 
                  that matches where you created the market.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!marketState) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <p className="text-gray-600 dark:text-gray-300">Market not found</p>
      </div>
    );
  }

  // Calculate time remaining
  const deadline = marketState.deadline.toNumber() * 1000;
  const now = Date.now();
  const timeRemaining = deadline - now;
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  // Calculate implied probability
  const yesLiquidity = marketState.yesLiquidity.toNumber();
  const noLiquidity = marketState.noLiquidity.toNumber();
  const totalLiquidity = yesLiquidity + noLiquidity;
  const yesProbability =
    totalLiquidity > 0 ? (yesLiquidity / totalLiquidity) * 100 : 50;
  const noProbability = 100 - yesProbability;

  return (
    <div className="space-y-6">
      {/* Market Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {marketState.projectName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fundraising Goal
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {marketState.fundraisingGoal.toNumber().toLocaleString()} USDC
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Time Remaining
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {timeRemaining > 0
                ? `${daysRemaining}d ${hoursRemaining}h`
                : "Ended"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {marketState.isSettled ? "Settled" : "Active"}
            </p>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <MarketStats
        yesLiquidity={yesLiquidity}
        noLiquidity={noLiquidity}
        yesProbability={yesProbability}
        noProbability={noProbability}
        usdcLiquidity={marketState.usdcLiquidity.toNumber()}
        isSettled={marketState.isSettled}
        winningOutcome={marketState.winningOutcome}
      />

      {/* Trading Panel */}
      {!marketState.isSettled && timeRemaining > 0 && (
        <TradingPanel
          marketPda={marketPda!}
          yesMint={marketState.yesMint}
          noMint={marketState.noMint}
          usdcMint={marketState.usdcMint}
          program={program}
        />
      )}

      {/* User Portfolio */}
      {publicKey && (
        <UserPortfolio
          userPublicKey={publicKey}
          yesMint={marketState.yesMint}
          noMint={marketState.noMint}
          usdcMint={marketState.usdcMint}
          connection={connection}
        />
      )}
    </div>
  );
}

