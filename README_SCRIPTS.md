# Helper Scripts Usage

## Prerequisites

Before running the scripts, ensure you have:

1. **For local testing:**
   ```bash
   solana-test-validator
   ```

2. **For devnet/mainnet:**
   ```bash
   export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
   export ANCHOR_WALLET=~/.config/solana/id.json
   ```

## Scripts

### 1. Create Market (`yarn create-market`)

Creates a new prediction market with YES/NO token mints.

**What it does:**
1. Creates YES token mint
2. Creates NO token mint  
3. Initializes the market PDA
4. Sets up market parameters (goal, deadline, project name)

**Usage:**
```bash
# Local testing (requires solana-test-validator)
yarn create-market

# Devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
yarn create-market
```

**Output:**
- YES mint address
- NO mint address
- Market PDA address
- Market state details

### 2. Setup Liquidity Accounts (`yarn setup-liquidity`)

Sets up liquidity token accounts for a market.

**Usage:**
```bash
yarn setup-liquidity <market_pda_address>
```

**Example:**
```bash
yarn setup-liquidity 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**What it does:**
- Creates YES liquidity token account (PDA)
- Creates NO liquidity token account (PDA)
- Creates USDC liquidity token account (PDA)

## Troubleshooting

### Connection Refused Error

If you see `ECONNREFUSED`:
- Make sure `solana-test-validator` is running for local testing
- Or set `ANCHOR_PROVIDER_URL` for devnet/mainnet

### Wallet Not Found

If you see wallet errors:
- Set `ANCHOR_WALLET` environment variable
- Or ensure your Solana CLI is configured: `solana config get`

### Account Already Exists

If accounts already exist, the scripts will skip creation (this is fine).

## Next Steps After Creating Market

1. **Setup liquidity accounts:**
   ```bash
   yarn setup-liquidity <market_pda>
   ```

2. **Users can now:**
   - Buy YES/NO tokens
   - Sell tokens back
   - After deadline: redeem winning tokens

3. **Settle market:**
   - Call `settleMarket()` instruction after deadline
   - Requires market authority









