# Spin and Claim Guide

This guide explains how to interact with the 5reel slot machine system to place bets (spin) and collect winnings (claim).

## Overview

The 5reel slot machine uses a two-phase process:
1. **Spin**: Place a bet and generate a deterministic outcome
2. **Claim**: Collect winnings after the outcome is determined

The system uses blockchain block seeds to ensure fair, verifiable, and tamper-proof results.

## Prerequisites

Before spinning, ensure you have:
- A funded Algorand account
- The slot machine application ID
- The beacon application ID (for time progression)
- Sufficient balance to cover bet amount + fees

## Step 1: Spin (Place a Bet)

### Basic Spin

```javascript
const spinR = await spin({
  appId: slotMachineAppId,
  betAmount: 1e6,           // 1 VOI (in microAlgos)
  maxPaylineIndex: 19,      // Check all 20 paylines (0-19)
  index: 0,                 // Player's choice (can be any value)
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true,
  output: "object"          // Returns object with claimRound and betKey
});
```

### Spin Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `appId` | number | Slot machine application ID | `12345` |
| `betAmount` | number | Bet amount in microAlgos | `1e6` (1 VOI) |
| `maxPaylineIndex` | number | Maximum payline to check (0-19) | `19` (all paylines) |
| `index` | number | Player's choice (affects bet key) | `0` |
| `addr` | string | Player's address | `"ABC123..."` |
| `sk` | Uint8Array | Player's private key | `[1,2,3...]` |
| `debug` | boolean | Enable debug logging | `true` |
| `output` | string | Return format: "string" or "object" | `"object"` |

### Spin Response

When `output: "object"` is used, the response includes:

```javascript
{
  claimRound: 123456,        // Round when bet can be claimed
  betKey: "abc123..."        // Unique bet identifier (hex string)
}
```

### Spin Costs

The total cost for spinning includes:
- **Bet amount**: `betAmount × (maxPaylineIndex + 1)`
- **Spin cost**: 50,500 microAlgos (base cost)
- **Payline cost**: 30,000 microAlgos per payline

**Example**: Betting 1 VOI on all 20 paylines
- Bet amount: `1e6 × 20 = 20,000,000` microAlgos
- Spin cost: `50,500` microAlgos
- Total: `20,050,500` microAlgos

### Validation Rules

The spin will fail if:
- Bet amount is below minimum (1 VOI)
- Bet amount is above maximum (20 VOI)
- Insufficient payment is provided
- Bank balance is below minimum threshold
- Bet with same parameters already exists

## Step 2: Wait for Outcome Determination

After spinning, you must wait for the blockchain to progress to the `claimRound`. The outcome is determined by the block seed at that specific round.

### Check Current Round

```javascript
const status = await algodClient.status().do();
const currentRound = status["last-round"];
console.log(`Current round: ${currentRound}, Claim round: ${spinR.claimRound}`);
```

### Progress Time (Development/Testing)

In development environments, you can manually progress time using the beacon contract:

```javascript
await touch({ 
  appId: beaconAppId,
  addr: playerAddress,
  sk: playerPrivateKey 
});
```

## Step 3: Claim Winnings

### Basic Claim

```javascript
const claimR = await claim({
  appId: slotMachineAppId,
  betKey: spinR.betKey,     // Bet key from spin response
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true
});
```

### Claim Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `appId` | number | Slot machine application ID | `12345` |
| `betKey` | string | Bet key from spin response | `"abc123..."` |
| `addr` | string | Player's address | `"ABC123..."` |
| `sk` | Uint8Array | Player's private key | `[1,2,3...]` |
| `debug` | boolean | Enable debug logging | `true` |

### Claim Response

```javascript
{
  success: true,
  returnValue: BigInt(50000)  // Payout amount in microAlgos
}
```

### Claim Timing

- **Too Early**: If claimed before `claimRound`, the transaction will fail
- **Optimal**: Claim at or after `claimRound` for full payout
- **Expired**: If claimed after `claimRound + 1000`, only box cost is returned

### Claim Costs

- **Transaction fee**: ~3,200 microAlgos
- **OpUp cost**: Additional opcodes if needed

## Complete Example

Here's a complete example of spinning and claiming:

```javascript
// Step 1: Spin
const spinR = await spin({
  appId: slotMachineAppId,
  betAmount: 1e6,
  maxPaylineIndex: 19,
  index: 0,
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true,
  output: "object"
});

console.log(`Bet placed! Claim round: ${spinR.claimRound}`);
console.log(`Bet key: ${spinR.betKey}`);

// Step 2: Wait for claim round
const status = await algodClient.status().do();
const currentRound = status["last-round"];

while (currentRound < spinR.claimRound) {
  // Progress time (in development)
  await touch({ 
    appId: beaconAppId,
    addr: playerAddress,
    sk: playerPrivateKey 
  });
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check current round
  const newStatus = await algodClient.status().do();
  currentRound = newStatus["last-round"];
}

// Step 3: Claim
const claimR = await claim({
  appId: slotMachineAppId,
  betKey: spinR.betKey,
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true
});

if (claimR.success) {
  const payout = Number(claimR.returnValue) / 1e6;
  console.log(`Claimed ${payout} VOI!`);
} else {
  console.log("Claim failed:", claimR);
}
```

## Payout Calculation

The payout is calculated based on:
1. **Symbol matches**: Number of consecutive matching symbols on a payline
2. **Symbol type**: A, B, C, D (each with different multipliers)
3. **Bet amount**: Multiplied by the payout multiplier

### Payout Multipliers

| Symbol | 3 Matches | 4 Matches | 5 Matches |
|--------|-----------|-----------|-----------|
| A | 100x | 400x | 2000x |
| B | 40x | 200x | 1000x |
| C | 25x | 100x | 400x |
| D | 15x | 40x | 200x |

### Example Payouts

- **A-5 match**: `1 VOI × 2000 = 2000 VOI`
- **B-4 match**: `1 VOI × 200 = 200 VOI`
- **C-3 match**: `1 VOI × 25 = 25 VOI`

## Error Handling

### Common Spin Errors

- `"bet amount too small"`: Increase bet amount
- `"bet amount too large"`: Decrease bet amount
- `"payment insufficient"`: Send more ALGO
- `"balance total must be greater than min bank amount"`: Bank needs more funds
- `"bet already exists"`: Try different parameters

### Common Claim Errors

- `"bet not found"`: Invalid bet key
- `"round too early"`: Wait for claim round
- Transaction failure: Check account balance and parameters

## Best Practices

1. **Always use `output: "object"`** for spins to get claim information
2. **Store bet keys** for later claiming
3. **Monitor claim rounds** to claim at optimal time
4. **Handle errors gracefully** with proper error messages
5. **Use debug mode** during development for detailed logging
6. **Test with small amounts** before large bets
7. **Verify payouts** match expected calculations

## Testing

For testing purposes, you can use the provided test functions:

```javascript
// Simulate spin without blockchain transaction
const betKey = await spin({
  appId: slotMachineAppId,
  betAmount: 1e6,
  maxPaylineIndex: 19,
  index: 0,
  simulate: true  // Don't submit transaction
});

// Simulate claim
const claimR = await claim({
  appId: slotMachineAppId,
  betKey: betKey,
  simulate: true  // Don't submit transaction
});
```

## Advanced: Pre-compute Outcomes

The `getBlockSeedBetKeyGridTotalPayout` function allows you to compute the exact outcome and payout for a bet without actually claiming it. This is useful for:

- **Verification**: Double-checking payout calculations
- **Analytics**: Analyzing win rates and expected returns
- **Debugging**: Troubleshooting payout discrepancies
- **Simulation**: Testing different scenarios without spending ALGO

### Function Parameters

```javascript
const result = await getBlockSeedBetKeyGridTotalPayout({
  appId: slotMachineAppId,
  blockSeed: blockSeed,           // Block seed from specific round
  betKey: betKey,                 // Bet key (Uint8Array format)
  betAmount: 1e6,                 // Original bet amount
  lines: 19,                      // Number of paylines to check
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true
});
```

### Parameters Explained

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `appId` | number | Slot machine application ID | `12345` |
| `blockSeed` | string | Block seed from specific round | `"abc123..."` |
| `betKey` | Uint8Array | Bet key in binary format | `new Uint8Array([1,2,3...])` |
| `betAmount` | number | Original bet amount in microAlgos | `1e6` |
| `lines` | number | Number of paylines to check | `19` |
| `addr` | string | Player's address | `"ABC123..."` |
| `sk` | Uint8Array | Player's private key | `[1,2,3...]` |
| `debug` | boolean | Enable debug logging | `true` |

### Response Format

The function returns an array with two elements:

```javascript
const [grid, payout] = result;

// grid: Uint8Array - The 5x3 slot machine grid
// payout: BigInt - Total payout amount in microAlgos
```

### Complete Example: Spin and Pre-compute

```javascript
// Step 1: Spin
const spinR = await spin({
  appId: slotMachineAppId,
  betAmount: 1e6,
  maxPaylineIndex: 19,
  index: 0,
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true,
  output: "object"
});

console.log(`Bet placed! Claim round: ${spinR.claimRound}`);
console.log(`Bet key: ${spinR.betKey}`);

// Step 2: Wait for claim round
const status = await algodClient.status().do();
const currentRound = status["last-round"];

while (currentRound < spinR.claimRound) {
  await touch({ 
    appId: beaconAppId,
    addr: playerAddress,
    sk: playerPrivateKey 
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  const newStatus = await algodClient.status().do();
  currentRound = newStatus["last-round"];
}

// Step 3: Get the block seed for the claim round
const block = await algodClient.block(spinR.claimRound).do();
const blockSeed = block.block.seed;

// Step 4: Pre-compute the outcome
const precomputeResult = await getBlockSeedBetKeyGridTotalPayout({
  appId: slotMachineAppId,
  blockSeed: blockSeed,
  betKey: new Uint8Array(Buffer.from(spinR.betKey, "hex")),
  betAmount: 1e6,
  lines: 19,
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true
});

const [grid, expectedPayout] = precomputeResult;

// Display the grid
console.log("Slot Machine Grid:");
console.log(displayGrid(Buffer.from(grid).toString("utf-8")));

console.log(`Expected payout: ${Number(expectedPayout) / 1e6} VOI`);

// Step 5: Claim (should match pre-computed payout)
const claimR = await claim({
  appId: slotMachineAppId,
  betKey: spinR.betKey,
  addr: playerAddress,
  sk: playerPrivateKey,
  debug: true
});

if (claimR.success) {
  const actualPayout = Number(claimR.returnValue) / 1e6;
  console.log(`Actual payout: ${actualPayout} VOI`);
  
  // Verify the payout matches
  if (Number(expectedPayout) / 1e6 === actualPayout) {
    console.log("✅ Payout verification successful!");
  } else {
    console.log("❌ Payout mismatch detected!");
  }
}
```

### Use Cases

#### 1. Payout Verification

```javascript
// After claiming, verify the payout was correct
const expectedPayout = await getBlockSeedBetKeyGridTotalPayout({
  appId: slotMachineAppId,
  blockSeed: blockSeed,
  betKey: new Uint8Array(Buffer.from(betKey, "hex")),
  betAmount: betAmount,
  lines: maxPaylineIndex + 1,
  addr: playerAddress,
  sk: playerPrivateKey
});

const [_, expectedAmount] = expectedPayout;
const actualAmount = claimR.returnValue;

if (expectedAmount === actualAmount) {
  console.log("Payout verified correctly");
} else {
  console.log("Payout verification failed");
}
```

#### 2. Win Rate Analysis

```javascript
// Analyze multiple bets to calculate win rate
let totalBets = 0;
let totalWins = 0;
let totalPayout = 0;

for (const bet of betHistory) {
  const result = await getBlockSeedBetKeyGridTotalPayout({
    appId: slotMachineAppId,
    blockSeed: bet.blockSeed,
    betKey: new Uint8Array(Buffer.from(bet.betKey, "hex")),
    betAmount: bet.betAmount,
    lines: bet.lines,
    addr: playerAddress,
    sk: playerPrivateKey
  });
  
  const [_, payout] = result;
  totalBets++;
  if (Number(payout) > 0) {
    totalWins++;
    totalPayout += Number(payout);
  }
}

const winRate = (totalWins / totalBets) * 100;
const avgPayout = totalPayout / totalBets;
console.log(`Win rate: ${winRate.toFixed(2)}%`);
console.log(`Average payout: ${avgPayout / 1e6} VOI`);
```

#### 3. Grid Analysis

```javascript
// Analyze the grid to understand the outcome
const result = await getBlockSeedBetKeyGridTotalPayout({
  appId: slotMachineAppId,
  blockSeed: blockSeed,
  betKey: new Uint8Array(Buffer.from(betKey, "hex")),
  betAmount: betAmount,
  lines: lines,
  addr: playerAddress,
  sk: playerPrivateKey
});

const [grid, payout] = result;
const gridString = Buffer.from(grid).toString("utf-8");

console.log("Grid Analysis:");
console.log(displayGrid(gridString));

// Check each payline for matches
for (let i = 0; i < lines; i++) {
  const paylineMatch = await matchPayline({
    appId: slotMachineAppId,
    grid: grid,
    paylineIndex: i
  });
  
  if (paylineMatch.success) {
    const [matches, symbol] = paylineMatch.returnValue;
    if (Number(matches) >= 3) {
      console.log(`Payline ${i}: ${matches} ${symbol} symbols`);
    }
  }
}
```

### Important Notes

1. **Block Seed Format**: The block seed must be in the correct format (32 bytes)
2. **Bet Key Format**: Must be converted to Uint8Array from hex string
3. **Deterministic Results**: Same inputs always produce same outputs
4. **Read-Only**: This function doesn't modify blockchain state
5. **High Fee**: Uses 300,000 microAlgos due to complex computation

### Error Handling

```javascript
try {
  const result = await getBlockSeedBetKeyGridTotalPayout({
    appId: slotMachineAppId,
    blockSeed: blockSeed,
    betKey: new Uint8Array(Buffer.from(betKey, "hex")),
    betAmount: betAmount,
    lines: lines,
    addr: playerAddress,
    sk: playerPrivateKey,
    debug: true
  });
  
  const [grid, payout] = result;
  console.log(`Computed payout: ${Number(payout) / 1e6} VOI`);
  
} catch (error) {
  console.error("Pre-computation failed:", error.message);
  
  // Common errors:
  // - Invalid block seed format
  // - Invalid bet key format
  // - Insufficient fee
  // - Contract not found
}
```

This function is particularly useful for building advanced applications that need to verify outcomes or provide detailed analytics to users. 

## Test Suite Reference

The complete test suite provides working examples of all functionality:

### Core Test Files

- **`src/scripts/test/contract.test.js`**: Main test suite with comprehensive examples
  - Spin and claim workflows
  - Payout verification
  - Block seed retrieval
  - Grid generation and analysis
  - RTP (Return to Player) calculations

### Key Test Examples

#### Basic Spin and Claim Test
```javascript
// See: src/scripts/test/contract.test.js - "Should spin and resolve"
it("Should spin and resolve", async function () {
  const spinR = await spin({
    appId: appId,
    betAmount: 1e6,
    maxPaylineIndex: 19,
    index: 0,
    ...acc2,
    debug: true,
    output: "object",
  });
  
  // Wait for claim round
  do {
    await touch({ appId: beaconAppId });
    const status = await algodClient.status().do();
    const lastRound = status["last-round"];
    if (lastRound > spinR.claimRound + 2) break;
  } while (1);
  
  // Get block seed and pre-compute outcome
  const block = await algodClient.block(spinR.claimRound).do();
  const result = await getBlockSeedBetKeyGridTotalPayout({
    appId,
    blockSeed: block.block.seed,
    betKey: new Uint8Array(Buffer.from(spinR.betKey, "hex")),
    betAmount: 1e6,
    lines: 19,
    ...acc2,
    debug: true,
  });
  
  const [grid, payout] = result;
  console.log(displayGrid(Buffer.from(grid).toString("utf-8")));
});
```

#### RTP Analysis Test
```javascript
// See: src/scripts/test/contract.test.js - "Should compute running RTP"
it("Should compute running RTP", async function () {
  let cost = 0;
  let totalReward = 0;
  const rtpData = [];
  
  do {
    const betKey = await spin({
      appId: appId,
      betAmount: 1e6,
      maxPaylineIndex: 19,
      index: 0,
      ...acc2,
    });
    
    cost += 20;
    
    let claimR;
    do {
      await touch({ appId: beaconAppId });
      claimR = await claim({
        appId,
        betKey,
        ...acc2,
      });
    } while (!claimR.success);
    
    const claimAmount = Number(claimR.returnValue) / 1e6;
    if (claimAmount > 0) {
      totalReward += claimAmount;
    }
    
    const currentRTP = (totalReward / cost) * 100;
    rtpData.push({
      spin: spinCount,
      cost: cost,
      totalReward: totalReward,
      rtp: currentRTP,
      claimAmount: claimAmount,
    });
  } while (spinCount < maxSpins);
});
```

#### Payout Verification Test
```javascript
// See: src/scripts/test/contract.test.js - "Should verify payout calculations match contract exactly"
it("Should verify payout calculations match contract exactly", async function () {
  const expectedPayouts = {
    A: { 3: 100, 4: 400, 5: 2000 },
    B: { 3: 40, 4: 200, 5: 1000 },
    C: { 3: 25, 4: 100, 5: 400 },
    D: { 3: 15, 4: 40, 5: 200 },
  };
  
  Object.entries(expectedPayouts).forEach(([symbol, matchPayouts]) => {
    Object.entries(matchPayouts).forEach(([matches, expectedPayout]) => {
      const actualPayout = calculatePayout(symbol, parseInt(matches), 1);
      expect(actualPayout).to.equal(expectedPayout);
    });
  });
});
```

### Running the Tests

To run the complete test suite:

```bash
# Navigate to the test directory
cd src/scripts/test

# Run all tests
npm test

# Run specific test file
npm test contract.test.js

# Run with verbose output
npm test -- --verbose
```

### Test Environment Setup

The tests use a complete environment with:
- **Slot Machine Contract**: Deployed and bootstrapped
- **Beacon Contract**: For time progression
- **Yield Bearing Token**: For bank management
- **Funded Accounts**: For testing transactions

### Test Data and Examples

The test suite includes:
- **1000+ spin simulations** for RTP analysis
- **Backtesting with real block seeds** for historical analysis
- **Payout verification** against contract calculations
- **Grid generation** and payline matching tests
- **Error handling** for edge cases

### Using Test Examples in Production

You can adapt the test examples for production use:

```javascript
// Based on test: "Should spin and resolve"
async function spinAndResolve(appId, playerAccount) {
  // Spin
  const spinR = await spin({
    appId,
    betAmount: 1e6,
    maxPaylineIndex: 19,
    index: 0,
    ...playerAccount,
    output: "object"
  });
  
  // Wait for claim round
  await waitForRound(spinR.claimRound);
  
  // Pre-compute outcome
  const block = await algodClient.block(spinR.claimRound).do();
  const [grid, expectedPayout] = await getBlockSeedBetKeyGridTotalPayout({
    appId,
    blockSeed: block.block.seed,
    betKey: new Uint8Array(Buffer.from(spinR.betKey, "hex")),
    betAmount: 1e6,
    lines: 19,
    ...playerAccount
  });
  
  // Claim
  const claimR = await claim({
    appId,
    betKey: spinR.betKey,
    ...playerAccount
  });
  
  return {
    grid: Buffer.from(grid).toString("utf-8"),
    expectedPayout: Number(expectedPayout) / 1e6,
    actualPayout: Number(claimR.returnValue) / 1e6,
    verified: Number(expectedPayout) === Number(claimR.returnValue)
  };
}
```

The test suite serves as both documentation and validation, ensuring all examples work correctly with the actual contract implementation. 