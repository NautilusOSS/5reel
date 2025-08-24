# Token Lockup and Release Mechanism

## Overview

The 5reel slot machine system implements a sophisticated token lockup and release mechanism to ensure financial solvency and prevent over-extension of the bank. This system manages three distinct balance types and automatically locks funds based on potential payout obligations.

## Balance Types

The system maintains three separate balance categories:

### 1. **Total Balance** (`balance_total`)
- **Purpose**: Represents the total funds in the contract
- **Source**: All deposits (user bets + owner deposits)
- **Behavior**: Always increases with deposits, decreases with withdrawals
- **Formula**: `balance_total = balance_available + balance_locked`

### 2. **Available Balance** (`balance_available`)
- **Purpose**: Funds immediately available for new bets and withdrawals
- **Source**: Deposits minus locked amounts
- **Behavior**: Fluctuates based on bet placement and claim operations
- **Constraints**: Must be sufficient to cover new bet lockups

### 3. **Locked Balance** (`balance_locked`)
- **Purpose**: Funds reserved for potential payouts on active bets
- **Source**: Automatic lockup when bets are placed
- **Behavior**: Increases with bet placement, decreases with bet claims
- **Formula**: `balance_locked = Σ(lockup_amount for all active bets)`

## Lockup Calculation

### Lockup Amount Formula

```python
def _lockup_amount(self, bet_amount: UInt64) -> UInt64:
    return bet_amount * self._spin_params().max_payout_multiplier.native
```

**Current Configuration**:
- **Maximum Payout Multiplier**: 10,000x
- **Lockup Amount**: `bet_amount × 10,000`

### Example Lockup Calculations

| Bet Amount | Lockup Amount | Multiplier |
|------------|---------------|------------|
| 1 VOI      | 10,000 VOI    | 10,000x    |
| 5 VOI      | 50,000 VOI    | 10,000x    |
| 10 VOI     | 100,000 VOI   | 10,000x    |
| 100 VOI    | 1,000,000 VOI | 10,000x    |

## Lockup Process

### 1. **Bet Placement Phase**

When a user places a bet, the following sequence occurs:

```python
# 1. Add bet amount to total balance
self._increment_balance_total(expected_payment_amount)

# 2. Add bet amount to available balance
self._increment_balance_available(expected_payment_amount)

# 3. Calculate and lock up potential payout amount
lockup_amount = self._lockup_amount(bet_amount)
self._increment_balance_locked(lockup_amount)
self._decrement_balance_available(lockup_amount)

# 4. Create bet record
self.bet[bet_key] = Bet(...)
```

**Balance Changes During Bet Placement**:
- **Total Balance**: + `bet_amount × payline_count`
- **Available Balance**: + `bet_amount × payline_count` - `lockup_amount`
- **Locked Balance**: + `lockup_amount`

### 2. **Bet Processing Phase**

During the claim round, the system:
1. Generates the deterministic grid
2. Evaluates all paylines
3. Calculates actual payout
4. Releases the lockup amount

### 3. **Claim and Release Phase**

When a bet is claimed, the lockup is released:

```python
# 1. Release lockup amount
lockup_release = self._lockup_amount(bet.amount.native)
self._decrement_balance_locked(lockup_release)
self._increment_balance_available(lockup_release)

# 2. Process actual payout
if total_payout > 0:
    itxn.Payment(receiver=bet.who.native, amount=total_payout).submit()

# 3. Clean up bet record
del self.bet[bet_key]
```

**Balance Changes During Claim**:
- **Total Balance**: - `actual_payout` (if any)
- **Available Balance**: + `lockup_amount` - `actual_payout`
- **Locked Balance**: - `lockup_amount`

## Financial Safety Mechanisms

### 1. **Minimum Bank Balance Requirement**

```python
assert (
    self._get_balance_total() >= self._get_min_bank_amount()
), "balance total must be greater than min bank amount"
```

**Current Setting**: 100,000 VOI minimum total balance

### 2. **Lockup Validation**

The system ensures that:
- Lockup amounts never exceed available balance
- Total balance always equals available + locked
- No bet can be placed if insufficient funds exist

### 3. **Automatic Balance Reconciliation**

```python
# During bet placement
self._increment_balance_total(expected_payment_amount)
self._increment_balance_available(expected_payment_amount)
self._increment_balance_locked(lockup_amount)
self._decrement_balance_available(lockup_amount)

# During claim
self._decrement_balance_locked(lockup_release)
self._increment_balance_available(lockup_release)
```

## Yield Token Integration

### 1. **Withdrawal Limitations**

The yield-bearing token respects the lockup mechanism:

```python
def _get_max_withdrawable_amount(self, who: Account) -> BigUInt:
    # Get available and locked balances from yield bearing source
    available_balance, txn1 = arc4.abi_call(
        BankManagerInterface.get_balance_available,
        app_id=app,
    )
    locked_balance, txn2 = arc4.abi_call(
        BankManagerInterface.get_balance_locked,
        app_id=app,
    )
    
    # Calculate maximum withdrawable based on available/locked ratio
    total_balance = available_balance.native + locked_balance.native
    max_withdrawable = (
        balance * BigUInt(available_balance.native) * SCALING_FACTOR
    ) // (BigUInt(total_balance) * SCALING_FACTOR)
    
    return max_withdrawable
```

### 2. **Proportional Withdrawal**

Users can only withdraw funds proportional to the available balance:

- **High Lockup Ratio**: Limited withdrawal capacity
- **Low Lockup Ratio**: Full withdrawal capacity
- **Dynamic Adjustment**: Automatically adjusts based on current lockup status

## Risk Management

### 1. **Over-Extension Prevention**

The lockup system prevents the bank from:
- Accepting bets that exceed available funds
- Becoming insolvent due to large potential payouts
- Experiencing bank runs during high activity periods

### 2. **Liquidity Management**

- **Available Balance**: Ensures immediate liquidity for new bets
- **Locked Balance**: Reserves funds for guaranteed obligations
- **Total Balance**: Provides overall financial health indicator

### 3. **Bet Size Limits**

```python
# Maximum bet amount: 2000 VOI
max_bet_amount=arc4.UInt64(2000 * 10**6)

# Maximum lockup per bet: 20,000,000 VOI
# (2000 VOI × 10,000 multiplier)
```

## Monitoring and Analytics

### 1. **Key Metrics**

- **Lockup Ratio**: `balance_locked / balance_total`
- **Available Ratio**: `balance_available / balance_total`
- **Utilization Rate**: `balance_locked / (balance_total - min_bank_amount)`

### 2. **Health Indicators**

- **Healthy**: Lockup ratio < 80%
- **Warning**: Lockup ratio 80-90%
- **Critical**: Lockup ratio > 90%

### 3. **Balance Queries**

```python
# Get all balances
balances = slot_machine.get_balances()

# Get specific balance types
available = slot_machine.get_balance_available()
locked = slot_machine.get_balance_locked()
total = slot_machine.get_balance_total()
```

## Operational Considerations

### 1. **Bank Management**

- **Owner Deposits**: Increase available balance for new bets
- **Owner Withdrawals**: Must respect lockup constraints
- **Balance Monitoring**: Regular checks on lockup ratios

### 2. **User Experience**

- **Bet Rejection**: Clear error messages when insufficient funds
- **Claim Timing**: Automatic lockup release upon claim
- **Transparency**: Public balance information

### 3. **Emergency Procedures**

- **Fuse System**: Irreversible security controls
- **Owner Override**: Emergency withdrawal capabilities
- **Graceful Degradation**: Bet rejection rather than system failure

## Mathematical Examples

### Example 1: Single Bet Scenario

**Initial State**:
- Total Balance: 100,000 VOI
- Available Balance: 100,000 VOI
- Locked Balance: 0 VOI

**Place 10 VOI Bet**:
- Lockup Amount: 10 × 10,000 = 100,000 VOI
- New Total Balance: 110,000 VOI
- New Available Balance: 10,000 VOI
- New Locked Balance: 100,000 VOI

**Claim Bet (No Win)**:
- Lockup Release: 100,000 VOI
- Final Total Balance: 110,000 VOI
- Final Available Balance: 110,000 VOI
- Final Locked Balance: 0 VOI

### Example 2: Multiple Bets Scenario

**Initial State**:
- Total Balance: 1,000,000 VOI
- Available Balance: 1,000,000 VOI
- Locked Balance: 0 VOI

**Place Multiple Bets**:
- Bet 1: 5 VOI → Lockup: 50,000 VOI
- Bet 2: 10 VOI → Lockup: 100,000 VOI
- Bet 3: 20 VOI → Lockup: 200,000 VOI

**After All Bets**:
- Total Balance: 1,035,000 VOI
- Available Balance: 685,000 VOI
- Locked Balance: 350,000 VOI

**Lockup Ratio**: 350,000 / 1,035,000 = 33.8%

## Future Enhancements

### 1. **Dynamic Lockup Multipliers**

- **Risk-Based**: Adjust lockup based on bet risk
- **Time-Based**: Reduce lockup for longer-term bets
- **Volume-Based**: Optimize lockup for high-volume periods

### 2. **Advanced Risk Models**

- **Monte Carlo Simulation**: Dynamic lockup calculation
- **Historical Analysis**: Learn from payout patterns
- **Machine Learning**: Predict optimal lockup amounts

### 3. **Liquidity Pools**

- **Multi-Asset Support**: Lockup in various tokens
- **Yield Generation**: Earn on locked funds
- **Cross-Chain**: Distributed lockup management

## Conclusion

The token lockup and release mechanism provides a robust foundation for the 5reel slot machine system, ensuring:

- **Financial Solvency**: Prevents over-extension
- **Risk Management**: Automatic fund reservation
- **User Protection**: Guaranteed payout capability
- **System Stability**: Graceful handling of edge cases

This mechanism enables the platform to operate safely while maintaining transparency and user confidence in the gaming experience. 