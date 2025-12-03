"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { MarketDashboard } from "@/components/MarketDashboard";
import { saveMarket, updateMarketAccess } from "@/lib/marketRegistry";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  useEffect(() => {
    // Validate address
    try {
      new PublicKey(address);
      // Save/update market in registry
      saveMarket(address);
      updateMarketAccess(address);
    } catch (e) {
      // Invalid address, redirect to markets list
      router.push("/markets");
    }
  }, [address, router]);

  // Validate address format
  let isValidAddress = false;
  try {
    new PublicKey(address);
    isValidAddress = true;
  } catch {
    isValidAddress = false;
  }

  if (!isValidAddress) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-medium text-white mb-2">
              Invalid Market Address
            </h2>
            <p className="text-gray-400 mb-6">
              The market address you're looking for is not valid.
            </p>
            <button
              onClick={() => router.push("/markets")}
              className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all"
            >
              Browse Markets
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/markets")}
              className="text-gray-400 hover:text-white transition-colors text-lg"
              title="Back to markets"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-medium text-white">Market Details</h1>
              <p className="text-xs font-mono text-gray-400 mt-1">{address}</p>
            </div>
          </div>
          <div className="glass-panel rounded-full p-1">
            <WalletMultiButton />
          </div>
        </div>

        {/* Market Dashboard */}
        <MarketDashboard marketAddress={address} />
      </div>
    </main>
  );
}

