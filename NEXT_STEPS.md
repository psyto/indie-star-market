# Next Steps Guide

## 🎉 Current Status: Phase 1 Complete!

You've successfully completed:
- ✅ All 5 core smart contract instructions
- ✅ Comprehensive test suite (all tests passing)
- ✅ Helper scripts for market creation
- ✅ Full documentation
- ✅ IDL generation working

## 🚀 Phase 2: Frontend Development (Week 3)

### Immediate Next Steps

#### 1. **Set Up Next.js Frontend Project**

Create a new Next.js application in your workspace:

```bash
# Option A: Create in a new directory
npx create-next-app@latest frontend --typescript --tailwind --app

# Option B: Create in existing workspace (recommended)
cd /Users/hiroyusai/src/indie-star-market
npx create-next-app@latest app --typescript --tailwind --app
```

#### 2. **Install Solana Dependencies**

```bash
cd app  # or frontend
npm install @solana/web3.js @solana/spl-token
npm install @coral-xyz/anchor
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

#### 3. **Set Up Wallet Connection**

Create a wallet provider component:

**File: `app/providers/WalletProvider.tsx`**
```typescript
'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

require('@solana/wallet-adapter-react-ui/styles.css');

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet; // or Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

#### 4. **Create Market Dashboard**

**Key Components to Build:**

1. **Market Overview Card**
   - Project name
   - Fundraising goal
   - Current progress
   - Time remaining
   - Current YES/NO prices

2. **Trading Interface**
   - Buy/Sell toggle
   - Amount input (USDC or tokens)
   - Outcome selector (YES/NO)
   - Price preview
   - Transaction button

3. **Market Statistics**
   - Total liquidity
   - Implied probability (YES vs NO)
   - Trading volume
   - Number of participants

4. **User Portfolio**
   - YES tokens owned
   - NO tokens owned
   - USDC balance
   - Estimated value

#### 5. **Integrate Anchor Program**

**File: `app/lib/program.ts`**
```typescript
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { IndieStarMarket } from '../../target/types/indie_star_market';
import idl from '../../target/idl/indie_star_market.json';

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );

    return new Program(
      idl as Idl,
      new PublicKey(idl.metadata.address),
      provider
    ) as Program<IndieStarMarket>;
  }, [connection, wallet]);

  return program;
}
```

#### 6. **Implement Core Features**

**Priority Order:**

1. **Wallet Connection** (Day 1)
   - Connect/disconnect wallet
   - Display wallet address
   - Show SOL balance

2. **Market Display** (Day 1-2)
   - Fetch market state from chain
   - Display market information
   - Calculate and show probabilities

3. **Buy Tokens** (Day 2-3)
   - Form for buying YES/NO tokens
   - Calculate token amount from USDC
   - Submit transaction
   - Show confirmation

4. **Sell Tokens** (Day 2-3)
   - Form for selling tokens
   - Calculate USDC return
   - Submit transaction

5. **Real-time Updates** (Day 3)
   - Poll for market state changes
   - Update prices/probabilities
   - Refresh user balances

### Recommended File Structure

```
app/
├── app/
│   ├── layout.tsx          # Root layout with WalletProvider
│   ├── page.tsx            # Home page (market list)
│   └── market/
│       └── [id]/
│           └── page.tsx    # Market detail page
├── components/
│   ├── WalletButton.tsx
│   ├── MarketCard.tsx
│   ├── TradingPanel.tsx
│   ├── MarketStats.tsx
│   └── UserPortfolio.tsx
├── lib/
│   ├── program.ts          # Anchor program setup
│   ├── utils.ts            # Helper functions
│   └── constants.ts        # Program ID, etc.
└── hooks/
    ├── useMarket.ts         # Fetch market data
    ├── useBuyTokens.ts      # Buy tokens hook
    └── useSellTokens.ts     # Sell tokens hook
```

### Design Considerations

1. **User Experience**
   - Clear probability visualization (e.g., percentage bars)
   - Real-time price updates
   - Transaction status feedback
   - Error handling with helpful messages

2. **Visual Design**
   - Modern, clean interface
   - Mobile-responsive
   - Clear call-to-actions
   - Loading states

3. **Performance**
   - Efficient data fetching
   - Optimistic UI updates
   - Transaction queuing

## 📋 Phase 3 Preparation (Week 4)

While building the frontend, also prepare for:

1. **Deployment**
   - Deploy program to Devnet
   - Set up frontend hosting (Vercel/Netlify)
   - Configure environment variables

2. **Testing**
   - End-to-end testing
   - User acceptance testing
   - Bug fixes

3. **Documentation**
   - User guide
   - Video demo script
   - Submission materials

## 🛠️ Quick Start Commands

```bash
# 1. Create Next.js app
npx create-next-app@latest app --typescript --tailwind --app

# 2. Install dependencies
cd app
npm install @solana/web3.js @solana/spl-token @coral-xyz/anchor
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets

# 3. Copy IDL to frontend
cp ../target/idl/indie_star_market.json ./public/

# 4. Start development server
npm run dev
```

## 🎯 Success Criteria for Phase 2

- [ ] Users can connect their Solana wallet
- [ ] Market data displays correctly
- [ ] Users can buy YES/NO tokens
- [ ] Users can sell tokens back
- [ ] Prices update in real-time
- [ ] Mobile-responsive design
- [ ] Error handling works properly

## 💡 Tips

1. **Start Simple**: Build basic functionality first, then add polish
2. **Test Frequently**: Test with localnet first, then devnet
3. **Use TypeScript**: Leverage the generated types from Anchor IDL
4. **Error Handling**: Show user-friendly error messages
5. **Loading States**: Always show loading indicators during transactions

## 📚 Resources

- [Solana Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Anchor Client Docs](https://www.anchor-lang.com/docs/client)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**You're ready to start Phase 2!** The backend is solid, tested, and ready. Now it's time to build a beautiful frontend that makes prediction markets accessible to everyone. 🚀






