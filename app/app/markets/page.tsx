"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { getSavedMarkets, removeMarket, saveMarket, MarketInfo } from "@/lib/marketRegistry";
import dynamic from "next/dynamic";
import { MarketCard } from "@/components/MarketCard";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function MarketsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMarkets(getSavedMarkets());
  }, []);

  const filteredMarkets = markets.filter((market) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      market.address.toLowerCase().includes(query) ||
      market.projectName?.toLowerCase().includes(query)
    );
  });

  const handleRemove = (address: string) => {
    removeMarket(address);
    setMarkets(getSavedMarkets());
  };

  const handleAddMarket = () => {
    const address = prompt("Enter market PDA address:");
    if (address) {
      try {
        new PublicKey(address); // Validate
        const markets = getSavedMarkets();
        if (markets.some(m => m.address === address)) {
          alert("Market already in list!");
          router.push(`/markets/${address}`);
          return;
        }
        saveMarket(address);
        setMarkets(getSavedMarkets());
        router.push(`/markets/${address}`);
      } catch (e) {
        alert("Invalid Solana address!");
      }
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Market Discovery
            </h1>
            <p className="text-gray-400">
              Browse and manage your saved prediction markets
            </p>
          </div>
          <div className="glass-panel rounded-full p-1 relative z-50">
            <WalletMultiButton />
          </div>
        </div>

        {/* Actions Bar */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets by name or address..."
                className="w-full px-6 py-4 border border-white/10 rounded-xl bg-black/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={handleAddMarket}
              className="px-6 py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-fuchsia-900/20 whitespace-nowrap"
            >
              + Add Market
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10 whitespace-nowrap"
            >
              ← Back Home
            </button>
          </div>
        </div>

        {/* Markets Grid */}
        {filteredMarkets.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-medium text-white mb-2">
              {markets.length === 0
                ? "No markets saved yet"
                : "No markets match your search"}
            </h2>
            <p className="text-gray-400 mb-6">
              {markets.length === 0
                ? "Add a market by entering its PDA address, or create one using the create-market script."
                : "Try adjusting your search query."}
            </p>
            {markets.length === 0 && (
              <button
                onClick={handleAddMarket}
                className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all"
              >
                Add Your First Market
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.address}
                market={market}
                onRemove={handleRemove}
                showRemove={true}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="glass-panel rounded-2xl p-6 border border-fuchsia-500/20">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
            <span className="text-fuchsia-400">💡</span> How to Discover Markets
          </h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              • Markets are saved locally in your browser when you access them
            </p>
            <p>
              • Create new markets using:{" "}
              <code className="text-fuchsia-400">yarn create-market</code>
            </p>
            <p>
              • Share market addresses with others to let them discover your
              markets
            </p>
            <p>
              • Markets are automatically added when you view them from the
              home page
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

