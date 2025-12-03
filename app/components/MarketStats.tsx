"use client";

interface MarketStatsProps {
  yesLiquidity: number;
  noLiquidity: number;
  yesProbability: number;
  noProbability: number;
  usdcLiquidity: number;
  isSettled: boolean;
  winningOutcome: any;
}

export function MarketStats({
  yesLiquidity,
  noLiquidity,
  yesProbability,
  noProbability,
  usdcLiquidity,
  isSettled,
  winningOutcome,
}: MarketStatsProps) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h3 className="text-xl font-light mb-6 text-white flex items-center gap-2">
        <span className="text-fuchsia-400">📊</span> Market Statistics
      </h3>

      {/* Probability Bars */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          <span className="text-sm font-medium text-green-400">
            YES: {yesProbability.toFixed(1)}%
          </span>
          <span className="text-sm font-medium text-red-400">
            NO: {noProbability.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-4 flex overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
            style={{ width: `${yesProbability}%` }}
          />
          <div
            className="bg-gradient-to-r from-red-500 to-rose-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            style={{ width: `${noProbability}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">YES Tokens</p>
          <p className="text-2xl font-bold text-white">
            {yesLiquidity.toLocaleString()}
          </p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">NO Tokens</p>
          <p className="text-2xl font-bold text-white">
            {noLiquidity.toLocaleString()}
          </p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            USDC Liquidity
          </p>
          <p className="text-2xl font-bold text-white">
            {usdcLiquidity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Winning Outcome */}
      {isSettled && winningOutcome && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-bold text-yellow-200 uppercase tracking-wide">Market Settled</p>
            <p className="text-yellow-100">
              {winningOutcome.yes !== undefined ? "YES" : "NO"} won!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}








