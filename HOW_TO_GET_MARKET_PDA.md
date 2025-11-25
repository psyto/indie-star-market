# How to Get a Market PDA Address

## Quick Answer

You need to **create a market first** using the helper script. The script will output the Market PDA address.

## Method 1: Create a New Market (Recommended)

### Step 1: Start Local Validator

```bash
solana-test-validator
```

### Step 2: Deploy Program (if not already deployed)

```bash
anchor build
anchor deploy --provider.cluster localnet
```

### Step 3: Create Market

```bash
yarn create-market
```

### Step 4: Copy the Market PDA

The script will output something like:
```
Market PDA: 9GiYLBxk4cm9EiRWLoSunsp1igjvKHxa7RscMQTiytBH
```

**Copy this address** and paste it into the "Enter Market Address" field in the frontend.

## Method 2: Use the Frontend Helper

The frontend now includes a helper component that can:

1. **Auto-derive from your connected wallet**
   - If you're connected, click "Use My Wallet's Market PDA"
   - This will derive the PDA for a market created by your wallet

2. **Derive from any authority address**
   - Enter the authority (creator) address
   - Click "Derive PDA"
   - The helper will calculate the market PDA

## Method 3: Calculate Manually

If you know the authority address, you can calculate the Market PDA:

**PDA Seeds:**
```
[b"market", authority_public_key]
```

**Program ID:**
```
3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h
```

You can use Solana's CLI or a script to derive it.

## Example Market PDA

From a previous test run:
```
9GiYLBxk4cm9EiRWLoSunsp1igjvKHxa7RscMQTiytBH
```

**Note:** This PDA is only valid if:
- The program is deployed to the same network
- A market was actually created at that PDA
- You're using the same network (localnet/devnet/mainnet)

## Troubleshooting

### "Market not found" Error

This means:
- The market PDA doesn't exist on the current network
- The program isn't deployed
- You're on the wrong network (localnet vs devnet)

**Solution:** Create a new market using `yarn create-market`

### "Invalid Solana address" Error

- Make sure you copied the full address
- Check for typos
- Ensure it's a valid Base58 Solana address

## Quick Test

To quickly test the frontend:

1. **Terminal 1:** Start validator
   ```bash
   solana-test-validator
   ```

2. **Terminal 2:** Deploy and create market
   ```bash
   anchor deploy --provider.cluster localnet
   yarn create-market
   ```

3. **Terminal 3:** Start frontend
   ```bash
   cd app
   npm run dev
   ```

4. Copy the Market PDA from Terminal 2 and paste it into the frontend!

