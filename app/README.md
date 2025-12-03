# Indie Star Market - Frontend

Next.js frontend for the Indie Star Market prediction platform.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local` and configure:

```bash
cp .env.local.example .env.local
```

For local testing:
```
NEXT_PUBLIC_SOLANA_NETWORK=localnet
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
```

For devnet:
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### 3. Ensure IDL is Available

Make sure `public/indie_star_market.json` exists. It should be copied from:
```bash
cp ../target/idl/indie_star_market.json ./public/
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- ✅ Wallet connection (Phantom, Solflare)
- ✅ Market dashboard with real-time data
- ✅ Buy YES/NO tokens
- ✅ View market statistics and probabilities
- ✅ User portfolio display
- ✅ Responsive design

## Project Structure

```
app/
├── app/              # Next.js app directory
│   ├── layout.tsx   # Root layout with wallet provider
│   ├── page.tsx     # Home page
│   └── globals.css  # Global styles
├── components/       # React components
│   ├── WalletProvider.tsx
│   ├── MarketDashboard.tsx
│   ├── MarketStats.tsx
│   ├── TradingPanel.tsx
│   └── UserPortfolio.tsx
└── lib/             # Utilities
    └── program.ts   # Anchor program setup
```

## Usage

1. Connect your Solana wallet
2. Enter a market PDA address
3. View market statistics and probabilities
4. Buy or sell YES/NO tokens
5. Monitor your portfolio

## Troubleshooting

### Wallet Not Connecting
- Make sure you have a Solana wallet extension installed (Phantom, Solflare)
- Check browser console for errors

### Program Not Found
- Ensure the program is deployed to the network you're using
- Check that the program ID matches in `lib/program.ts`

### Transaction Failures
- Make sure you have enough SOL for transaction fees
- Ensure you have USDC tokens for buying
- Check that liquidity accounts exist for the market









