# Creating a Market on Devnet

## Step 1: Deploy the Program to Devnet

**IMPORTANT:** The program must be deployed to devnet before you can create markets.

1. **Switch Solana CLI to devnet:**
   ```bash
   solana config set --url devnet
   ```

2. **Check your wallet has SOL on devnet:**
   ```bash
   solana balance
   ```
   
   If you don't have SOL, request an airdrop:
   ```bash
   solana airdrop 2
   ```

3. **Build and deploy the program:**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```
   
   This will deploy the program to devnet. Note the program ID if it's different from the one in your code.

## Step 2: Create a Market

Once the program is deployed, you can create markets:

## Create the Market

Run the create-market script with devnet environment variables:

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn create-market
```

Or export them first:

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
yarn create-market
```

## What the Script Does

1. Creates YES and NO token mints
2. Initializes the market PDA
3. Sets up market parameters (fundraising goal, deadline, project name)
4. Outputs the Market PDA address

## After Creating the Market

1. Copy the "Market PDA" address from the script output
2. Paste it into the "Enter Market Address" field in the frontend
3. The market dashboard should load!

## Troubleshooting

- **"Insufficient funds"**: Request more SOL with `solana airdrop 2`
- **"Program not deployed"**: Make sure the program is deployed to devnet
- **"Account not found"**: Double-check you're using the correct Market PDA from the script output

