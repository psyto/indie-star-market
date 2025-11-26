# Quick Start Guide

## Prerequisites

1. **Solana CLI** installed
2. **Anchor** installed (v0.32.1)
3. **Node.js** and **yarn** installed

## Local Development Setup

### Step 1: Start Local Validator

In one terminal, start the Solana test validator:

```bash
solana-test-validator
```

Keep this running in the background.

### Step 2: Build and Deploy Program

In another terminal:

```bash
# Build the program
anchor build

# Deploy to localnet
anchor deploy --provider.cluster localnet
```

**Note:** The program ID in your code must match the deployed program. If you get a program ID mismatch, update `declare_id!()` in `programs/indie-star-market/src/lib.rs` with the deployed program ID.

### Step 3: Create a Market

```bash
yarn create-market
```

This will:
- Create YES and NO token mints
- Initialize a new prediction market
- Display the market PDA and details

### Step 4: Setup Liquidity Accounts (Optional)

After creating a market, set up liquidity accounts:

```bash
yarn setup-liquidity <market_pda_address>
```

Replace `<market_pda_address>` with the market PDA from Step 3.

## Devnet Setup

### Step 1: Configure Solana CLI

```bash
solana config set --url devnet
solana airdrop 2  # Get some SOL for fees
```

### Step 2: Build and Deploy

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Step 3: Set Environment Variables

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### Step 4: Create Market

```bash
yarn create-market
```

## Troubleshooting

### "Program not deployed" Error

**Solution:** Deploy the program first:
```bash
anchor deploy --provider.cluster localnet  # for local
# or
anchor deploy --provider.cluster devnet    # for devnet
```

### "Cannot connect to validator" Error

**Solution:** Make sure `solana-test-validator` is running:
```bash
solana-test-validator
```

### "Insufficient funds" Error

**Solution:** Request an airdrop:
```bash
# Local (automatic in script)
# Devnet
solana airdrop 2
```

### Program ID Mismatch

**Solution:** Update the program ID in `programs/indie-star-market/src/lib.rs`:
```rust
declare_id!("<your_deployed_program_id>");
```

Then rebuild:
```bash
anchor build
anchor deploy
```

## Next Steps

After creating a market:

1. **Users can buy/sell tokens** using the program instructions
2. **After deadline**, call `settleMarket()` to finalize the market
3. **Winners can redeem** their tokens 1:1 for USDC

## Testing

Run the test suite:

```bash
anchor test
```

This will:
- Start a local validator automatically
- Run all tests
- Clean up after completion

## Scripts Reference

- `yarn create-market` - Create a new prediction market
- `yarn setup-liquidity <market_pda>` - Setup liquidity accounts
- `anchor test` - Run test suite
- `anchor build` - Build the program
- `anchor deploy` - Deploy the program



