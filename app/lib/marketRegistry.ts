/**
 * Market Registry - Manages discovered markets
 * Uses localStorage for now, can be upgraded to on-chain registry or API later
 */

export interface MarketInfo {
  address: string;
  projectName?: string;
  createdAt: number;
  lastAccessed: number;
  network?: 'localnet' | 'devnet' | 'mainnet';
}

const STORAGE_KEY = 'indie_star_markets';
const MAX_MARKETS = 100; // Limit stored markets

/**
 * Get all saved markets
 */
export function getSavedMarkets(): MarketInfo[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const markets = JSON.parse(stored) as MarketInfo[];
    // Sort by last accessed (most recent first)
    return markets.sort((a, b) => b.lastAccessed - a.lastAccessed);
  } catch (error) {
    console.error('Error reading saved markets:', error);
    return [];
  }
}

/**
 * Save a market to the registry
 */
export function saveMarket(address: string, projectName?: string, network?: 'localnet' | 'devnet' | 'mainnet'): void {
  if (typeof window === 'undefined') return;
  
  try {
    const markets = getSavedMarkets();
    
    // Check if market already exists
    const existingIndex = markets.findIndex(m => m.address === address);
    
    const marketInfo: MarketInfo = {
      address,
      projectName,
      createdAt: existingIndex >= 0 ? markets[existingIndex].createdAt : Date.now(),
      lastAccessed: Date.now(),
      network,
    };
    
    if (existingIndex >= 0) {
      // Update existing
      markets[existingIndex] = marketInfo;
    } else {
      // Add new
      markets.unshift(marketInfo);
      // Limit total markets
      if (markets.length > MAX_MARKETS) {
        markets.pop();
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markets));
  } catch (error) {
    console.error('Error saving market:', error);
  }
}

/**
 * Remove a market from registry
 */
export function removeMarket(address: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const markets = getSavedMarkets();
    const filtered = markets.filter(m => m.address !== address);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing market:', error);
  }
}

/**
 * Update market's last accessed time
 */
export function updateMarketAccess(address: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const markets = getSavedMarkets();
    const market = markets.find(m => m.address === address);
    if (market) {
      market.lastAccessed = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markets));
    }
  } catch (error) {
    console.error('Error updating market access:', error);
  }
}

/**
 * Check if market is saved
 */
export function isMarketSaved(address: string): boolean {
  const markets = getSavedMarkets();
  return markets.some(m => m.address === address);
}





