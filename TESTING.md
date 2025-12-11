# Testing Guide

This document describes the testing strategy and how to run tests for Indie Star Market.

## Test Structure

The project includes two types of tests:

1. **Unit Tests** (`tests/indie-star-market.ts`) - Tests individual functions and edge cases
2. **End-to-End Tests** (`tests/e2e.test.ts`) - Tests complete user flows and market lifecycle

## Prerequisites

1. **Solana Test Validator**: Must be running for tests to execute
2. **Anchor CLI**: Installed and configured
3. **Dependencies**: All npm packages installed

## Running Tests

### Start Local Validator

Before running any tests, start a local Solana validator:

```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Run tests
```

### Run All Tests

```bash
# Run all tests (unit + e2e)
yarn test
# or
anchor test
```

### Run Specific Test Suites

```bash
# Run only unit tests
yarn test:unit

# Run only end-to-end tests
yarn test:e2e
```

### Run Individual Test Files

```bash
# Run unit tests
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/indie-star-market.ts"

# Run e2e tests
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/e2e.test.ts"
```

## Test Coverage

### Unit Tests (`indie-star-market.ts`)

-   ✅ Market initialization
-   ✅ Invalid deadline validation
-   ✅ Token trading structure
-   ✅ Market settlement validation

### End-to-End Tests (`e2e.test.ts`)

#### Complete Market Lifecycle

1. **Market Initialization**

    - Creates market PDA
    - Initializes liquidity accounts
    - Sets market parameters

2. **User Setup**

    - Creates user accounts
    - Mints test USDC
    - Verifies balances

3. **Buy Tokens**

    - User 1 buys YES tokens
    - User 2 buys NO tokens
    - Verifies liquidity updates
    - Verifies token balances

4. **Sell Tokens**

    - User sells tokens back
    - Verifies USDC returned
    - Verifies tokens burned

5. **Market Settlement**

    - Settles market after deadline
    - Sets winning outcome
    - Verifies settlement state

6. **Token Redemption**
    - Redeems winning tokens
    - Verifies 1:1 USDC return
    - Verifies tokens burned

#### AMM Pricing Verification

-   Tests constant product formula (x \* y = k)
-   Verifies price impact on subsequent buys
-   Confirms 1:1 ratio for first trade

#### Error Handling

-   Rejects trades after deadline
-   Rejects settlement before deadline
-   Validates market state transitions

## Test Output

When tests run successfully, you'll see:

```
✅ Market initialized successfully
✅ User accounts set up with USDC
✅ User 1 bought YES tokens. Received: X tokens
✅ User 2 bought NO tokens. Received: X tokens
✅ User 1 sold tokens. USDC returned: X USDC
✅ Market settled. YES wins!
✅ Tokens redeemed. Received: X USDC
🎉 Complete market lifecycle test passed!
```

## Troubleshooting

### Tests Fail with "Account Not Found"

**Problem**: Solana validator not running or program not deployed

**Solution**:

```bash
# 1. Start validator
solana-test-validator

# 2. In another terminal, build and deploy
anchor build
anchor deploy --provider.cluster localnet

# 3. Run tests
yarn test
```

### Tests Fail with "Insufficient Funds"

**Problem**: Test accounts don't have enough SOL for transactions

**Solution**: The tests automatically airdrop SOL, but if this fails:

```bash
# Manually airdrop to test accounts (if needed)
solana airdrop 10 <test-account-address>
```

### Tests Timeout

**Problem**: Validator is slow or stuck

**Solution**:

```bash
# Restart validator
pkill solana-test-validator
solana-test-validator

# Increase timeout in package.json scripts (already set to 1000000ms)
```

### PDA Mismatch Errors

**Problem**: Market PDA seeds don't match between test and program

**Solution**: Ensure tests use `market_v2` seed prefix:

```typescript
[marketPda] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("market_v2"), // Must match program
        authority.publicKey.toBuffer(),
        Buffer.from(projectName),
    ],
    program.programId
);
```

## Writing New Tests

### Test Structure

```typescript
describe("Feature Name", () => {
    before(async () => {
        // Setup: Create accounts, mints, etc.
    });

    it("Should do something", async () => {
        // Arrange: Set up test data
        // Act: Execute instruction
        // Assert: Verify results
    });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use unique project names to avoid conflicts
3. **Verification**: Always verify both on-chain state and token balances
4. **Error Cases**: Test both success and failure paths
5. **Comments**: Document complex test scenarios

### Example Test

```typescript
it("Should buy tokens and update liquidity", async () => {
    const buyAmount = new anchor.BN(1_000_000); // 1 USDC

    // Get initial state
    const marketBefore = await program.account.marketState.fetch(marketPda);
    const userBalanceBefore = await getAccount(connection, userTokenAccount);

    // Execute buy
    await program.methods
        .buyTokens(buyAmount, { yes: {} })
        .accounts({
            /* ... */
        })
        .rpc();

    // Verify results
    const marketAfter = await program.account.marketState.fetch(marketPda);
    expect(marketAfter.usdcLiquidity.toNumber()).to.equal(
        marketBefore.usdcLiquidity.toNumber() + buyAmount.toNumber()
    );
});
```

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start Solana Validator
  run: solana-test-validator &

- name: Build Program
  run: anchor build

- name: Deploy Program
  run: anchor deploy --provider.cluster localnet

- name: Run Tests
  run: yarn test
```

## Performance Benchmarks

Typical test execution times:

-   Unit tests: ~5-10 seconds
-   E2E tests: ~30-60 seconds
-   Full test suite: ~60-90 seconds

## Next Steps

After tests pass:

1. Deploy to devnet
2. Run tests against devnet
3. Test frontend integration
4. Perform manual QA testing

---

**Note**: Always ensure `solana-test-validator` is running before executing tests. Tests will fail if the validator is not available.
