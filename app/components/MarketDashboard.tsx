"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState, useMemo } from "react";
import { useProgram } from "@/lib/program";
import { TradingPanelEnhanced } from "./TradingPanelEnhanced";
import { MarketStats } from "./MarketStats";
import { UserPortfolio } from "./UserPortfolio";
import { getAccount } from "@solana/spl-token";

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
  const [portfolioRefresh, setPortfolioRefresh] = useState(0);
  const [actualUsdcLiquidity, setActualUsdcLiquidity] = useState<number | null>(null);

  const marketPda = useMemo(() => {
    try {
      return new PublicKey(marketAddress);
    } catch {
      return null;
    }
  }, [marketAddress]);

  const fetchMarket = async (showLoading = false) => {
    if (!program || !marketPda) return;

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
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch market";
      setError(errorMessage);
      setLoading(false);

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

  useEffect(() => {
    if (!program || !marketPda) return;

    // Initial fetch with loading indicator
    fetchMarket(true);

    // Poll every 15 seconds
    const intervalId = setInterval(() => {
      fetchMarket(false).catch((err) => {
        console.error("Error polling market:", err);
      });
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [program, marketPda, connection]);

  // Check actual USDC liquidity account balance
  useEffect(() => {
    const checkLiquidityAccount = async () => {
      if (!program || !marketPda || !marketState) return;

      try {
        // Derive USDC liquidity account PDA
        const [usdcLiquidityAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("liquidity"), marketPda.toBuffer(), Buffer.from("usdc")],
          program.programId
        );

        // Get actual balance from liquidity account
        const liquidityAccount = await getAccount(connection, usdcLiquidityAccount);
        const actualRawAmount = liquidityAccount.amount;
        const actualRawNumber = typeof actualRawAmount === 'bigint'
          ? Number(actualRawAmount)
          : Number(actualRawAmount);

        setActualUsdcLiquidity(actualRawNumber);
      } catch (err) {
        // console.error("Error checking liquidity account:", err);
        setActualUsdcLiquidity(null);
      }
    };

    if (marketState) {
      checkLiquidityAccount();
    }
  }, [marketState, program, marketPda, connection]);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/2"></div>
          <div className="h-4 bg-white/5 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAccountNotFound = error.includes("not found");
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="space-y-3">
          <p className="text-red-400 font-semibold flex items-center gap-2">
            <span>⚠️</span> Error: {error}
          </p>
          {isAccountNotFound && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-300 font-medium mb-2">
                💡 Market Not Created Yet
              </p>
              <p className="text-sm text-blue-200/80 mb-3">
                This PDA address was derived, but the market account hasn't been created on-chain yet.
              </p>
              <div className="text-sm text-blue-200/80 space-y-2">
                <p className="font-medium">To create a market:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2 font-mono text-xs">
                  <li>Open a terminal in the project root</li>
                  <li>Run: <span className="text-blue-300">yarn create-market</span></li>
                  <li>Copy the "Market PDA" address from the output</li>
                  <li>Paste it in the input field above</li>
                </ol>
                <p className="mt-3 text-xs text-blue-300/60">
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
      <div className="glass-panel rounded-2xl p-8">
        <p className="text-gray-400">Market not found</p>
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
    <div className="space-y-8">
      {/* Market Header */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group border-t border-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className="w-64 h-64 bg-fuchsia-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
          <div>
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-[10px] font-bold uppercase tracking-wider">
                Trending
              </span>
              {!marketState.isSettled && (
                <span className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-green-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Live
                </span>
              )}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              {marketState.projectName}
            </h2>
            <p className="text-gray-400 font-light">
              Will this project reach its fundraising goal by the deadline?
            </p>
          </div>

          {/* Potential Return Badge */}
          {!marketState.isSettled && (
            <div className="bg-gradient-to-br from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 p-4 rounded-xl backdrop-blur-sm">
              <p className="text-xs text-fuchsia-200 uppercase tracking-wider mb-1">Potential Return</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  {yesProbability > 0 ? (100 / yesProbability).toFixed(2) : "0.00"}x
                </span>
                <span className="text-xs text-fuchsia-300">on YES</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Fundraising Goal
            </p>
            <p className="text-2xl font-semibold text-white tracking-tight font-mono">
              ${marketState.fundraisingGoal.toNumber().toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Time Remaining
            </p>
            <p className="text-2xl font-semibold text-white tracking-tight font-mono">
              {timeRemaining > 0
                ? `${daysRemaining}d ${hoursRemaining}h`
                : "Ended"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Volume</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-white tracking-tight font-mono">
                ${(yesLiquidity + noLiquidity).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <MarketStats
        yesLiquidity={yesLiquidity}
        noLiquidity={noLiquidity}
        yesProbability={yesProbability}
        noProbability={noProbability}
        usdcLiquidity={actualUsdcLiquidity !== null ? actualUsdcLiquidity : marketState.usdcLiquidity.toNumber()}
        isSettled={marketState.isSettled}
        winningOutcome={marketState.winningOutcome}
      />

      {/* Trading Panel */}
      {!marketState.isSettled && timeRemaining > 0 && (
        <TradingPanelEnhanced
          marketPda={marketPda!}
          yesMint={marketState.yesMint}
          noMint={marketState.noMint}
          usdcMint={marketState.usdcMint}
          program={program}
          marketData={marketState}
          onTransactionComplete={() => {
            fetchMarket(false);
            setPortfolioRefresh(prev => prev + 1);
          }}
        />
      )}

      {/* User Portfolio */}
      {publicKey && (
        <UserPortfolio
          key={portfolioRefresh}
          userPublicKey={publicKey}
          yesMint={marketState.yesMint}
          noMint={marketState.noMint}
          usdcMint={marketState.usdcMint}
          connection={connection}
          refreshTrigger={portfolioRefresh}
        />
      )}
    </div>
  );
}

