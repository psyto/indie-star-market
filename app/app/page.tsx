"use client";

import dynamic from "next/dynamic";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { MarketDashboard } from "@/components/MarketDashboard";
import { MarketAddressHelper } from "@/components/MarketAddressHelper";
import { useState } from "react";
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
  const [marketAddress, setMarketAddress] = useState<string>("7ovLUqT7P5peZDsw2Mb92uv5K2ANjsegCcYrGbMfcMB1");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex justify-between items-center animate-fade-in-up">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter">
              <span className="text-gradient">Indie Star</span> Market
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide max-w-2xl">
              Translate abstract technology into beautiful reality. A Creative Collective forging a new era of stories.
            </p>
          </div>
          <div className="glass-panel rounded-full p-1">
            <WalletMultiButton />
          </div>
        </div>

        {/* Market Address Helper */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <MarketAddressHelper
            onAddressFound={(address) => setMarketAddress(address)}
          />
        </div>

        {/* Market Address Input */}
        <div className="glass-panel rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-light mb-6 text-white flex items-center gap-2">
            <span className="text-fuchsia-400">✦</span> Access the Market
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={marketAddress}
              onChange={(e) => setMarketAddress(e.target.value)}
              placeholder="Enter the Market PDA..."
              className="flex-1 px-6 py-4 border border-white/10 rounded-xl bg-black/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
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
              className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-fuchsia-900/20"
            >
              Enter Portal
            </button>
          </div>
          {!connected && (
            <p className="mt-4 text-sm text-fuchsia-300/80 flex items-center gap-2">
              ⚠️ Connect your wallet to begin the journey
            </p>
          )}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm font-medium text-gray-300 mb-2">
              Developer Access:
            </p>
            <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1 font-mono">
              <li>Run <span className="text-fuchsia-400">yarn create-market</span></li>
              <li>Copy the "Market PDA"</li>
              <li>Paste above to initialize</li>
            </ol>
          </div>
        </div>

        {/* Market Dashboard */}
        {marketAddress && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <MarketDashboard marketAddress={marketAddress} />
          </div>
        )}

        {/* Instructions */}
        {!marketAddress && (
          <div className="glass-panel rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-2xl font-light mb-6 text-white">
              The Journey
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { title: "Connect", desc: "Link your digital soul (Wallet)" },
                { title: "Discover", desc: "Find the Market PDA" },
                { title: "Predict", desc: "Cast your vote on the future" },
                { title: "Redeem", desc: "Claim your rewards" }
              ].map((step, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-fuchsia-500/30 transition-colors">
                  <div className="text-4xl font-bold text-white/10 mb-2">0{i + 1}</div>
                  <h3 className="text-lg font-medium text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

