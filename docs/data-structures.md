# Data Structures

This document describes all the data structures used in the 5reel smart contract system.

## Core Data Structures

### BankBalances
```python
class BankBalances(arc4.Struct):
    balance_available: arc4.UInt64
    balance_total: arc4.UInt64
    balance_locked: arc4.UInt64
    balance_fuse: arc4.Bool
```

**Description**: Tracks the financial state of the BankManager contract.

**Fields**:
- `balance_available`: Funds available for immediate use
- `balance_total`: Total funds in the contract
- `balance_locked`: Funds reserved for potential payouts
- `balance_fuse`: Security flag to prevent balance modifications

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

**Description**: Configuration parameters for the SpinManager contract.

**Fields**:
- `max_extra_payment`: Maximum additional payment allowed (1 VOI)
- `max_payout_multiplier`: Maximum payout multiplier (10000x)
- `round_future_delta`: Rounds to wait before claiming (1)
- `min_bet_amount`: Minimum bet amount (1 VOI)
- `max_bet_amount`: Maximum bet amount (2000 VOI)
- `min_bank_amount`: Minimum required bank balance (100k VOI)
- `spin_fuse`: Security flag to prevent parameter modifications

### PaylineMatch
```python
class PaylineMatch(arc4.Struct):
    count: arc4.UInt64
    symbol: arc4.Byte
```

**Description**: Result of matching a payline against a grid.

**Fields**:
- `count`: Number of consecutive matching symbols
- `symbol`: The symbol that matched (A, B, C, D, or _)

### Bet
```python
class Bet(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64
```

**Description**: Represents a single bet placed by a user.

**Fields**:
- `who`: Address of the user who placed the bet
- `amount`: Amount bet in atomic units
- `max_payline_index`: Maximum payline to check (0-19)
- `index`: Player's choice of index
- `claim_round`: Round number when the bet can be claimed

## Event Data Structures

### BetPlaced
```python
class BetPlaced(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64
```

**Description**: Event emitted when a new bet is placed.

**Fields**: Same as `Bet` structure.

### BetClaimed
```python
class BetClaimed(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64
    payout: arc4.UInt64
```

**Description**: Event emitted when a bet is claimed and payout calculated.

**Fields**: All fields from `Bet` plus:
- `payout`: Amount won in atomic units


### BalancesUpdated
```python
class BalancesUpdated(arc4.Struct):
    balance_available: arc4.UInt64
    balance_total: arc4.UInt64
    balance_locked: arc4.UInt64
```

**Description**: Event emitted when bank balances are updated.

**Fields**:
- `balance_available`: Current available balance
- `balance_total`: Current total balance
- `balance_locked`: Current locked balance

### YBTDeposit
```python
class YBTDeposit(arc4.Struct):
    amount: arc4.UInt64
    shares: arc4.UInt256
    new_shares: arc4.UInt256
```

**Description**: Event emitted when funds are deposited into the yield-bearing token.

**Fields**:
- `amount`: Amount deposited in atomic units
- `shares`: Number of shares minted
- `new_shares`: Total shares after deposit

### YBTWithdraw
```python
class YBTWithdraw(arc4.Struct):
    amount: arc4.UInt64
    shares: arc4.UInt256
    new_shares: arc4.UInt256
```

**Description**: Event emitted when funds are withdrawn from the yield-bearing token.

**Fields**:
- `amount`: Amount withdrawn in atomic units
- `shares`: Number of shares burned
- `new_shares`: Total shares after withdrawal

### Participated
```python
class Participated(arc4.Struct):
    who: arc4.Address
    partkey: PartKeyInfo
```

**Description**: Event emitted when participation keys are registered.

**Fields**:
- `who`: Address that registered the participation keys
- `partkey`: Participation key information

### MachineRegistered
```python
class MachineRegistered(arc4.Struct):
    machine_id: arc4.UInt64
```

**Description**: Event emitted when a machine is registered in the registry.

**Fields**:
- `machine_id`: Application ID of the registered machine

### MachineDeleted
```python
class MachineDeleted(arc4.Struct):
    machine_id: arc4.UInt64
```

**Description**: Event emitted when a machine is removed from the registry.

**Fields**:
- `machine_id`: Application ID of the removed machine

### MachineSynced
```python
class MachineSynced(arc4.Struct):
    machine_id: arc4.UInt64
```

**Description**: Event emitted when a machine is synchronized in the registry.

**Fields**:
- `machine_id`: Application ID of the synchronized machine

## Registry Data Structures

### Machine
```python
class Machine(arc4.Struct):
    machine_id: arc4.UInt64
    machine_hash: Bytes32
    machine_balance: arc4.UInt64
    updated_at: arc4.UInt64
```

**Description**: Represents a slot machine in the registry.

**Fields**:
- `machine_id`: Application ID of the slot machine
- `machine_hash`: Hash of the machine configuration for validation
- `machine_balance`: Current balance of the machine
- `updated_at`: Timestamp of last update

### PartKeyInfo
```python
class PartKeyInfo(arc4.Struct):
    address: arc4.Address
    vote_key: Bytes32
    selection_key: Bytes32
    vote_first: arc4.UInt64
    vote_last: arc4.UInt64
    vote_key_dilution: arc4.UInt64
    state_proof_key: Bytes64
```

**Description**: Contains participation key information for consensus.

**Fields**:
- `address`: Address of the participant
- `vote_key`: 32-byte voting key
- `selection_key`: 32-byte selection key
- `vote_first`: First voting round
- `vote_last`: Last voting round
- `vote_key_dilution`: Vote key dilution factor
- `state_proof_key`: 64-byte state proof key

## Payout Data Structures

### GridPayout
```python
class GridPayout(arc4.Struct):
    grid: Bytes15
    payout: arc4.UInt64
```

**Description**: Contains grid and total payout information.

**Fields**:
- `grid`: 15-byte grid representation (5x3 slot machine grid)
- `payout`: Total payout amount for the grid

### GridPayoutDetails
```python
class GridPayoutDetails(arc4.Struct):
    grid: Bytes15
    payout: PayoutDetails
```

**Description**: Contains grid and detailed payout breakdown.

**Fields**:
- `grid`: 15-byte grid representation
- `payout`: Array of 20 payout amounts (one for each payline)
## Usage Examples

### Creating a Bet Structure
```python
# Example bet creation
bet = Bet(
    who=player_address,
    amount=1000000,  # 1 VOI
    max_payline_index=9,  # Check 10 paylines
    index=0,
    claim_round=current_round + 1
)
```

### Working with BankBalances
```python
# Example balance checking
if balances.balance_available >= required_amount:
    # Process transaction
    pass
else:
    # Insufficient funds
    pass
```

### Payline Matching

### Working with Machine Registry
```python
# Example machine registration
machine = Machine(
    machine_id=app_id,
    machine_hash=sha256(reel_data),
    machine_balance=available_balance,
    updated_at=current_timestamp
)
```

### Processing Grid Payouts
```python
# Example grid payout calculation
grid_payout = get_block_seed_bet_key_grid_total_payout(
    seed=block_seed,
    bet_key=bet_key,
    bet_amount=1000000,
    lines=10
)
total_winnings = grid_payout.payout
```

### Handling Yield Token Events
```python
# Example deposit event handling
deposit_event = YBTDeposit(
    amount=deposit_amount,
    shares=minted_shares,
    new_shares=total_shares_after_deposit
)
```
```python
# Example payline match processing
match = match_payline(grid, payline_index)
if match.count >= 3:
    multiplier = get_payout_multiplier(match.symbol, match.count)
    payout = bet_amount * multiplier
```

## Data Type Mappings

### ARC4 Types to Algorand Types
- `arc4.UInt64` → `uint64`
- `arc4.Address` → `address`
- `arc4.Byte` → `byte`
- `arc4.Bool` → `bool`
- `arc4.Bytes32` → `bytes32`
- `arc4.Bytes56` → `bytes56`
- `arc4.Bytes15` → `bytes15`
- `arc4.Bytes500` → `bytes500`
- `arc4.Bytes100` → `bytes100`
- `arc4.Bytes3` → `bytes3`
- `arc4.Bytes1` → `bytes1`
- `arc4.Bytes5` → `bytes5`
- `arc4.Bytes8` → `bytes8`
- `arc4.UInt256` → `uint256`
- `Bytes64` → `bytes64` (64-byte array)
- `PayoutDetails` → `StaticArray[UInt64, 20]` (20 payout amounts)

### Static Arrays
- `StaticArray[UInt64, 5]` → Array of 5 uint64 values
- `StaticArray[UInt64, 100]` → Array of 100 uint64 values

## Storage Considerations

### Box Storage
Most data structures are stored in Algorand boxes for efficient access and persistence:

- **BankBalances**: Stored in a single box for the BankManager
- **SpinParams**: Stored in a single box for the SpinManager
- **Bet Records**: Stored in individual boxes keyed by bet_key
- **Reel Data**: Stored in boxes for efficient reel access
- **Machine Registry**: Stored in boxes with machine ID as key
- **Participation Keys**: Stored temporarily for event emission

### Memory Layout
- Structs are packed efficiently using ARC4's binary serialization
- Fixed-size fields (UInt64, Address, Bool) have consistent memory layout
- Variable-length fields (Bytes) are prefixed with length information

## Serialization

All data structures implement ARC4 serialization for:
- On-chain storage
- Cross-contract communication
- Event emission
- Client-side parsing

### Example Serialization
```python
# Serialize a bet for storage
serialized_bet = bet.bytes

# Deserialize from storage
deserialized_bet = Bet.from_bytes(serialized_bet)
``` 