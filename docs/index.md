# 5reel Smart Contract Documentation

## Overview

5reel is a comprehensive slot machine gaming platform built on the Algorand blockchain using Algorand Python and the ARC4 standard. The system consists of multiple interconnected smart contracts that provide a complete gaming experience with yield-bearing token mechanics.

## Architecture

The system is built with a modular architecture consisting of several key components:

- **SlotMachine**: Main gaming contract that combines all functionality
- **ReelManager**: Manages slot machine reels and grid generation
- **SpinManager**: Handles betting, spinning, and payout logic
- **BankManager**: Manages contract balances and financial operations
- **YieldBearingToken**: ERC-20 compatible token with yield generation
- **Base Contracts**: Ownable, Bootstrapped, and Touchable interfaces

## Core Contracts

### SlotMachine

The main contract that combines all gaming functionality. It inherits from `SpinManager`, `ReelManager`, `Ownable`, and `Upgradeable`.

#### Key Features
- 5x3 slot machine grid with 20 paylines
- Deterministic outcome generation using block seeds
- Multi-payline betting system
- Automatic payout calculation and distribution

#### Methods

##### `bootstrap()`
Initializes the slot machine contract. Requires payment to cover storage costs.

**Cost**: Varies based on inherited contracts

##### `get_grid(seed: Bytes32) -> Bytes15`
Generates a 5x3 grid based on the provided seed. The grid represents the slot machine display.

**Parameters**:
- `seed`: 32-byte seed for deterministic grid generation

**Returns**: 15-byte grid representation

##### `spin(bet_amount: UInt64, max_payline_index: UInt64, index: UInt64) -> Bytes56`
Places a bet and generates a spin outcome. The result is deterministic based on future block seeds.

**Parameters**:
- `bet_amount`: Amount to bet in atomic units
- `max_payline_index`: Maximum payline to check (0-19)
- `index`: Player's choice of index

**Returns**: Bet key for later claiming

**Cost**: 50,500 microAlgos + 30,000 per payline

##### `claim(bet_key: Bytes56) -> UInt64`
Claims a completed bet and receives payout if applicable.

**Parameters**:
- `bet_key`: Unique identifier for the bet

**Returns**: Payout amount in atomic units

**Cost**: 1,400 opcodes (uses OpUp)

##### `get_payline_count() -> UInt64`
Returns the total number of available paylines (20).

##### `get_payline(payline_index: UInt64) -> StaticArray[UInt64, 5]`
Returns the payline pattern at the specified index.

**Parameters**:
- `payline_index`: Index of the payline (0-19)

**Returns**: Array of 5 integers representing row positions

##### `match_payline(grid: Bytes15, payline_index: UInt64) -> PaylineMatch`
Matches a grid against a specific payline to determine wins.

**Returns**: `PaylineMatch` with count and initial symbol

### ReelManager

Manages the slot machine reels and provides methods to access reel data.

#### Methods

##### `get_reels() -> Bytes500`
Returns the complete reel data as a 500-byte array.

##### `get_reel(reel: UInt64) -> Bytes100`
Returns a specific reel at the given index.

##### `get_slot(reel: UInt64, index: UInt64) -> Bytes1`
Returns a specific slot symbol from a reel.

##### `get_reel_window(reel: UInt64, index: UInt64) -> Bytes3`
Returns a 3-symbol window from a reel, wrapping around if necessary.

##### `get_reel_length() -> UInt64`
Returns the length of each reel (default: 100).

##### `get_reel_count() -> UInt64`
Returns the number of reels (default: 5).

### SpinManager

Handles the betting and spinning mechanics of the slot machine.

#### Methods

##### `spin(bet_amount: UInt64, max_payline_index: UInt64, index: UInt64) -> Bytes56`
Core spinning functionality that validates bets and creates bet records.

**Validation Rules**:
- Bet amount must be within min/max limits
- Bank must have sufficient balance
- Payment must cover bet amount + fees

##### `claim(bet_key: Bytes56) -> UInt64`
Claims completed bets and calculates payouts.

**Payout Logic**:
- Uses embedded payout model based on symbol matches
- Supports multiple paylines per bet
- Automatically handles expired bets

#### Configuration

The SpinManager uses configurable parameters stored in boxes:

- `max_extra_payment`: Maximum additional payment allowed (1 VOI)
- `max_payout_multiplier`: Maximum payout multiplier (1000x)
- `round_future_delta`: Rounds to wait before claiming (1)
- `min_bet_amount`: Minimum bet amount (1 VOI)
- `max_bet_amount`: Maximum bet amount (20 VOI)
- `min_bank_amount`: Minimum required bank balance (100k VOI)

### BankManager

Manages the financial aspects of the gaming platform.

#### Methods

##### `deposit()`
Allows users to deposit funds into the contract.

##### `withdraw(amount: UInt64)`
Allows the owner to withdraw funds from the contract.

##### `owner_deposit(amount: UInt64)`
Allows the owner to deposit funds directly.

#### Balance Tracking

The BankManager maintains three balance types:

- **Available Balance**: Funds available for immediate use
- **Locked Balance**: Funds reserved for potential payouts
- **Total Balance**: Total funds in the contract

### YieldBearingToken

An ERC-20 compatible token that generates yield from the slot machine profits.

#### Methods

##### `bootstrap()`
Initializes the token with name "Submarine Gaming Token" and symbol "GAME".

##### `deposit() -> UInt256`
Deposits funds and mints shares based on the current exchange rate.

**Cost**: 28,500 microAlgos (box creation)

##### `withdraw(amount: UInt256) -> UInt64`
Burns shares and returns the corresponding asset amount.

##### `set_yield_bearing_source(app_id: UInt64)`
Sets the slot machine contract as the yield source.

#### Yield Mechanics

The token implements a share-based yield system:

1. Users deposit funds into the token contract
2. Funds are forwarded to the slot machine
3. Shares are minted based on the deposit amount and current exchange rate
4. Profits from the slot machine increase the underlying asset value
5. Users can withdraw their proportional share of the total assets

## Data Structures

### BankBalances
```python
class BankBalances(arc4.Struct):
    balance_available: arc4.UInt64
    balance_total: arc4.UInt64
    balance_locked: arc4.UInt64
    balance_fuse: arc4.Bool
```

### SpinParams
```python
class SpinParams(arc4.Struct):
    max_extra_payment: arc4.UInt64
    max_payout_multiplier: arc4.UInt64
    round_future_delta: arc4.UInt64
    min_bet_amount: arc4.UInt64
    max_bet_amount: arc4.UInt64
    min_bank_amount: arc4.UInt64
    spin_fuse: arc4.Bool
```

### PaylineMatch
```python
class PaylineMatch(arc4.Struct):
    count: arc4.UInt64
    initial_symbol: arc4.Byte
```

### Bet
```python
class Bet(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    claim_round: arc4.UInt64
    payline_index: arc4.UInt64
```

## Payout System

The slot machine uses a symbol-based payout system:

| Symbol | 3-in-a-row | 4-in-a-row | 5-in-a-row |
|--------|-------------|-------------|-------------|
| A      | 50x         | 200x        | 1000x       |
| B      | 20x         | 100x        | 500x        |
| C      | 10x         | 50x         | 200x        |
| D      | 5x          | 20x         | 100x        |
| _      | 0x          | 0x          | 0x          |

## Paylines

The system includes 20 predefined paylines covering various patterns:

1. **Horizontal Lines**: Top, middle, and bottom rows
2. **V-Shapes**: Diagonal patterns
3. **Peaks and Valleys**: Center-focused patterns
4. **Zigzag Patterns**: Alternating row positions
5. **Additional Patterns**: Various combinations for increased winning opportunities

## Security Features

### Access Control
- **Ownable**: Critical functions restricted to contract owner
- **Upgradeable**: Contract can be upgraded by authorized parties
- **Fuse System**: Irreversible security controls

### Bet Validation
- Deterministic outcomes using block seeds
- Claim round validation to prevent manipulation
- Automatic expiration of unclaimed bets

### Financial Safety
- Balance locking for potential payouts
- Owner-only withdrawal capabilities
- Minimum bank balance requirements

## Gas Optimization

The contracts use several optimization techniques:

- **OpUp**: Budget management for complex operations
- **Box Storage**: Efficient data storage using Algorand boxes
- **Subroutine Usage**: Code reuse and reduced deployment costs
- **Batch Operations**: Efficient handling of multiple paylines

## Deployment

### Bootstrap Requirements

Each contract has specific bootstrap costs:

- **SlotMachine**: ~71,200 microAlgos
- **SpinManager**: ~26,500 microAlgos
- **BankManager**: ~17,700 microAlgos
- **Ownable**: ~17,300 microAlgos
- **YieldBearingToken**: 100,000 microAlgos

### Box Storage

The system uses Algorand boxes for persistent storage:

- Bank balances and parameters
- Bet records and keys
- Reel data and payline configurations
- Token balances and metadata

## Usage Examples

### Basic Slot Machine Usage

```typescript
// 1. Bootstrap the contract
await slotMachine.bootstrap({ payment: bootstrapCost });

// 2. Place a bet
const betKey = await slotMachine.spin({
    bet_amount: 1000000, // 1 VOI
    max_payline_index: 9, // Check 10 paylines
    index: 0,
    payment: 1000000 + spinCost + (10 * paylineCost)
});

// 3. Wait for claim round
// 4. Claim the bet
const payout = await slotMachine.claim({ bet_key: betKey });
```

### Yield Token Usage

```typescript
// 1. Bootstrap the token
await yieldToken.bootstrap();

// 2. Set yield source
await yieldToken.set_yield_bearing_source(slotMachineAppId);

// 3. Deposit funds
const shares = await yieldToken.deposit({ payment: depositAmount + boxCost });

// 4. Withdraw funds
const amount = await yieldToken.withdraw(shares);
```

## Testing

The system includes comprehensive test coverage:

- Contract deployment and bootstrap tests
- Betting and spinning functionality
- Payout calculation and distribution
- Yield token mechanics
- Access control and security features

## Network Compatibility

The contracts are designed for the Voi Network and Algorand mainnet, with support for:

- ARC4 standard compliance
- Box storage optimization
- OpUp fee management
- Group transaction support

## Future Enhancements

Potential improvements include:

- Additional payline patterns
- Progressive jackpot system
- Tournament functionality
- Cross-chain compatibility
- Enhanced yield distribution models
