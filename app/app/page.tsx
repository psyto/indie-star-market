"use client";

import dynamic from "next/dynamic";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { MarketDashboard } from "@/components/MarketDashboard";
import { MarketAddressHelper } from "@/components/MarketAddressHelper";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";

// Dynamically import wallet button to avoid SSR issues
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [marketAddress, setMarketAddress] = useState<string>("AxtrLLtb93fVApeJE6fDDSXbHyfjXrXTy3V1f9sxV26Z");

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              🌟 Indie Star Market
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Predict the success of Indie.fun projects
            </p>
          </div>
          <WalletMultiButton />
        </div>

        {/* Market Address Helper */}
        <MarketAddressHelper
          onAddressFound={(address) => setMarketAddress(address)}
        />

        {/* Market Address Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Enter Market Address
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={marketAddress}
              onChange={(e) => setMarketAddress(e.target.value)}
              placeholder="Enter market PDA address (e.g., from yarn create-market)..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => {
                if (marketAddress) {
                  try {
                    new PublicKey(marketAddress);
                    // Address is valid, will be used by MarketDashboard
                  } catch (e) {
                    alert("Invalid Solana address");
                    setMarketAddress("");
                  }
                }
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Load Market
            </button>
          </div>
          {!connected && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              ⚠️ Please connect your wallet to interact with markets
            </p>
          )}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How to get a Market PDA:
            </p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
              <li>Run <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">yarn create-market</code> in the project root</li>
              <li>Copy the "Market PDA" address from the output</li>
              <li>Or use the helper above to derive from your wallet address</li>
            </ol>
          </div>
        </div>

        {/* Market Dashboard */}
        {marketAddress && (
          <MarketDashboard marketAddress={marketAddress} />
        )}

        {/* Instructions */}
        {!marketAddress && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              How to Use
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>Connect your Solana wallet (Phantom, Solflare, etc.)</li>
              <li>Enter a market PDA address to view and trade</li>
              <li>Buy YES or NO tokens based on your prediction</li>
              <li>After the deadline, redeem winning tokens for USDC</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}

