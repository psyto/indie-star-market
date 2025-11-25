# Deployment Guide

## Prerequisites

1. **Solana CLI** installed and configured
2. **Anchor** installed (v0.32.1)
3. **Node.js** and **yarn** installed
4. Wallet with SOL for deployment

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Anchor

Update `Anchor.toml` with your cluster settings:

```toml
[provider]
cluster = "devnet"  # or "mainnet" for production
wallet = "~/.config/solana/id.json"
```

### 3. Build the Program

```bash
# Build (Rust code compiles successfully)
anchor build

# If IDL generation fails, you can still deploy using:
cargo build-sbf
```

**Note**: There's a known IDL generation issue with Anchor 0.32.1. The Rust code compiles successfully, so deployment will work. The IDL can be generated manually if needed.

## Deployment Steps

### Step 1: Deploy the Program

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Or deploy to mainnet (be careful!)
anchor deploy --provider.cluster mainnet
```

After deployment, note the program ID. Update `declare_id!()` in `programs/indie-star-market/src/lib.rs` if needed.

### Step 2: Create a Market

Use the helper script to create a new prediction market:

```bash
yarn create-market
```

This script will:
1. Create YES and NO token mints
2. Initialize the market PDA
3. Set up market parameters

### Step 3: Set Up Liquidity Accounts

After creating a market, set up the liquidity token accounts:

```bash
yarn setup-liquidity <market_pda_address>
```

Replace `<market_pda_address>` with the market PDA from Step 2.

## Testing

### Run Tests

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/indie-star-market.ts
```

### Test on Localnet

1. Start a local validator:
```bash
solana-test-validator
```

2. In another terminal, run tests:
```bash
anchor test --skip-local-validator
```

## Program Instructions

### 1. Initialize Market

Creates a new prediction market.

**Accounts:**
- `market` (PDA): Market state account
- `authority`: Market creator (signer)
- `yes_mint`: YES token mint
- `no_mint`: NO token mint
- `usdc_mint`: USDC mint address
- `token_program`: SPL Token program
- `system_program`: System program
- `rent`: Rent sysvar

**Parameters:**
- `fundraising_goal`: Target amount in USDC (u64)
- `deadline`: Unix timestamp deadline (i64)
- `project_name`: Name of the project (String)

### 2. Buy Tokens

Buy YES or NO tokens using USDC.

**Accounts:**
- `market`: Market state account
- `user`: Buyer (signer)
- `yes_mint` / `no_mint`: Token mints
- `user_token_account`: User's YES/NO token account
- `user_usdc_account`: User's USDC account
- `yes_liquidity_account` / `no_liquidity_account`: Liquidity pools (PDAs)
- `usdc_liquidity_account`: USDC liquidity pool (PDA)
- `token_program`: SPL Token program

**Parameters:**
- `amount_usdc`: Amount of USDC to spend (u64)
- `outcome`: `{ yes: {} }` or `{ no: {} }`

### 3. Sell Tokens

Sell YES or NO tokens back for USDC.

**Accounts:** Same as Buy Tokens

**Parameters:**
- `amount_tokens`: Amount of tokens to sell (u64)
- `outcome`: `{ yes: {} }` or `{ no: {} }`

### 4. Settle Market

Settle the market after the deadline (authority only).

**Accounts:**
- `market`: Market state account
- `authority`: Market authority (signer)

**Parameters:**
- `fundraising_result`: Actual fundraising amount (u64)

### 5. Redeem Tokens

Redeem winning tokens for USDC (1:1) after settlement.

**Accounts:**
- `market`: Market state account
- `user`: Token holder (signer)
- `yes_mint` / `no_mint`: Token mints
- `user_token_account`: User's winning token account
- `user_usdc_account`: User's USDC account
- `usdc_liquidity_account`: USDC liquidity pool (PDA)
- `token_program`: SPL Token program

**Parameters:**
- `amount`: Amount of tokens to redeem (u64)

## PDA Seeds

### Market PDA
```
seeds = [b"market", authority.key().as_ref()]
```

### Liquidity Account PDAs
```
yes_liquidity: [b"liquidity", market.key().as_ref(), b"yes"]
no_liquidity: [b"liquidity", market.key().as_ref(), b"no"]
usdc_liquidity: [b"liquidity", market.key().as_ref(), b"usdc"]
```

## Troubleshooting

### IDL Generation Issue

If `anchor build` fails with IDL generation errors:
1. The Rust code still compiles successfully
2. You can deploy using `anchor deploy` (it will use the compiled binary)
3. For client SDK generation, you may need to manually create the IDL or update Anchor version

### Transaction Failures

Common issues:
- **Insufficient SOL**: Ensure wallet has enough SOL for fees
- **Account not found**: Make sure all required accounts are created
- **Invalid deadline**: Deadline must be in the future for initialization
- **Market settled**: Cannot trade after market is settled

### Testing Issues

- Ensure local validator is running for localnet tests
- Check that all token accounts are created before trading
- Verify market PDA derivation matches in client code

## Production Checklist

Before deploying to mainnet:

- [ ] Audit smart contract code
- [ ] Test thoroughly on devnet
- [ ] Set up monitoring and alerts
- [ ] Document all PDAs and account structures
- [ ] Prepare emergency procedures
- [ ] Set up oracle integration for settlement (if needed)
- [ ] Review and test all error cases
- [ ] Set appropriate token mint authorities
- [ ] Configure USDC mint address correctly

## Support

For issues or questions:
1. Check the code comments in `programs/indie-star-market/src/lib.rs`
2. Review test cases in `tests/indie-star-market.ts`
3. Check Anchor and Solana documentation

