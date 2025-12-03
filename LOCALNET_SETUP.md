# Localnet Setup Guide

This guide will help you set up and run the Indie Star Market on a local Solana validator.

## Prerequisites

1. **Solana CLI** installed and configured
2. **Anchor** installed (v0.32.1)
3. **Node.js** and **yarn** installed

## Step 1: Start Local Validator

Open a terminal and start the Solana test validator:

```bash
solana-test-validator
```

Keep this terminal running. The validator will start on `http://127.0.0.1:8899`.

**Note:** The validator starts with a clean ledger. You'll need to deploy the program and create markets each time you restart it.

## Step 2: Configure Solana CLI for Localnet

In a new terminal:

```bash
solana config set --url localhost
```

Verify your configuration:

```bash
solana config get
```

You should see:
- RPC URL: `http://localhost:8899`
- Keypair Path: `~/.config/solana/id.json`

## Step 3: Get SOL for Testing

The validator starts with some default accounts, but you may need to airdrop SOL to your wallet:

```bash
solana airdrop 10
```

Check your balance:

```bash
solana balance
```

## Step 4: Build and Deploy the Program

```bash
# Build the program
anchor build

# Deploy to localnet
anchor deploy
```

This will deploy the program to your local validator. The program ID should match the one in `programs/indie-star-market/src/lib.rs`.

## Step 5: Create a Market

Now you can create a prediction market:

```bash
yarn create-market
```

The script will:
1. Create YES and NO token mints
2. Initialize the market PDA
3. Set up market parameters
4. Output the **Market PDA** address

**Copy the Market PDA address** from the output!

## Step 6: Set Up Liquidity Accounts (Optional)

After creating a market, you may want to set up liquidity accounts:

```bash
yarn setup-liquidity <MARKET_PDA_ADDRESS>
```

Replace `<MARKET_PDA_ADDRESS>` with the Market PDA from Step 5.

## Step 7: Start the Frontend

In the `app` directory:

```bash
cd app
npm run dev
```

The frontend will start on `http://localhost:3000` and automatically connect to your local validator.

## Step 8: Use the Market

1. Open `http://localhost:3000` in your browser
2. Connect your wallet (Phantom, Solflare, etc.)
3. Paste the Market PDA address from Step 5 into the "Enter Market Address" field
4. Click "Load Market"
5. You should see the market dashboard!

## Troubleshooting

### "Account not found"
- Make sure you're using the correct Market PDA from the `yarn create-market` output
- Verify the validator is still running
- Check that you deployed the program: `solana program show 3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h`

### "Program not deployed"
- Run `anchor deploy` again
- Make sure the validator is running

### "Insufficient funds"
- Request an airdrop: `solana airdrop 10`
- Check your balance: `solana balance`

### Frontend can't connect
- Verify the validator is running on `http://127.0.0.1:8899`
- Check the browser console for connection errors
- Make sure `.env.local` exists in the `app` directory with `NEXT_PUBLIC_SOLANA_NETWORK=localnet`

## Quick Start Commands

```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Setup and deploy
solana config set --url localhost
solana airdrop 10
anchor build
anchor deploy
yarn create-market  # Copy the Market PDA!

# Terminal 3: Start frontend
cd app
npm run dev
```

## Notes

- **Validator resets**: Each time you restart `solana-test-validator`, you'll need to redeploy the program and recreate markets
- **Wallet connection**: Your browser wallet needs to be configured for localnet. Some wallets may require manual network configuration
- **Program ID**: The program ID is `3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h` (configured in Anchor.toml)







