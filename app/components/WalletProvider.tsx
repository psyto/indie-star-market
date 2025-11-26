"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, ReactNode } from "react";

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

export function WalletContextProvider({ children }: { children: ReactNode }) {
  // Default to localnet for development, can be changed via env vars
  const endpoint = useMemo(() => {
    // Allow override via environment variable
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    }
    // Use localnet if specified, otherwise default to localnet for development
    if (process.env.NEXT_PUBLIC_SOLANA_NETWORK === "localnet" || 
        !process.env.NEXT_PUBLIC_SOLANA_NETWORK) {
      return "http://127.0.0.1:8899";
    }
    // Fallback to devnet if explicitly set
    return clusterApiUrl(WalletAdapterNetwork.Devnet);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}



