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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Market Statistics
      </h3>

      {/* Probability Bars */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            YES: {yesProbability.toFixed(1)}%
          </span>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            NO: {noProbability.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 flex overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-300"
            style={{ width: `${yesProbability}%` }}
          />
          <div
            className="bg-red-500 h-full transition-all duration-300"
            style={{ width: `${noProbability}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">YES Tokens</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {yesLiquidity.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">NO Tokens</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {noLiquidity.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            USDC Liquidity
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {usdcLiquidity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Winning Outcome */}
      {isSettled && winningOutcome && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            🏆 Market Settled:{" "}
            {winningOutcome.yes !== undefined ? "YES" : "NO"} won!
          </p>
        </div>
      )}
    </div>
  );
}



