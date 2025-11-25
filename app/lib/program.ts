"use client";

import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";

// Type definitions based on IDL
export interface IndieStarMarket {
  address: string;
  metadata: {
    name: string;
    version: string;
  };
  instructions: any[];
  accounts: any[];
  types: any[];
  events: any[];
  errors: any[];
}

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [idl, setIdl] = useState<any>(null);

  useEffect(() => {
    // Load IDL dynamically
    fetch("/indie_star_market.json")
      .then((res) => res.json())
      .then((data) => setIdl(data))
      .catch((err) => console.error("Failed to load IDL:", err));
  }, []);

  const program = useMemo(() => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction || !idl) {
      return null;
    }

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: "confirmed" }
    );

    const programId = new PublicKey(
      idl.address || "3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h"
    );

    // Program constructor: Program(idl, programId, provider)
    // Using type assertion to avoid TypeScript complexity
    const ProgramClass = Program as any;
    return new ProgramClass(idl, programId, provider);
  }, [connection, wallet, idl]);

  return program;
}
