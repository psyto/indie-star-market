"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { getSavedMarkets, removeMarket, saveMarket, MarketInfo } from "@/lib/marketRegistry";
import { useProgram } from "@/lib/program";
import { MarketCard } from "@/components/MarketCard";
import { CreateMarketModal } from "@/components/CreateMarketModal";

// Dynamically import wallet button to avoid SSR issues
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const program = useProgram();
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

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
          return;
        }
        saveMarket(address);
        setMarkets(getSavedMarkets());
        window.location.href = `/markets/${address}`;
      } catch (e) {
        alert("Invalid Solana address!");
      }
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Live Ticker */}
        <div className="relative w-full overflow-hidden opacity-60 mb-4">
          <div className="flex gap-8 animate-scroll-left whitespace-nowrap text-xs font-mono text-fuchsia-400/60">
            <span>🚀 PROJECT_ALPHA: YES $0.65 (+12%)</span>
            <span>🎵 INDIE_BEATS: NO $0.32 (-5%)</span>
            <span>🎬 FILM_NOIR: YES $0.88 (+2%)</span>
            <span>👾 RETRO_GAME: YES $0.45 (+8%)</span>
            <span>🚀 PROJECT_ALPHA: YES $0.65 (+12%)</span>
            <span>🎵 INDIE_BEATS: NO $0.32 (-5%)</span>
            <span>🎬 FILM_NOIR: YES $0.88 (+2%)</span>
            <span>👾 RETRO_GAME: YES $0.45 (+8%)</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="relative animate-fade-in-up">
          {/* Wallet Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Indie Star Market
              </h1>
              <p className="text-gray-400">
                Predict the success of indie projects
              </p>
            </div>
            <div className="glass-panel rounded-full p-1">
              <WalletMultiButton />
            </div>
          </div>

          {/* Hero Section */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-medium mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
              </span>
              LIVE PREDICTION MARKET
            </div>
            <p className="text-gray-400 text-lg max-w-2xl">
              The Prediction Market for <span className="text-white font-medium">Indie.fun</span>.
              Trade on the success of games, music, and stories. Click any market to view details and trade.
            </p>
          </div>
        </div>

        {/* Search and Actions Bar */}
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-fuchsia-900/20 whitespace-nowrap"
              >
                ✨ Create Market
              </button>
              <button
                onClick={handleAddMarket}
                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10 whitespace-nowrap"
              >
                + Add Existing
              </button>
            </div>
          </div>
        </div>

        {/* Markets Grid */}
        {filteredMarkets.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-medium text-white mb-2">
              {markets.length === 0
                ? "No markets yet"
                : "No markets match your search"}
            </h2>
            <p className="text-gray-400 mb-6">
              {markets.length === 0
                ? "Add a market by entering its PDA address, or create one using the create-market script."
                : "Try adjusting your search query."}
            </p>
            {markets.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all"
                  >
                    ✨ Create Your First Market
                  </button>
                  <button
                    onClick={handleAddMarket}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10"
                  >
                    + Add Existing Market
                  </button>
                </div>
                <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/5 text-left max-w-2xl mx-auto">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <span className="text-fuchsia-400">📋</span> マーケットPDAアドレスの取得方法
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">方法1: 新しいマーケットを作成する（推奨）</h4>
                      <ol className="text-xs text-gray-400 list-decimal list-inside space-y-2 ml-2">
                        <li>ターミナルで <code className="text-fuchsia-400 bg-black/40 px-2 py-1 rounded">yarn create-market</code> を実行</li>
                        <li>スクリプトが出力する <code className="text-fuchsia-400 bg-black/40 px-2 py-1 rounded">Market PDA: ...</code> をコピー</li>
                        <li>上記の「+ Add Market」ボタンをクリックして、コピーしたアドレスを貼り付け</li>
                      </ol>
                    </div>
                    <div className="pt-3 border-t border-white/5">
                      <h4 className="text-sm font-medium text-white mb-2">方法2: 既存のマーケットアドレスを使用する</h4>
                      <p className="text-xs text-gray-400 ml-2">
                        他のユーザーから共有されたマーケットPDAアドレスを直接入力できます。
                      </p>
                    </div>
                    <div className="pt-3 border-t border-white/5 bg-fuchsia-500/10 p-3 rounded-lg">
                      <p className="text-xs text-fuchsia-300">
                        <strong>💡 ヒント:</strong> ローカルネットでテストする場合は、<code className="bg-black/40 px-2 py-1 rounded">solana-test-validator</code> を起動してから <code className="bg-black/40 px-2 py-1 rounded">yarn create-market</code> を実行してください。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
            <span className="text-fuchsia-400">💡</span> How It Works
          </h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-400">
            <div>
              <div className="text-2xl font-bold text-white/10 mb-1">01</div>
              <h4 className="text-white font-medium mb-1">Discover</h4>
              <p>Browse prediction markets for indie projects</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/10 mb-1">02</div>
              <h4 className="text-white font-medium mb-1">Predict</h4>
              <p>Buy YES or NO tokens based on your prediction</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/10 mb-1">03</div>
              <h4 className="text-white font-medium mb-1">Trade</h4>
              <p>Trade tokens as market sentiment changes</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/10 mb-1">04</div>
              <h4 className="text-white font-medium mb-1">Redeem</h4>
              <p>Claim rewards when the market settles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          // Refresh markets list
          setMarkets(getSavedMarkets());
        }}
      />
    </main>
  );
}
