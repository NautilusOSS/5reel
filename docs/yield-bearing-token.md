# Yield Bearing Token (YBT) Mathematics & Slot Machine Integration

## Overview

The YieldBearingToken (YBT) implements a share-based yield system where users deposit funds and receive shares proportional to the underlying asset value. The token owns and controls a slot machine contract, forwarding all deposits to it and generating yield from gaming profits.

## Core Architecture

```
User → YBT Contract → Slot Machine Contract
  ↓           ↓              ↓
Deposit   Mint Shares    Gaming Operations
  ↓           ↓              ↓
Withdraw  Burn Shares    Profit Generation
```

## Key Relationships

- **YBT Contract**: ARC200 compatible token that mints/burns shares
- **Slot Machine**: Gaming contract owned by YBT that generates profits
- **Yield Source**: The slot machine's bank balance represents the underlying assets
- **Share Price**: Determined by total assets ÷ total shares

## Mathematical Foundation

### Share Calculation Formula

The fundamental relationship between shares and assets is:

```
Shares = (Deposit Amount × Total Shares) ÷ Total Assets
```

Where:
- **Total Assets**: Current balance in the slot machine's bank
- **Total Shares**: Current circulating supply of YBT tokens
- **Deposit Amount**: User's contribution to the pool

### Exchange Rate

The exchange rate between shares and assets is:

```
Exchange Rate = Total Assets ÷ Total Shares
```

## Deposit Mechanics

### Step-by-Step Process

1. **User Payment**: User sends funds + box creation cost
2. **Balance Query**: YBT queries slot machine's current available balance
3. **Fund Forwarding**: YBT forwards deposit to slot machine
4. **Share Minting**: YBT mints shares based on PRIOR balance (before deposit)
5. **State Update**: Updates total supply and user balance

### Deposit Implementation

```python
@arc4.abimethod
def deposit(self) -> arc4.UInt256:
    # Validate inputs
    assert self.yield_bearing_source > 0, "yield bearing source not set"
    
    # Check payment
    payment = require_payment(Txn.sender)
    balance_box_cost = self._deposit_cost()
    assert payment > balance_box_cost, "payment insufficient"
    
    # Calculate actual deposit amount
    deposit_amount = (
        payment if self._balanceOf(Txn.sender) > 0 
        else payment - balance_box_cost
    )
    assert deposit_amount > 0, "deposit amount must be greater than 0"
    
    # 🔑 KEY: Query balance BEFORE forwarding deposit
    total_assets = self._get_yield_bearing_source_balance()
    
    # Forward to yield source (slot machine)
    app = Application(self.yield_bearing_source)
    itxn.Payment(receiver=app.address, amount=deposit_amount).submit()
    
    # Call owner_deposit on slot machine
    arc4.abi_call(
        SlotMachine.owner_deposit,
        arc4.UInt64(deposit_amount),
        app_id=app,
    )
    
    # Mint shares based on PRIOR balance
    return arc4.UInt256(self._mint(BigUInt(deposit_amount), total_assets))
```

### Share Minting Logic

```python
@subroutine
def _mint(self, amount: BigUInt, prior_balance: UInt64) -> BigUInt:
    if self.totalSupply == 0:
        # First deposit: shares = deposit amount
        shares = amount
    else:
        # Subsequent deposits: proportional shares
        shares = (amount * self.totalSupply) // BigUInt(prior_balance)
    
    # Ensure minimum shares to prevent dust
    assert shares > 0, "Deposit amount too small"
    
    # Update state
    self.totalSupply += shares
    self.balances[Txn.sender] = self._balanceOf(Txn.sender) + shares
    
    # Emit transfer event
    arc4.emit(arc200_Transfer(...))
    
    return shares
```

## Withdraw Mechanics

### Step-by-Step Process

1. **Share Burning**: User's shares are burned
2. **Asset Calculation**: Withdrawal amount calculated based on current exchange rate
3. **Slot Machine Withdrawal**: YBT calls slot machine's withdraw function
4. **Payment Transfer**: Assets sent to user
5. **State Update**: Total supply and user balance updated

### Withdraw Implementation

```python
@arc4.abimethod
def withdraw(self, amount: arc4.UInt256) -> arc4.UInt64:
    assert amount.native > 0, "amount must be greater than 0"
    assert self.yield_bearing_source > 0, "yield bearing source not set"
    assert self._balanceOf(Txn.sender) >= amount.native, "insufficient balance"
    
    return arc4.UInt64(self._burn(amount.native))

@subroutine
def _burn(self, withdraw_amount: BigUInt) -> UInt64:
    # Get current slot machine balance
    slot_machine_balance, txn = arc4.abi_call(
        BankManagerInterface.get_balance_available,
        app_id=Application(self.yield_bearing_source),
    )
    big_slot_machine_balance = BigUInt(slot_machine_balance.native)
    
    # Calculate withdrawal amount with increased precision
    amount_to_withdraw = (
        (withdraw_amount * big_slot_machine_balance * SCALING_FACTOR)
        // self.totalSupply
    ) // SCALING_FACTOR
    
    # Verify amount conversion
    small_amount_to_withdraw = arc4.UInt64.from_bytes(
        arc4.UInt256(amount_to_withdraw).bytes[-8:]
    ).native
    
    # Validate withdrawal amount
    assert small_amount_to_withdraw > 0, "amount to withdraw is 0"
    assert (
        small_amount_to_withdraw <= slot_machine_balance.native
    ), "amount to withdraw exceeds available balance"
    
    # Update balances FIRST
    self.balances[Txn.sender] -= withdraw_amount
    self.totalSupply -= withdraw_amount
    
    # External calls AFTER state updates
    app = Application(self.yield_bearing_source)
    arc4.abi_call(
        SlotMachine.withdraw,
        amount_to_withdraw,
        app_id=app,
    )
    itxn.Payment(receiver=Txn.sender, amount=small_amount_to_withdraw).submit()
    
    # Emit transfer event
    arc4.emit(arc200_Transfer(...))
    
    return small_amount_to_withdraw
```

## Mathematical Examples

### Example 1: First Deposit

**Initial State:**
- Total Supply: 0 shares
- Total Assets: 0 VOI
- User deposits: 1000 VOI

**Result:**
- Shares minted: 1000 shares
- New Total Supply: 1000 shares
- New Total Assets: 1000 VOI
- Exchange Rate: 1.0 (1 share = 1 VOI)

### Example 2: Second Deposit (No Yield Yet)

**Current State:**
- Total Supply: 1000 shares
- Total Assets: 1000 VOI
- User deposits: 500 VOI

**Calculation:**
- Shares = (500 × 1000) ÷ 1000 = 500 shares
- New Total Supply: 1500 shares
- New Total Assets: 1500 VOI
- Exchange Rate: 1.0 (1 share = 1 VOI)

### Example 3: Deposit After Yield Generation

**Current State:**
- Total Supply: 1500 shares
- Total Assets: 2000 VOI (500 VOI profit from gaming)
- Exchange Rate: 1.33 (1 share = 1.33 VOI)
- User deposits: 1000 VOI

**Calculation:**
- Shares = (1000 × 1500) ÷ 2000 = 750 shares
- New Total Supply: 2250 shares
- New Total Assets: 3000 VOI
- New Exchange Rate: 1.33 (1 share = 1.33 VOI)

### Example 4: Withdrawal

**Current State:**
- Total Supply: 2250 shares
- Total Assets: 3000 VOI
- Exchange Rate: 1.33 (1 share = 1.33 VOI)
- User withdraws: 500 shares

**Calculation:**
- Assets to withdraw = (500 × 3000) ÷ 2250 = 666.67 VOI
- New Total Supply: 1750 shares
- New Total Assets: 2333.33 VOI
- Exchange Rate: 1.33 (1 share = 1.33 VOI)

## Yield Generation Mechanism

### How Profits Flow

1. **Gaming Operations**: Slot machine generates profits from player losses
2. **Bank Accumulation**: Profits accumulate in slot machine's bank balance
3. **Asset Value Increase**: Higher bank balance increases underlying asset value
4. **Share Price Appreciation**: Higher asset value increases share price
5. **User Benefit**: Users can withdraw more assets than they deposited

### Profit Distribution

- **No Direct Distribution**: Profits are not directly sent to token holders
- **Value Appreciation**: Profits increase the underlying asset value
- **Withdrawal Benefit**: Users benefit when they withdraw their shares
- **HODL Incentive**: Long-term holders benefit from compound growth

## Security Considerations

### Reentrancy Protection

- State updates occur BEFORE external calls
- Balance checks prevent over-withdrawal
- No recursive deposit/withdraw loops possible

### Access Control

- Only owner can set yield bearing source
- Only owner can revoke yield bearing source
- Fuse system prevents unauthorized modifications

### Balance Validation

- Withdrawal amounts validated against available balance
- Minimum share requirements prevent dust attacks
- Scaling factor prevents precision loss

## Gas Optimization

### Box Storage

- User balances stored in boxes for efficient access
- Box creation cost: 28,500 microAlgos per new user
- Existing users don't pay box costs for additional deposits

### OpCode Budget

- Deposit: ~1,000 opcodes
- Withdraw: ~1,400 opcodes
- Uses OpUp for complex operations

## Integration Points

### Slot Machine Ownership

```python
# YBT must be owner of slot machine
@arc4.abimethod
def set_yield_bearing_source(self, app_id: arc4.UInt64) -> None:
    self._only_owner()
    assert self.yield_fuse_active == bool(1), "yield fuse is not active"
    
    app = Application(app_id.native)
    owner, txn = arc4.abi_call(
        OwnableInterface.get_owner,
        app_id=app,
    )
    
    # 🔑 KEY: YBT must own the slot machine
    assert (
        owner.native == Global.current_application_address
    ), "yield bearing source must be owned by this contract"
    
    self.yield_bearing_source = app_id.native
```

### Bank Manager Integration

```python
# YBT calls slot machine's owner_deposit
arc4.abi_call(
    SlotMachine.owner_deposit,
    arc4.UInt64(deposit_amount),
    app_id=app,
)

# YBT calls slot machine's withdraw
arc4.abi_call(
    SlotMachine.withdraw,
    amount_to_withdraw,
    app_id=app,
)
```

## Economic Model

### Yield Sources

1. **House Edge**: Slot machine's built-in advantage over players
2. **Betting Volume**: Higher volume increases profit potential
3. **Operational Efficiency**: Optimized payout structures
4. **Risk Management**: Balanced betting limits and bank requirements

### Yield Distribution

- **Immediate**: No yield is distributed immediately
- **Accumulative**: Profits accumulate in underlying assets
- **Realizable**: Yield realized upon withdrawal
- **Proportional**: Yield proportional to share ownership

### Risk Factors

- **Gaming Volatility**: Profits can fluctuate based on player luck
- **Bank Requirements**: Minimum bank balance must be maintained
- **Liquidity**: Large withdrawals may impact remaining users
- **Regulatory**: Gaming regulations may affect operations

## Monitoring & Analytics

### Key Metrics

- **Total Value Locked (TVL)**: Total assets in slot machine
- **Share Price**: Current exchange rate (assets/shares)
- **Yield Rate**: Historical yield generation rate
- **User Count**: Number of unique token holders

### Performance Indicators

- **Deposit/Withdrawal Volume**: User activity levels
- **Share Price Growth**: Yield accumulation over time
- **Bank Balance Growth**: Slot machine profit generation
- **User Retention**: Long-term holder behavior

## Future Enhancements

### Potential Improvements

1. **Yield Distribution**: Periodic yield distribution to holders
2. **Staking Rewards**: Additional rewards for long-term holders
3. **Governance**: Token holder voting on platform parameters
4. **Multi-Asset Support**: Support for multiple yield sources
5. **Liquidity Pools**: DEX integration for share trading

### Advanced Features

- **Yield Farming**: Incentivized deposit programs
- **Insurance Pools**: Protection against extreme losses
- **Derivative Products**: Options and futures on yield
- **Cross-Chain**: Multi-blockchain yield generation 