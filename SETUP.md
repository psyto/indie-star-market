# Indie Star Market - Setup Guide

## ✅ Completed Setup

### 1. Anchor Workspace Initialized
- Anchor workspace structure created
- Program located at `programs/indie-star-market/`
- Tests directory set up at `tests/`

### 2. Core Program Structure

The program (`programs/indie-star-market/src/lib.rs`) includes:

#### **Market State Account**
- Stores all market parameters (fundraising goal, deadline, project name)
- Tracks liquidity for YES/NO tokens and USDC
- Manages settlement state and winning outcome

#### **Core Instructions**

1. **`initialize`** - Creates a new prediction market
   - Sets up market state PDA
   - Links YES/NO token mints
   - Validates deadline is in the future

2. **`buy_tokens`** - Buy YES or NO tokens with USDC
   - Implements AMM pricing (x * y = k)
   - Mints tokens to user
   - Updates liquidity pools

3. **`sell_tokens`** - Sell YES or NO tokens back for USDC
   - Implements AMM pricing
   - Burns user tokens
   - Returns USDC from liquidity pool

4. **`settle_market`** - Settle market after deadline
   - Only callable by market authority
   - Sets winning outcome based on fundraising result

5. **`redeem_tokens`** - Redeem winning tokens for USDC
   - Only works after settlement
   - Burns winning tokens
   - Transfers USDC 1:1 to user

#### **Error Handling**
Comprehensive error codes for:
- Invalid deadlines
- Market settlement states
- Insufficient liquidity
- Unauthorized actions
- Math overflow protection

## 🔧 Next Steps

### Immediate Actions Needed:

1. **Fix IDL Generation Issue**
   - Current issue: Anchor IDL generation failing (Rust code compiles fine)
   - This is likely a version compatibility issue
   - Workaround: Can deploy without IDL or update Anchor version

2. **Create Token Mints**
   - The `initialize` instruction expects YES/NO mints to be created separately
   - Need to add helper instructions or scripts to create these mints
   - Or modify `initialize` to create mints programmatically

3. **Set Up Liquidity Accounts**
   - Need to create associated token accounts for:
     - YES liquidity pool
     - NO liquidity pool  
     - USDC liquidity pool
   - These should be PDAs owned by the market

4. **Write Tests**
   - Update `tests/indie-star-market.ts` with comprehensive test cases
   - Test all instructions
   - Test edge cases (empty liquidity, settlement, etc.)

5. **Deploy to Devnet**
   - Once tests pass, deploy to Solana Devnet
   - Update `Anchor.toml` with devnet configuration

## 📝 Notes

- The program uses a simplified AMM model (x * y = k)
- Market authority controls settlement (can be upgraded to oracle later)
- All market state is stored on-chain via PDAs
- Token operations use Anchor SPL token helpers

## 🚀 Building

```bash
# Build the program (Rust compiles successfully)
cargo build-sbf

# Build with Anchor (currently has IDL generation issue)
anchor build

# Run tests (after fixing IDL issue)
anchor test
```

