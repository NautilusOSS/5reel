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

##### `get_seed_bet_grid(seed: Bytes32, bet_key: Bytes56) -> Bytes15`
Generates a grid based on both a seed and bet key, ensuring unique outcomes for each bet.

**Parameters**:
- `seed`: 32-byte seed for deterministic grid generation
- `bet_key`: Unique bet identifier

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

##### `get_paylines() -> StaticArray[UInt64, 100]`
Returns all 20 paylines as a single array of 100 integers.

**Returns**: Array containing all payline patterns (20 paylines × 5 positions each)

**Note**: Each payline consists of 5 integers representing the row positions (0=top, 1=middle, 2=bottom)

##### `match_payline(grid: Bytes15, payline_index: UInt64) -> PaylineMatch`
Matches a grid against a specific payline to determine wins.

**Returns**: `PaylineMatch` with count and symbol

##### `get_payout_multiplier(symbol: Byte, count: UInt64) -> UInt64`
Gets the payout multiplier for a specific symbol and consecutive count.

**Parameters**:
- `symbol`: The symbol to check (A, B, C, D, or _)
- `count`: The number of consecutive symbols (3, 4, or 5)

**Returns**: Payout multiplier as a multiplier (e.g., 200 for 200x)

**Example**: `get_payout_multiplier(A, 5)` returns 10000 for a 5-in-a-row A symbol

##### `get_bet_grid(bet_key: Bytes56) -> Bytes15`
Gets the grid for a specific bet using the bet's claim round seed.

**Parameters**:
- `bet_key`: The unique identifier for the bet

**Returns**: 15-byte grid representation for the bet

**Note**: This method generates a deterministic grid based on the bet's claim round and bet key

##### `get_grid_payline_symbols(grid: Bytes15, payline_index: UInt64) -> Bytes5`
Gets the symbols along a specific payline in a grid.

**Parameters**:
- `grid`: The 15-byte grid representation
- `payline_index`: Index of the payline to check (0-19)

**Returns**: 5-byte array containing the symbols along the specified payline

**Note**: This method extracts the symbols that fall on a specific payline pattern

##### `bootstrap_cost() -> UInt64`
Returns the cost required to bootstrap the contract.

**Returns**: Bootstrap cost in microAlgos

##### `post_update()`
Updates the contract version after an upgrade.

**Note**: This method is called after contract upgrades to reset version numbers

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

##### `get_reel_window_length() -> UInt64`
Returns the length of the reel window used for grid generation.

**Returns**: The window length (default: 3)

**Note**: This represents how many symbols are visible in each reel window

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

##### `get_bet_claim_round(bet_key: Bytes56) -> UInt64`
Gets the claim round for a specific bet.

**Parameters**:
- `bet_key`: Unique identifier for the bet

**Returns**: The round number when the bet can be claimed

**Note**: This is useful for determining when a bet is ready to be claimed

##### `get_bet_key(address: Address, amount: UInt64, max_payline_index: UInt64, index: UInt64) -> Bytes56`
Generates the bet key for a specific bet configuration.

**Parameters**:
- `address`: The address placing the bet
- `amount`: The bet amount
- `max_payline_index`: Maximum payline to check
- `index`: Player's choice of index

**Returns**: The unique bet key for the specified configuration

**Note**: This method is useful for generating bet keys without actually placing bets

##### `spin_cost() -> UInt64`
Gets the base cost for spinning the slot machine.

**Returns**: The cost in microAlgos (currently 50,500 microAlgos)

**Note**: This is the base cost before adding payline costs

##### `spin_payline_cost() -> UInt64`
Gets the cost per payline for spinning the slot machine.

**Returns**: The cost per payline in microAlgos (currently 30,000 microAlgos)

**Note**: This cost is multiplied by the number of paylines being checked

#### Configuration

The SpinManager uses configurable parameters stored in boxes:

- `max_extra_payment`: Maximum additional payment allowed (1 VOI)
- `max_payout_multiplier`: Maximum payout multiplier (10000x)
- `round_future_delta`: Rounds to wait before claiming (1)
- `min_bet_amount`: Minimum bet amount (1 VOI)
- `max_bet_amount`: Maximum bet amount (2000 VOI)
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
Initializes the token with configurable name and symbol.

##### `set_name(name: Bytes32)`
Sets the token name (owner only).

##### `set_symbol(symbol: Bytes8)`
Sets the token symbol (owner only).

##### `deposit() -> UInt256`
Deposits funds and mints shares based on the current exchange rate.

**Cost**: 28,500 microAlgos for first-time users (box creation)

##### `withdraw(amount: UInt256) -> UInt64`
Burns shares and returns the corresponding asset amount.

##### `set_yield_bearing_source(app_id: UInt64)`
Sets the slot machine contract as the yield source.

##### `revoke_yield_bearing_source(new_owner: Address)`
Revokes the yield bearing source by transferring ownership to a new owner.

**Parameters**:
- `new_owner`: The new owner address for the yield source contract

**Note**: This method transfers ownership of the yield source contract away from the token contract

##### `burn_yield_fuse()`
Burns the yield fuse, preventing further yield source modifications.

**Note**: This is an irreversible operation that permanently disables yield source changes

##### `burn_stakeable_fuse()`
Burns the stakeable fuse, disabling staking functionality.

**Note**: This is an irreversible operation that permanently disables staking features

##### `burn_upgradeable_fuse()`
Burns the upgradeable fuse, preventing future contract upgrades.

**Note**: This is an irreversible operation that permanently locks the contract version

#### Yield Mechanics

The token implements a share-based yield system:

1. Users deposit funds into the token contract
2. Funds are forwarded to the slot machine
3. Shares are minted based on the deposit amount and current exchange rate
4. Profits from the slot machine increase the underlying asset value
5. Users can withdraw their proportional share of the total assets

## Events

The smart contracts emit various events to track important state changes and user interactions. These events provide transparency, enable real-time monitoring, and support analytics and auditing.

**Key Events**:
- **BetPlaced**: Emitted when a new bet is placed
- **BetClaimed**: Emitted when a bet is claimed and payout calculated
- **arc200_Transfer**: Standard token transfer events for the yield token

For comprehensive event documentation including monitoring, analytics, and integration examples, see **[Events Documentation](events.md)**.

## Data Structures

For comprehensive documentation of all data structures used in the 5reel smart contract system, see **[Data Structures Documentation](data-structures.md)**.

The system uses several key data structures including:
- **BankBalances**: Financial state tracking for the BankManager
- **SpinParams**: Configuration parameters for the SpinManager
- **PaylineMatch**: Results of payline matching against grids
- **Bet**: Individual bet records with metadata
- **Event Structures**: BetPlaced and BetClaimed events for tracking

## Payout System

The slot machine uses a symbol-based payout system with updated multipliers:

| Symbol | 3-in-a-row | 4-in-a-row | 5-in-a-row |
|--------|-------------|-------------|-------------|
| A      | 200x        | 1000x       | 10000x      |
| B      | 60x         | 200x        | 1000x       |
| C      | 30x         | 100x        | 500x        |
| D      | 10x         | 55x         | 250x        |
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
- Maximum claim round delta: 1000 rounds

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

// 2. Set name and symbol
await yieldToken.set_name("Submarine Gaming Token");
await yieldToken.set_symbol("GAME");

// 3. Set yield source
await yieldToken.set_yield_bearing_source(slotMachineAppId);

// 4. Deposit funds
const shares = await yieldToken.deposit({ payment: depositAmount + boxCost });

// 5. Withdraw funds
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

## Related Documentation

- **[Spin and Claim Guide](spin-and-claim-guide.md)**: Complete guide to placing bets, waiting for outcomes, and claiming winnings
- **[Data Structures Documentation](data-structures.md)**: Complete reference for all smart contract data structures, types, and usage examples
- **[Events Documentation](events.md)**: Comprehensive guide to all smart contract events, monitoring, and analytics
- **[Yield-Bearing Token Documentation](yield-bearing-token.md)**: Detailed explanation of the yield token mechanics and mathematics
- **[Token Lockup Mechanism](token-lockup-mechanism.md)**: Comprehensive guide to the balance management and lockup system