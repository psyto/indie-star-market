"use client";

import { Program, AnchorProvider, Idl, BorshAccountsCoder, BorshInstructionCoder, BN } from "@coral-xyz/anchor";
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
      // BUT keep instructions and types intact for instruction encoding to work
      const idlForProgram = {
        ...idl,
        accounts: [] // Remove accounts to bypass size calculation error
        // Keep instructions and types for instruction encoding
      };
      
      // Verify instructions are present
      if (!idlForProgram.instructions || idlForProgram.instructions.length === 0) {
        console.error("Invalid IDL: missing instructions array");
        return null;
      }
      
      // Verify Outcome type exists in types array (needed for instruction encoding)
      const outcomeType = idlForProgram.types?.find((t: any) => t.name === "Outcome");
      if (!outcomeType) {
        console.error("Invalid IDL: Outcome type not found in types array");
        return null;
      }
      
      const program = new Program(idlForProgram, programId, provider);
      
      // Verify program methods are available
      if (!program.methods) {
        console.error("Program methods not initialized");
        return null;
      }
      
      // Manually initialize instruction coder if it's not available
      // Anchor browser version may not initialize it when accounts array is empty
      // Also create a modified IDL for encoding where Outcome enum is replaced with u8
      let instructionCoderForEncoding: BorshInstructionCoder | null = null;
      if (!(program as any).coder?.instructions) {
        console.warn("Instruction coder not initialized - manually creating it");
        try {
          const instructionCoder = new BorshInstructionCoder(idlForProgram);
          // Attach instruction coder to program
          if (!(program as any).coder) {
            (program as any).coder = {};
          }
          (program as any).coder.instructions = instructionCoder;
          console.log("Instruction coder manually initialized");
        } catch (coderError) {
          console.error("Failed to create instruction coder:", coderError);
          // Continue anyway - might still work
        }
      }
      
      // Create a modified IDL for instruction encoding where Outcome enum is replaced with u8
      // This is needed because Anchor browser version can't encode enums in instruction arguments
      try {
        const idlForEncoding = JSON.parse(JSON.stringify(idlForProgram));
        // Find buy_tokens instruction and replace Outcome enum with u8
        const buyTokensInstruction = idlForEncoding.instructions.find((ix: any) => ix.name === "buy_tokens");
        if (buyTokensInstruction && buyTokensInstruction.args) {
          const outcomeArg = buyTokensInstruction.args.find((arg: any) => arg.name === "outcome");
          if (outcomeArg && outcomeArg.type?.defined?.name === "Outcome") {
            outcomeArg.type = "u8"; // Replace enum with u8 for encoding
            instructionCoderForEncoding = new BorshInstructionCoder(idlForEncoding);
            console.log("Created instruction coder with u8 enum replacement");
          }
        }
      } catch (encodingIdlError) {
        console.warn("Failed to create encoding IDL:", encodingIdlError);
      }
      
      // Attach the encoding coder and original IDL to the program for use in TradingPanel
      if (instructionCoderForEncoding) {
        (program as any)._encodingCoder = instructionCoderForEncoding;
      }
      // Attach original IDL so components can access instruction discriminators
      (program as any)._idl = idl;
      
      // Log available methods for debugging
      console.log("Program initialized. Available methods:", Object.keys(program.methods || {}));
      console.log("Outcome type:", outcomeType);
      console.log("Instruction coder:", (program as any).coder?.instructions ? "available" : "unavailable");
      
      // Manually create account client for MarketState to enable account fetching
      // Anchor browser version doesn't support enums in account coders
      // Solution: Create a minimal IDL for decoding with enum replaced by u8
      if (idl.accounts && idl.accounts.length > 0) {
        const marketStateAccount = idl.accounts.find((acc: any) => acc.name === "MarketState");
        if (marketStateAccount) {
          // Create a minimal IDL for decoding - only include MarketState account and type
          // Replace the enum in option with u8 (enums encode as u8 discriminator)
          const marketStateType = JSON.parse(JSON.stringify(
            idl.types.find((t: any) => t.name === "MarketState")
          ));
          
          // Replace enum in option with u8
          if (marketStateType && marketStateType.type?.fields) {
            const winningOutcomeField = marketStateType.type.fields.find(
              (f: any) => f.name === "winning_outcome"
            );
            if (winningOutcomeField && winningOutcomeField.type?.option?.kind === "enum") {
              winningOutcomeField.type = { option: "u8" };
            }
          }
          
          const minimalIdlForDecoding = {
            version: idl.metadata?.version || "0.1.0",
            name: idl.metadata?.name || "indie_star_market",
            instructions: [],
            accounts: [marketStateAccount],
            types: [marketStateType],
            errors: [],
            events: []
          };
          
          // Create account coder from the minimal IDL
          const accountCoder = new BorshAccountsCoder(minimalIdlForDecoding);
          
          // Create a custom account fetch method
          (program.account as any).marketState = {
            fetch: async (address: PublicKey) => {
              const accountInfo = await connection.getAccountInfo(address);
              if (!accountInfo) {
                const networkName = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 
                                   connection.rpcEndpoint.includes('mainnet') ? 'mainnet' : 'localnet';
                throw new Error(
                  `Market account not found at ${address.toString()}.\n` +
                  `This PDA was derived, but the market hasn't been created yet.\n` +
                  `Network: ${networkName}\n` +
                  `To create a market, run: yarn create-market`
                );
              }
              // Use the account coder to decode
              try {
                const decoded = accountCoder.decode("MarketState", accountInfo.data);
                
                // Convert snake_case to camelCase and ensure BN objects are present
                // Anchor's decoder returns snake_case, but components expect camelCase
                const convertToBN = (value: any): BN => {
                  if (!value && value !== 0) return new BN(0);
                  if (value instanceof BN) return value;
                  if (typeof value === 'object' && 'toNumber' in value) return value as BN;
                  return new BN(value.toString());
                };
                
                const converted: any = {
                  authority: decoded.authority ? new PublicKey(decoded.authority) : decoded.authority,
                  yesMint: decoded.yes_mint ? new PublicKey(decoded.yes_mint) : decoded.yes_mint,
                  noMint: decoded.no_mint ? new PublicKey(decoded.no_mint) : decoded.no_mint,
                  usdcMint: decoded.usdc_mint ? new PublicKey(decoded.usdc_mint) : decoded.usdc_mint,
                  fundraisingGoal: convertToBN(decoded.fundraising_goal),
                  deadline: convertToBN(decoded.deadline),
                  projectName: decoded.project_name || "",
                  yesLiquidity: convertToBN(decoded.yes_liquidity),
                  noLiquidity: convertToBN(decoded.no_liquidity),
                  usdcLiquidity: convertToBN(decoded.usdc_liquidity),
                  isSettled: decoded.is_settled || false,
                  winningOutcome: decoded.winning_outcome,
                  bump: decoded.bump || 0,
                };
                
                return converted;
              } catch (decodeError) {
                console.error("Failed to decode MarketState:", decodeError);
                console.error("Account data length:", accountInfo.data.length);
                console.error("Account owner:", accountInfo.owner.toString());
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
