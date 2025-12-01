# Quick Testing Guide

## What Was Fixed

### ✅ Critical Smart Contract Bug
- **sell_tokens** and **redeem_tokens** were using the wrong authority for burning tokens
- This would have caused ALL sell/redeem transactions to fail
- **Fixed**: Users now properly burn their own tokens (not the market PDA)

### ✅ Enhanced Trading Panel
- **Price Preview**: See exactly how many tokens you'll get before buying
- **Better Validation**: Check balances before transactions
- **Improved Errors**: Human-readable error messages
- **Auto-refresh**: Market data updates after trades

## Quick Start (Local Testing)

### Terminal 1: Start Validator
```bash
solana-test-validator
```

### Terminal 2: Deploy & Create Market
```bash
# Build and deploy the fixed program
anchor build
anchor deploy --provider.cluster localnet

# Create a test market
yarn create-market

# ⚠️ IMPORTANT: Copy the "Market PDA" address from the output!
# Example: AxtrLLtb93fVApeJE6fDDSXbHyfjXrXTy3V1f9sxV26Z
```

### Terminal 3: Start Frontend
```bash
cd app
npm run dev

# Open http://localhost:3000
```

## Testing Steps

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select Phantom or Solflare
   - Approve connection

2. **Load Market**
   - Paste the Market PDA address (from step 2 above)
   - Click "Load Market"
   - You should see market details appear

3. **Get Test Funds**
   - Click "💧 Airdrop 1 SOL" (for gas fees)
   - Click "💸 Mint 1k USDC" (for trading)
   - Wait for confirmations

4. **Test BUY**
   - Keep "Buy" selected
   - Select "YES" or "NO"
   - Enter amount: `10` (USDC)
   - **Look at the preview!** It shows how many tokens you'll get
   - Click "Buy YES/NO Tokens"
   - Approve in wallet
   - ✅ Success message should appear
   - Portfolio should show your new tokens

5. **Test SELL**
   - Click "Sell" tab
   - Select same outcome (YES or NO)
   - Enter amount: `5` (tokens)
   - **Look at the preview!** It shows how much USDC you'll get back
   - Click "Sell YES/NO Tokens"
   - Approve in wallet
   - ✅ Success message should appear
   - Portfolio should show reduced tokens and increased USDC

## Price Preview Examples

When you type amounts, you'll see previews like:

**Buying 10 USDC of YES tokens:**
```
📊 Price Preview
You will receive ~9.8765 YES tokens (~$1.0125/token)
```

**Selling 5 YES tokens:**
```
📊 Price Preview
You will receive ~$4.9382 USDC (~$0.9876/token)
```

## Troubleshooting

### "Market account not found"
- Make sure you ran `yarn create-market`
- Copy the EXACT Market PDA address
- Verify your wallet is on localnet

### "Insufficient USDC"
- Click "💸 Mint 1k USDC" button
- Wait for transaction to confirm
- Try again

### "You don't have any YES tokens"
- Buy some tokens first (test BUY flow)
- Then try selling

### Transaction fails with error 0x1
- Make sure you have SOL for gas fees
- Click "💧 Airdrop 1 SOL"

## What to Look For

### ✅ Price Preview Updates
- Should change as you type different amounts
- Should show reasonable prices (not NaN or infinity)
- Should calculate correctly based on current liquidity

### ✅ Successful Transactions
- Buy completes without errors
- Sell completes without errors (THIS IS THE MAIN FIX!)
- Portfolio updates automatically
- Market stats update after trades

### ✅ Error Handling
- Clear error messages
- Balance checks work
- Can't buy with insufficient USDC
- Can't sell tokens you don't have

## Files to Review

If you want to see the changes:
- **Smart Contract Fix**: `programs/indie-star-market/src/lib.rs` (lines 225-242, 357-374)
- **Enhanced Trading Panel**: `app/components/TradingPanelEnhanced.tsx`
- **Integration**: `app/components/MarketDashboard.tsx`
- **Full Details**: `TRADING_PANEL_FIXES.md`

## Next Steps

Once local testing passes:

1. **Deploy to Devnet** for public testing
2. **Create demo video** showing buy/sell flows
3. **Prepare hackathon submission** materials
4. **Consider adding** transaction history, toast notifications, etc.

---

**The trading panel is now fully functional! 🎉**

Happy testing! If you encounter any issues, check the browser console for detailed error logs.
