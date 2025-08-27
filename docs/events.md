# Events Documentation

## Overview

The 5reel smart contracts emit various events to track important state changes and user interactions. These events provide transparency, enable real-time monitoring, and support analytics and auditing. All events follow the ARC4 standard and can be monitored by frontend applications, analytics systems, and blockchain explorers.

## Event Types

### BetPlaced

Emitted when a new bet is placed on the slot machine.

**Event Structure**:
```python
class BetPlaced(arc4.Struct):
    who: arc4.Address          # Address of the player placing the bet
    amount: arc4.UInt64        # Bet amount in atomic units
    max_payline_index: arc4.UInt64  # Maximum payline index to check (0-19)
    index: arc4.UInt64         # Player's choice of index
    claim_round: arc4.UInt64   # Round when the bet can be claimed
```

**Emitted By**: `SlotMachine.spin()` and `SpinManager.spin()`

**When Emitted**: 
- After bet validation passes
- After bet amount is locked
- After bet record is created in storage
- After bank balances are updated

**Use Cases**:
- Track betting activity and volume
- Monitor player behavior patterns
- Calculate house edge and profitability
- Provide real-time game updates
- Audit betting history
- Monitor bank balance changes

**Example Event Data**:
```json
{
  "who": "ABC123...",
  "amount": 1000000,
  "max_payline_index": 9,
  "index": 0,
  "claim_round": 12345678
}
```

### BetClaimed

Emitted when a bet is claimed and payout is calculated.

**Event Structure**:
```python
class BetClaimed(arc4.Struct):
    who: arc4.Address          # Address of the player claiming the bet
    amount: arc4.UInt64        # Original bet amount in atomic units
    max_payline_index: arc4.UInt64  # Maximum payline index that was checked
    index: arc4.UInt64         # Player's choice of index
    claim_round: arc4.UInt64   # Round when the bet was claimed
    payout: arc4.UInt64        # Payout amount in atomic units (0 if no win)
```

**Emitted By**: `SlotMachine.claim()` and `SpinManager.claim()`

**When Emitted**:
- After bet outcome is calculated
- After payout is determined (win or loss)
- After bet record is removed from storage
- After funds are transferred to player (if applicable)
- After bank balances are updated

**Use Cases**:
- Track payout distribution and amounts
- Calculate win/loss ratios
- Monitor game fairness and RTP (Return to Player)
- Provide payout history for players
- Audit game outcomes and payouts
- Monitor bank balance changes

**Example Event Data**:
```json
{
  "who": "ABC123...",
  "amount": 1000000,
  "max_payline_index": 9,
  "index": 0,
  "claim_round": 12345678,
  "payout": 5000000
}
```

**Note**: A payout of 0 indicates no winning combination was found on any payline.

### BalancesUpdated

Emitted when bank balances change due to deposits, withdrawals, or bet operations.

**Event Structure**:
```python
class BalancesUpdated(arc4.Struct):
    balance_available: arc4.UInt64    # Available balance for new bets
    balance_total: arc4.UInt64        # Total balance including locked amounts
    balance_locked: arc4.UInt64       # Balance locked in active bets
```

**Emitted By**: `BankManager` balance operations and `SpinManager` bet operations

**When Emitted**:
- After deposits are made to the bank
- After withdrawals are processed
- After bet amounts are locked/unlocked
- After payouts are processed
- After owner deposits

**Use Cases**:
- Monitor bank liquidity in real-time
- Track balance changes for auditing
- Ensure sufficient funds for payouts
- Monitor locked vs. available balance ratios
- Provide transparency for players and operators

**Example Event Data**:
```json
{
  "balance_available": 50000000000,
  "balance_total": 100000000000,
  "balance_locked": 50000000000
}
```

**Balance Types**:
- **Available**: Funds that can be used for new bets
- **Locked**: Funds reserved for active bets (calculated as bet_amount × max_payout_multiplier)
- **Total**: Sum of available and locked balances

### arc200_Transfer

Standard ARC-200 token transfer event for the yield-bearing token.

**Event Structure**:
```python
class arc200_Transfer(arc4.Struct):
    from: arc4.Address         # Source address (zero address for mints)
    to: arc4.Address           # Destination address (zero address for burns)
    amount: arc4.UInt256       # Amount of tokens transferred
```

**Emitted By**: `YieldBearingToken.deposit()` and `YieldBearingToken.withdraw()`

**When Emitted**:
- **Minting**: When users deposit funds and receive yield tokens
- **Burning**: When users withdraw funds and burn yield tokens
- **Transfers**: When tokens are transferred between addresses

**Use Cases**:
- Track token minting and burning
- Monitor yield token circulation
- Provide standard token transfer history
- Enable wallet integration and balance tracking
- Audit token supply changes

**Example Event Data**:
```json
{
  "from": "000000000000000000000000000000000000000000000000000000000000000000",
  "to": "ABC123...",
  "amount": "1000000000000000000000"
}
```

**Special Addresses**:
- `from: 0x0000...` indicates a mint operation
- `to: 0x0000...` indicates a burn operation

## Event Monitoring

### Frontend Integration

Events can be monitored in real-time to provide live updates to users:

```typescript
// Monitor bet placement events
const betPlacedEvents = await slotMachine.getEvents({
    name: "BetPlaced",
    filters: { who: playerAddress }
});

// Monitor payout events
const payoutEvents = await slotMachine.getEvents({
    name: "BetClaimed",
    filters: { who: playerAddress, payout: { greaterThan: 0 } }
});

// Monitor bank balance changes
const balanceEvents = await bankManager.getEvents({
    name: "BalancesUpdated"
});

// Monitor token transfers
const transferEvents = await yieldToken.getEvents({
    name: "arc200_Transfer",
    filters: { to: playerAddress }
});
```

### Event Filtering

Advanced filtering options for efficient event monitoring:

```typescript
// Filter by time range
const recentEvents = await slotMachine.getEvents({
    name: "BetPlaced",
    filters: {
        round: { greaterThan: currentRound - 1000 }
    }
});

// Filter by bet amount
const highRollerEvents = await slotMachine.getEvents({
    name: "BetPlaced",
    filters: {
        amount: { greaterThan: 10000000 } // 10 VOI
    }
});

// Filter by payout amount
const winningEvents = await slotMachine.getEvents({
    name: "BetClaimed",
    filters: {
        payout: { greaterThan: 0 }
    }
});

// Filter balance updates by threshold
const significantBalanceChanges = await bankManager.getEvents({
    name: "BalancesUpdated",
    filters: {
        balance_total: { greaterThan: 100000000000 } // 100k VOI
    }
});
```

### Real-time Monitoring

Set up continuous event monitoring for live updates:

```typescript
// Subscribe to all game events
const unsubscribe = slotMachine.subscribeToEvents({
    name: ["BetPlaced", "BetClaimed"],
    callback: (event) => {
        console.log('New game event:', event);
        updateGameUI(event);
    }
});

// Subscribe to bank balance updates
const balanceUnsubscribe = bankManager.subscribeToEvents({
    name: "BalancesUpdated",
    callback: (event) => {
        console.log('Balance updated:', event);
        updateBankUI(event);
    }
});

// Clean up subscriptions
unsubscribe();
balanceUnsubscribe();
```

## Analytics and Reporting

### Volume Tracking

Monitor total betting volume over time:

```typescript
async function getDailyVolume() {
    const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const events = await slotMachine.getEvents({
        name: "BetPlaced",
        filters: {
            round: { greaterThan: today }
        }
    });
    
    return events.reduce((total, event) => total + event.amount, 0);
}
```

### Player Behavior Analysis

Analyze betting patterns and preferences:

```typescript
async function getPlayerStats(playerAddress) {
    const betEvents = await slotMachine.getEvents({
        name: "BetPlaced",
        filters: { who: playerAddress }
    });
    
    const claimEvents = await slotMachine.getEvents({
        name: "BetClaimed",
        filters: { who: playerAddress }
    });
    
    return {
        totalBets: betEvents.length,
        totalWagered: betEvents.reduce((sum, e) => sum + e.amount, 0),
        totalWon: claimEvents.reduce((sum, e) => sum + e.payout, 0),
        averageBet: betEvents.reduce((sum, e) => sum + e.amount, 0) / betEvents.length,
        preferredPaylines: betEvents.reduce((acc, e) => {
            acc[e.max_payline_index] = (acc[e.max_payline_index] || 0) + 1;
            return acc;
        }, {})
    };
}
```

### Bank Health Monitoring

Track bank liquidity and risk metrics:

```typescript
async function getBankHealthMetrics() {
    const balanceEvents = await bankManager.getEvents({
        name: "BalancesUpdated"
    });
    
    if (balanceEvents.length === 0) return null;
    
    const latest = balanceEvents[balanceEvents.length - 1];
    const available = latest.balance_available;
    const locked = latest.balance_locked;
    const total = latest.balance_total;
    
    return {
        liquidityRatio: available / total,
        lockedRatio: locked / total,
        availableBalance: available,
        lockedBalance: locked,
        totalBalance: total,
        timestamp: Date.now()
    };
}
```

### RTP Calculation

Calculate actual return-to-player percentages:

```typescript
async function calculateRTP() {
    const betEvents = await slotMachine.getEvents({
        name: "BetPlaced"
    });
    
    const claimEvents = await slotMachine.getEvents({
        name: "BetClaimed"
    });
    
    const totalWagered = betEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalPaidOut = claimEvents.reduce((sum, e) => sum + e.payout, 0);
    
    return (totalPaidOut / totalWagered) * 100;
}
```

### Profitability Analysis

Track house edge and revenue:

```typescript
async function getHouseEdge() {
    const betEvents = await slotMachine.getEvents({
        name: "BetPlaced"
    });
    
    const claimEvents = await slotMachine.getEvents({
        name: "BetClaimed"
    });
    
    const totalWagered = betEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalPaidOut = claimEvents.reduce((sum, e) => sum + e.payout, 0);
    
    return totalWagered - totalPaidOut;
}
```

## Blockchain Explorer

### Transparency and Auditability

Events are visible on blockchain explorers and provide:

- **Game Fairness Verification**: All bets and outcomes are publicly verifiable
- **Payout Distribution Audit**: Complete history of all payouts
- **Bank Balance Transparency**: Real-time visibility into contract liquidity
- **Contract Activity Tracking**: Real-time monitoring of contract usage
- **Proof of Gameplay**: Immutable record of all player interactions

### Explorer Integration

Most blockchain explorers support event filtering:

- **AlgoExplorer**: Filter by application ID and event type
- **VoiScan**: Real-time event monitoring and filtering
- **Custom APIs**: Direct blockchain node queries for events

## Event Schema

### Complete Event Definitions

```python
# BetPlaced Event
class BetPlaced(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64

# BetClaimed Event  
class BetClaimed(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64
    payout: arc4.UInt64

# BalancesUpdated Event
class BalancesUpdated(arc4.Struct):
    balance_available: arc4.UInt64
    balance_total: arc4.UInt64
    balance_locked: arc4.UInt64

# ARC-200 Transfer Event
class arc200_Transfer(arc4.Struct):
    from: arc4.Address
    to: arc4.Address
    amount: arc4.UInt256
```

### Event Indexing

Events are automatically indexed by the Algorand blockchain and can be queried using:

- **Application ID**: The specific contract that emitted the event
- **Event Name**: The type of event (BetPlaced, BetClaimed, BalancesUpdated, arc200_Transfer)
- **Round Number**: The block round when the event occurred
- **Transaction ID**: The specific transaction that triggered the event

## Best Practices

### Event Monitoring

1. **Use Filters**: Always filter events by relevant criteria to reduce data volume
2. **Handle Pagination**: Large event sets may require pagination
3. **Error Handling**: Implement proper error handling for network issues
4. **Rate Limiting**: Respect API rate limits when querying events
5. **Balance Monitoring**: Monitor BalancesUpdated events for critical bank health alerts

### Data Storage

1. **Local Caching**: Cache frequently accessed event data
2. **Database Storage**: Store events in a local database for analysis
3. **Backup Strategy**: Implement backup strategies for critical event data
4. **Data Retention**: Define data retention policies based on business needs
5. **Balance History**: Maintain historical balance snapshots for trend analysis

### Performance Optimization

1. **Batch Queries**: Use batch queries when possible
2. **Async Processing**: Process events asynchronously to avoid blocking
3. **Connection Pooling**: Reuse connections for multiple event queries
4. **Compression**: Use compression for large event datasets
5. **Selective Monitoring**: Only monitor events relevant to your application

## Troubleshooting

### Common Issues

1. **Event Not Found**: Verify application ID and event name
2. **Filter Errors**: Check filter syntax and supported operators
3. **Network Timeouts**: Implement retry logic for network issues
4. **Rate Limiting**: Respect API rate limits and implement backoff
5. **Balance Sync Issues**: Verify BalancesUpdated events are being processed correctly

### Debugging Tips

1. **Log All Events**: Log all events during development for debugging
2. **Verify Event Data**: Validate event structure and data types
3. **Test Filters**: Test event filters with known data
4. **Monitor Performance**: Track query performance and optimize as needed
5. **Balance Verification**: Cross-reference BalancesUpdated events with contract state

## Related Documentation

- **[Main Documentation](index.md)**: Overview of the 5reel platform
- **[Yield-Bearing Token](yield-bearing-token.md)**: Detailed token mechanics
- **[Token Lockup Mechanism](token-lockup-mechanism.md)**: Balance management system 