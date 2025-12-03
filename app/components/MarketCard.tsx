"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { MarketInfo, saveMarket } from "@/lib/marketRegistry";
import { useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/lib/program";

interface MarketCardProps {
  market: MarketInfo;
  onRemove?: (address: string) => void;
  showRemove?: boolean;
}

export function MarketCard({ market, onRemove, showRemove = false }: MarketCardProps) {
  const router = useRouter();
  const { connection } = useConnection();
  const program = useProgram();
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketData() {
      if (!connection) return;
      
      try {
        const marketPda = new PublicKey(market.address);
        
        // Try to fetch market state using program
        if (program) {
          try {
            let marketState;
            if ((program.account as any)?.marketState?.fetch) {
              marketState = await (program.account as any).marketState.fetch(marketPda);
            } else if ((program as any).customFetchAccount) {
              marketState = await (program as any).customFetchAccount("MarketState", marketPda);
            } else {
              const accountInfo = await connection.getAccountInfo(marketPda);
              if (!accountInfo) {
                setError("Market not found");
                setLoading(false);
                return;
              }
              const coder = (program as any).coder?.accounts;
              if (coder) {
                marketState = coder.decode("MarketState", accountInfo.data);
              } else {
                throw new Error("Unable to decode");
              }
            }
            
            setMarketData({
              exists: true,
              projectName: marketState.projectName?.toString(),
              isSettled: marketState.isSettled,
              deadline: marketState.deadline?.toNumber(),
              fundraisingGoal: marketState.fundraisingGoal?.toNumber(),
              yesLiquidity: marketState.yesLiquidity?.toNumber(),
              noLiquidity: marketState.noLiquidity?.toNumber(),
              usdcLiquidity: marketState.usdcLiquidity?.toNumber(),
            });
            
            // Update registry with project name if we got it
            if (marketState.projectName && !market.projectName) {
              saveMarket(market.address, marketState.projectName.toString(), market.network);
            }
          } catch (programErr) {
            // Fallback to basic check
            const accountInfo = await connection.getAccountInfo(marketPda);
            if (!accountInfo) {
              setError("Market not found");
              setLoading(false);
              return;
            }
            setMarketData({ exists: true });
          }
        } else {
          // Basic check without program
          const accountInfo = await connection.getAccountInfo(marketPda);
          if (!accountInfo) {
            setError("Market not found");
            setLoading(false);
            return;
          }
          setMarketData({ exists: true });
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch market");
      } finally {
        setLoading(false);
      }
    }

    fetchMarketData();
  }, [market.address, connection, program]);

  const handleClick = () => {
    router.push(`/markets/${market.address}`);
  };

  // Calculate probability if we have liquidity data
  const yesProbability = marketData?.yesLiquidity && marketData?.noLiquidity && marketData?.usdcLiquidity
    ? (marketData.yesLiquidity / (marketData.yesLiquidity + marketData.noLiquidity)) * 100
    : null;

  return (
    <div
      onClick={handleClick}
      className="glass-panel rounded-2xl p-6 cursor-pointer hover:border-fuchsia-500/50 transition-all border border-white/10 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-medium text-white mb-2 group-hover:text-fuchsia-300 transition-colors">
            {marketData?.projectName || market.projectName || "Unnamed Market"}
          </h3>
          <p className="text-xs font-mono text-gray-400 break-all mb-2">
            {market.address.slice(0, 8)}...{market.address.slice(-8)}
          </p>
          {marketData?.deadline && (
            <p className="text-xs text-gray-500 mb-2">
              Deadline: {new Date(marketData.deadline * 1000).toLocaleDateString()}
              {marketData.isSettled && (
                <span className="ml-2 text-fuchsia-400">• Settled</span>
              )}
            </p>
          )}
          {yesProbability !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>YES</span>
                <span className="text-white font-medium">{yesProbability.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${yesProbability}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {showRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Remove this market from your list?")) {
                onRemove(market.address);
              }
            }}
            className="text-gray-500 hover:text-red-400 transition-colors p-2 -mt-2 -mr-2"
            title="Remove market"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
        {loading ? (
          <span className="text-xs text-gray-500">Checking...</span>
        ) : error ? (
          <span className="text-xs text-red-400">⚠️ {error}</span>
        ) : (
          <span className="text-xs text-green-400">✓ Active</span>
        )}
        
        {market.network && (
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
            {market.network}
          </span>
        )}
        
        {marketData?.fundraisingGoal && (
          <span className="text-xs text-gray-400 ml-auto">
            Goal: {(marketData.fundraisingGoal / 1e6).toFixed(0)} USDC
          </span>
        )}
      </div>
    </div>
  );
}


