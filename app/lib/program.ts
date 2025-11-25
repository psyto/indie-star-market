"use client";

import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
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
  const wallet = useAnchorWallet();
  const [idl, setIdl] = useState<any>(null);

  useEffect(() => {
    // Load IDL dynamically
    fetch("/indie_star_market.json")
      .then((res) => res.json())
      .then((data) => setIdl(data))
      .catch((err) => console.error("Failed to load IDL:", err));
  }, []);

  const program = useMemo(() => {
    if (!wallet || !idl) {
      return null;
    }

    try {
      // Validate IDL structure
      if (!idl.accounts || !Array.isArray(idl.accounts)) {
        console.error("Invalid IDL: missing accounts array");
        return null;
      }

      if (!idl.types || !Array.isArray(idl.types)) {
        console.error("Invalid IDL: missing types array");
        return null;
      }

      // Validate MarketState account exists in IDL
      const marketStateAccount = idl.accounts.find((acc: any) => acc.name === "MarketState");
      if (!marketStateAccount || !marketStateAccount.type) {
        console.error("Invalid IDL: MarketState account not found or missing type");
        return null;
      }

      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: "confirmed" }
      );

      const programId = new PublicKey(
        idl.address || "3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h"
      );

      // Program constructor: Program(idl, programId, provider)
      // Workaround for Anchor browser version issue with variable-length string types
      // Anchor fails when calculating account sizes for accounts with string fields
      // Solution: Create program without accounts array, then manually add account fetching
      const idlForProgram = {
        ...idl,
        accounts: [] // Remove accounts to bypass size calculation error
      };
      
      const program = new Program(idlForProgram, programId, provider);
      
      // Manually create account client for MarketState to enable account fetching
      // We'll use Anchor's coder directly to decode accounts
      if (idl.accounts && idl.accounts.length > 0) {
        const marketStateAccount = idl.accounts.find((acc: any) => acc.name === "MarketState");
        if (marketStateAccount) {
          // Create a custom account fetch method
          (program.account as any).marketState = {
            fetch: async (address: PublicKey) => {
              const accountInfo = await connection.getAccountInfo(address);
              if (!accountInfo) {
                // Get network info for better error message
                const network = await connection.getVersion().catch(() => null);
                const networkName = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 
                                   connection.rpcEndpoint.includes('mainnet') ? 'mainnet' : 'localnet';
                throw new Error(
                  `Market account not found at ${address.toString()}.\n` +
                  `This PDA was derived, but the market hasn't been created yet.\n` +
                  `Network: ${networkName}\n` +
                  `To create a market, run: yarn create-market`
                );
              }
              // Use Anchor's account coder to decode
              const coder = (program as any).coder.accounts;
              try {
                return coder.decode("MarketState", accountInfo.data);
              } catch (decodeError) {
                console.error("Failed to decode MarketState:", decodeError);
                throw new Error(
                  `Failed to decode market account. ` +
                  `The account exists but may not be a valid MarketState account. ` +
                  `Error: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
                );
              }
            }
          };
        }
      }
      
      return program;
    } catch (error) {
      console.error("Failed to initialize program:", error);
      console.error("Error details:", error instanceof Error ? error.stack : error);
      return null;
    }
  }, [connection, wallet, idl]);

  return program;
}
