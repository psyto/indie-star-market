# Market Discovery Feature

## Overview

The Market Discovery feature allows users to browse, save, and manage prediction markets without manually entering PDA addresses each time.

## Features

### 1. Market Registry (`app/lib/marketRegistry.ts`)
- **localStorage-based storage** for discovered markets
- Automatically saves markets when accessed
- Tracks project names, creation dates, and last accessed times
- Supports up to 100 saved markets
- Can be upgraded to on-chain registry or API backend in the future

### 2. Markets List Page (`/markets`)
- **Browse all saved markets** in a grid layout
- **Search functionality** by market name or address
- **Add markets manually** via PDA address
- **Remove markets** from the list
- **Real-time status checking** - verifies markets exist on-chain
- **Market cards** show:
  - Project name (fetched from chain if available)
  - Market PDA address
  - Deadline date
  - Settlement status
  - Network (localnet/devnet/mainnet)
  - Last accessed date

### 3. Market Detail Page (`/markets/[address]`)
- **Dedicated page** for each market
- **Automatic saving** - markets are added to registry when viewed
- **Full market dashboard** with trading, stats, and portfolio
- **Navigation** back to markets list

### 4. Automatic Market Saving
- Markets are **automatically saved** when:
  - Viewed from the home page
  - Accessed via the detail page
  - Added manually through the markets list
- Project names are **automatically fetched** from chain when available
- Last accessed time is **updated** on each visit

## Usage

### Accessing Markets List
1. Click **"📋 Browse Markets"** button on the home page
2. Or navigate directly to `/markets`

### Adding a Market
1. Click **"+ Add Market"** button
2. Enter the market PDA address
3. Market will be saved and you'll be redirected to its detail page

### Viewing a Market
1. Click on any market card in the list
2. You'll be taken to the market detail page
3. Market is automatically saved/updated in your registry

### Removing a Market
1. Click the **×** button on a market card
2. Confirm removal
3. Market is removed from your list (but still exists on-chain)

## Technical Details

### Storage Format
Markets are stored in localStorage with the following structure:
```typescript
interface MarketInfo {
  address: string;
  projectName?: string;
  createdAt: number;
  lastAccessed: number;
  network?: 'localnet' | 'devnet' | 'mainnet';
}
```

### Market Data Fetching
- Markets list page attempts to fetch full market data from chain
- Uses the Anchor program to decode MarketState accounts
- Falls back to basic existence check if program not available
- Updates registry with project names when fetched

### Navigation Flow
```
Home Page → Markets List → Market Detail
    ↓           ↓              ↓
  Browse    Add/Remove    Full Dashboard
```

## Future Enhancements

1. **On-Chain Registry**: Create a program account that tracks all markets
2. **Market Filtering**: Filter by network, settlement status, deadline
3. **Market Sorting**: Sort by popularity, volume, deadline
4. **Share Markets**: Generate shareable links for markets
5. **Market Categories**: Tag markets by project type
6. **Favorites**: Mark favorite markets
7. **Market Analytics**: Show trading volume, participant count

## Files Created/Modified

### New Files
- `app/lib/marketRegistry.ts` - Market storage utilities
- `app/app/markets/page.tsx` - Markets list page
- `app/app/markets/[address]/page.tsx` - Market detail page

### Modified Files
- `app/components/MarketDashboard.tsx` - Auto-saves markets when viewed
- `app/app/page.tsx` - Added navigation to markets list

## Testing

1. **Create a market** using `yarn create-market`
2. **View the market** on the home page (enters PDA)
3. **Check markets list** - market should appear automatically
4. **Add another market** manually via "+ Add Market"
5. **Search markets** using the search bar
6. **Remove a market** and verify it's gone
7. **Navigate between pages** and verify smooth transitions

## Notes

- Markets are stored **locally in your browser** - they won't sync across devices
- Clearing browser data will remove saved markets
- Markets are validated on-chain when displayed
- Invalid or non-existent markets show an error status
- The registry can be upgraded to use a backend API or on-chain storage for production





