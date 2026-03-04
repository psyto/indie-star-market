# 🚀 Frontend Quick Start Guide

## Prerequisites

-   Node.js 18+ installed
-   npm or yarn installed
-   Solana wallet extension (Phantom or Solflare) installed in your browser

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd app
npm install
```

### Step 2: Set Up Environment

Create a `.env.local` file in the `app` directory:

**For Localnet (Testing):**

```bash
NEXT_PUBLIC_SOLANA_NETWORK=localnet
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
```

**For Devnet (Public Testing):**

```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

**Note:** If you don't create `.env.local`, it defaults to `devnet`.

### Step 3: Ensure IDL File Exists

Make sure the IDL file is in place:

```bash
# From the app directory
cp ../target/idl/indie_star_market.json ./public/
```

If you haven't built the program yet:

```bash
# From project root
anchor build
cp target/idl/indie_star_market.json app/public/
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Complete Setup (With Backend)

### Option A: Localnet Setup (Recommended for Development)

#### 1. Start Solana Validator

In **Terminal 1**:

```bash
solana-test-validator
```

Keep this running.

#### 2. Build and Deploy Program

In **Terminal 2** (from project root):

```bash
# Build the program
anchor build

# Deploy to localnet
anchor deploy --provider.cluster localnet

# Copy IDL to frontend
cp target/idl/indie_star_market.json app/public/
```

#### 3. Create a Test Market

```bash
yarn create-market
```

Copy the **Market PDA** address from the output.

#### 4. Start Frontend

In **Terminal 3** (from app directory):

```bash
cd app
npm install
npm run dev
```

#### 5. Access Frontend

1. Open [http://localhost:3000](http://localhost:3000)
2. Connect your wallet (Phantom/Solflare)
3. Paste the Market PDA address
4. Start trading!

---

### Option B: Devnet Setup (For Public Demo)

#### 1. Configure Solana CLI

```bash
solana config set --url devnet
solana airdrop 2  # Get SOL for fees
```

#### 2. Build and Deploy

```bash
anchor build
anchor deploy --provider.cluster devnet
cp target/idl/indie_star_market.json app/public/
```

#### 3. Create Market on Devnet

```bash
yarn create-market
```

#### 4. Start Frontend

```bash
cd app
npm install

# Create .env.local with devnet config
echo "NEXT_PUBLIC_SOLANA_NETWORK=devnet" > .env.local

npm run dev
```

---

## Available Scripts

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Troubleshooting

### ❌ "Cannot connect to wallet"

**Solution:**

-   Make sure Phantom or Solflare extension is installed
-   Refresh the page
-   Check browser console for errors

### ❌ "Program not found" or "Invalid program ID"

**Solution:**

1. Ensure program is deployed:

    ```bash
    anchor deploy --provider.cluster localnet  # or devnet
    ```

2. Verify IDL file exists:

    ```bash
    ls app/public/indie_star_market.json
    ```

3. If missing, copy it:
    ```bash
    cp target/idl/indie_star_market.json app/public/
    ```

### ❌ "Connection refused" or "RPC error"

**Solution:**

-   **Localnet:** Make sure `solana-test-validator` is running
-   **Devnet:** Check your internet connection
-   Verify `.env.local` has correct network settings

### ❌ "Transaction failed" or "Insufficient funds"

**Solution:**

-   Get SOL for transaction fees:

    ```bash
    # Localnet (via frontend airdrop button)
    # Devnet
    solana airdrop 2
    ```

-   Get USDC for trading (use the "Mint USDC" button in the frontend)

### ❌ Port 3000 already in use

**Solution:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### ❌ Module not found errors

**Solution:**

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## First Time Setup Checklist

-   [ ] Node.js 18+ installed (`node --version`)
-   [ ] npm/yarn installed (`npm --version`)
-   [ ] Solana wallet extension installed (Phantom/Solflare)
-   [ ] Dependencies installed (`npm install`)
-   [ ] `.env.local` file created
-   [ ] IDL file copied to `app/public/`
-   [ ] Solana validator running (for localnet)
-   [ ] Program deployed
-   [ ] Test market created
-   [ ] Frontend running (`npm run dev`)

---

## Project Structure

```
app/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with WalletProvider
│   ├── page.tsx           # Home page (market discovery)
│   ├── markets/           # Market pages
│   │   ├── page.tsx       # Markets list
│   │   └── [address]/     # Individual market page
│   └── api/               # API routes
│       ├── airdrop/       # SOL airdrop endpoint
│       ├── mint/          # USDC mint endpoint
│       └── create-market/ # Market creation endpoint
├── components/            # React components
│   ├── WalletProvider.tsx
│   ├── MarketDashboard.tsx
│   ├── TradingPanel.tsx
│   ├── MarketStats.tsx
│   └── UserPortfolio.tsx
├── lib/                   # Utilities
│   ├── program.ts         # Anchor program setup
│   └── marketRegistry.ts  # Market storage
├── public/                # Static files
│   └── indie_star_market.json  # IDL file (required!)
└── .env.local             # Environment variables (create this)
```

---

## Development Tips

### Hot Reload

-   The dev server supports hot reload
-   Changes to components update automatically
-   Page refreshes on file changes

### Browser DevTools

-   Open browser console (F12) to see logs
-   Check Network tab for RPC calls
-   Use React DevTools for component debugging

### Testing Transactions

-   Use the "Airdrop SOL" button to get test SOL
-   Use the "Mint USDC" button to get test USDC
-   All transactions are real (on localnet/devnet)

---

## Next Steps

Once the frontend is running:

1. **Connect Wallet** - Click the wallet button in the top right
2. **Add Market** - Enter a Market PDA address or create a new one
3. **View Market** - See statistics, probabilities, and trading interface
4. **Trade** - Buy or sell YES/NO tokens
5. **Monitor** - Check your portfolio and market updates

---

## Need Help?

-   Check the main [README.md](../README.md)
-   Review [FRONTEND_STATUS.md](./FRONTEND_STATUS.md)
-   See [QUICKSTART.md](../QUICKSTART.md) for backend setup

---

**Happy Trading! 🚀**



