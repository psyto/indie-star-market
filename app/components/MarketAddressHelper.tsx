"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/lib/program";

// Program ID - should match the deployed program
const PROGRAM_ID = new PublicKey("3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h");

export function MarketAddressHelper({
  onAddressFound,
}: {
  onAddressFound: (address: string) => void;
}) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [authorityAddress, setAuthorityAddress] = useState<string>("");
  const [derivedPda, setDerivedPda] = useState<string>("");

  const deriveMarketPda = (authority: PublicKey) => {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), authority.toBuffer()],
        PROGRAM_ID
      );
      setDerivedPda(pda.toString());
      onAddressFound(pda.toString());
    } catch (err) {
      alert("Error deriving PDA: " + (err as Error).message);
    }
  };

  const handleUseWallet = () => {
    if (publicKey) {
      deriveMarketPda(publicKey);
    } else {
      alert("Please connect your wallet first");
    }
  };

  const handleDeriveFromAuthority = () => {
    if (!authorityAddress) {
      alert("Please enter an authority address");
      return;
    }
    try {
      const authority = new PublicKey(authorityAddress);
      deriveMarketPda(authority);
    } catch (err) {
      alert("Invalid authority address: " + (err as Error).message);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
        💡 Quick Help: Get Market PDA
      </h3>
      <div className="space-y-2">
        {publicKey && (
          <div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              Your wallet: {publicKey.toString().slice(0, 8)}...
            </p>
            <button
              onClick={handleUseWallet}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Use My Wallet's Market PDA
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={authorityAddress}
            onChange={(e) => setAuthorityAddress(e.target.value)}
            placeholder="Or enter authority address..."
            className="flex-1 text-xs px-2 py-1 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleDeriveFromAuthority}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Derive PDA
          </button>
        </div>
        {derivedPda && (
          <p className="text-xs text-blue-600 dark:text-blue-400 break-all">
            Market PDA: {derivedPda}
          </p>
        )}
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          💡 Tip: Create a new market using{" "}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
            yarn create-market
          </code>{" "}
          to get a market PDA
        </p>
      </div>
    </div>
  );
}

