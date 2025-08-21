import { expect } from "chai";
import {
  deploy,
  bootstrap,
  fund,
  // arc200
  arc200Name,
  arc200Symbol,
  arc200Decimals,
  // common
  getAccount,
  setYieldBearingSource,
  transferOwnership,
  ybtDeposit,
  arc200BalanceOf,
  arc200TotalSupply,
  getOwner,
  withdraw,
  getAccountBalance,
  ybtWithdraw,
  setName,
  setSymbol,
  ybtRevokeYieldBearingSource,
  spin,
  invalidBetKey,
  ybtGetMaxWithdrawableAmount,
} from "../command.js";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

describe("ybt: Yield Bearing Token Testing", function () {
  this.timeout(60_000);
  let appId;
  let slotMachineAppId;
  let acc;
  before(async function () {});
  beforeEach(async function () {
    // deploy slot machine
    // deploy ybt
    // bootstrap ybt
    // bootstrap slot machine
    // transfer slot machine owner to ybt
    // get slot machine owner
    // set yield bearing source
    // deposite via ybt to slot machine
    acc = await getAccount();
    await fund(acc.addr, 1001e6 * 2);
    // deploy slot machine
    const { appId: id0 } = await deploy({
      type: "YieldBearingToken",
      name: "YieldBearingToken",
      ...acc,
      debug: false,
    });
    appId = id0;
    // deploy slot machine
    const { appId: id1 } = await deploy({
      type: "SlotMachine",
      name: "SlotMachine",
      ...acc,
      debug: false,
    });
    slotMachineAppId = id1;
    // bootstrap ybt
    await bootstrap({
      appId,
      ...acc,
    });
    await setName({
      appId,
      name: "YieldBearingToken",
      ...acc,
    });
    const name = await arc200Name({
      appId,
    });
    console.log("name", name);
    await setSymbol({
      appId,
      symbol: "YBT",
      ...acc,
    });
    const symbol = await arc200Symbol({
      appId,
    });
    console.log("symbol", symbol);
    // bootstrap slot machine
    await bootstrap({
      appId: slotMachineAppId,
      ...acc,
    });
    // transfer slot machine owner to ybt
    await transferOwnership({
      appId: slotMachineAppId,
      newOwner: algosdk.getApplicationAddress(appId),
      ...acc,
    });
    // set yield bearing source
    await setYieldBearingSource({
      appId,
      source: slotMachineAppId,
      ...acc,
    });
    expect(appId).to.greaterThan(0);
    expect(slotMachineAppId).to.greaterThan(0);
  });
  afterEach(async function () {});
  // Basic Functionality:
  // Bootstrap Functionality:
  //     Should not bootstrap if not owner
  //     Should bootstrap if owner
  //     Should not bootstrap if already bootstrapped
  //     Should get correct bootstrap cost
  // Yield Source Management:
  //     Should not set yield source if not owner
  //     Should set yield source correctly
  //     Should revoke yield source ownership
  //     Should not set yield source after fuse burned
  // Deposit Functionality:
  //     Should deposit correctly
  it("Should deposit", async function () {
    const depositAmount = 1e6;
    const depositR = await ybtDeposit({
      appId,
      amount: depositAmount,
      ...acc,
    });
    expect(depositR.success).to.be.true;
  });
  it("Should not deposit if insufficient balance", async function () {
    const depositAmount = 1_000_000_000e6;
    const depositR = await ybtDeposit({
      appId,
      amount: depositAmount,
      ...acc,
    });
    expect(depositR.success).to.be.false;
  });
  it("Should deposit be forwarded to slot machine", async function () {
    const balanceBefore = await getAccountBalance(
      algosdk.getApplicationAddress(slotMachineAppId)
    );
    const depositAmount = 1000e6;
    await ybtDeposit({
      appId,
      amount: depositAmount,
      ...acc,
      debug: true,
    });
    const balanceAfter = await getAccountBalance(
      algosdk.getApplicationAddress(slotMachineAppId)
    );
    expect(balanceAfter).to.equal(balanceBefore + depositAmount);
  });
  it("Should deposit and receive shares", async function () {
    const depositAmount = 1000e6;
    const depositR = await ybtDeposit({
      appId,
      amount: depositAmount,
      ...acc,
    });
    const balance = await arc200BalanceOf({
      appId,
      address: acc.addr,
    });
    const totalSupply = await arc200TotalSupply({
      appId,
    });
    console.log({
      balance,
      totalSupply,
    });
    expect(balance).to.equal(BigInt(depositAmount));
    expect(balance).to.equal(totalSupply);
    expect(depositR.success).to.be.true;
  });
  it("Should deposit 2 accounts and receive equal amount of shares", async function () {
    const acc2 = await getAccount();
    const depositAmount = 1000e6;
    await fund(acc2.addr, depositAmount);
    const acc3 = await getAccount();
    await fund(acc3.addr, depositAmount);
    await ybtDeposit({
      appId,
      amount: 100e6,
      ...acc2,
      debug: true,
    });
    await ybtDeposit({
      appId,
      amount: 100e6,
      ...acc3,
      debug: true,
    });
    const balance1 = await arc200BalanceOf({
      appId, // ybt
      address: acc2.addr,
    });
    const balance2 = await arc200BalanceOf({
      appId, // ybt
      address: acc3.addr,
    });
    const totalSupply = await arc200TotalSupply({
      appId,
    });
    console.log({
      balance1,
      balance2,
      totalSupply,
    });
    expect(balance1).to.equal(balance2);
    expect(balance1 + balance2).to.equal(totalSupply);
  });
  it("Should deposit 3 accounts and receive proportional shares", async function () {
    const acc1 = await getAccount();
    await fund(acc1.addr, 10001e6);
    const acc2 = await getAccount();
    await fund(acc2.addr, 15001e6);
    const acc3 = await getAccount();
    await fund(acc3.addr, 17301e6);
    await ybtDeposit({
      appId,
      amount: 10e6,
      ...acc1,
    });
    await ybtDeposit({
      appId,
      amount: 20e6,
      ...acc2,
    });
    await ybtDeposit({
      appId,
      amount: 70e6,
      ...acc3,
    });
    const balance1 = await arc200BalanceOf({
      appId,
      address: acc1.addr,
    });
    const balance2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const balance3 = await arc200BalanceOf({
      appId,
      address: acc3.addr,
    });
    const totalSupply = await arc200TotalSupply({
      appId,
    });
    const pct1 = new BigNumber(balance1).div(totalSupply).toNumber();
    const pct2 = new BigNumber(balance2).div(totalSupply).toNumber();
    const pct3 = new BigNumber(balance3).div(totalSupply).toNumber();
    console.log({
      pct1,
      pct2,
      pct3,
      balance1,
      balance2,
      balance3,
      totalSupply,
    });
    expect(pct1).to.equal(0.1);
    expect(pct2).to.equal(0.2);
    expect(pct3).to.equal(0.7);
    expect(balance1).to.equal(10000000n);
    expect(balance2).to.equal(20000000n);
    expect(balance3).to.equal(70000000n);
    expect(totalSupply).to.equal(100000000n);
  });
  //     Should not deposit if yield source not set
  //     Should calculate correct shares on first deposit
  //     Should calculate proportional shares on subsequent deposits
  //     Should handle minimum deposit requirements
  //     Should track total supply correctly
  //     Should emit correct Transfer events on deposit
  // Withdrawal Functionality:
  //     Should withdraw correct amount
  //     Should not allow withdrawal exceeding balance
  //     Should calculate withdrawal amounts proportionally
  //     Should handle minimum withdrawal requirements
  //     Should update total supply correctly
  //     Should emit correct Transfer events on withdrawal
  // Fuse Management:
  //     Should burn yield fuse
  //     Should burn stakeable fuse
  //     Should burn upgradeable fuse
  //     Should not allow fuse operations if not owner
  //     Should not allow multiple fuse burns
  // ARC200 Token Functionality:
  //     Should have correct name
  it("Should have correct name", async function () {
    const name2 = await arc200Name({
      appId,
    });
    console.log("name2", name2);
    expect(name2).to.not.equal("");
  });
  //     Should have correct symbol
  it("Should have correct symbol", async function () {
    const symbol2 = await arc200Symbol({
      appId,
    });
    expect(symbol2).to.not.equal("");
  });
  //     Should have correct decimals
  it("Should have correct decimals", async function () {
    const decimals2 = await arc200Decimals({
      appId,
    });
    expect(decimals2).to.not.equal(BigInt(0));
  });
  it("Should set symbol empty", async function () {
    const setSymbolR = await setSymbol({
      appId,
      symbol: "",
      ...acc,
    });
    const symbol2 = await arc200Symbol({
      appId,
    });
    console.log("symbol2", symbol2);
    expect(symbol2).to.equal("");
    expect(setSymbolR.success).to.be.true;
  });
  it("Should set symbol short", async function () {
    const setSymbolR = await setSymbol({
      appId,
      symbol: "Y",
      ...acc,
    });
    const symbol2 = await arc200Symbol({
      appId,
    });
    console.log("symbol2", symbol2);
    expect(symbol2).to.equal("Y");
    expect(setSymbolR.success).to.be.true;
  });
  it("Should set symbol long", async function () {
    const expected = Array(8).fill("Y").join("");
    const setSymbolR = await setSymbol({
      appId,
      symbol: expected,
      ...acc,
      debug: true,
    });
    const symbol2 = await arc200Symbol({
      appId,
    });
    console.log("symbol2", symbol2);
    expect(symbol2).to.equal(expected);
    expect(setSymbolR.success).to.be.true;
  });
  it("Should not set symbol too long", async function () {
    // Expect this to throw an error since symbol is too long
    try {
      const expected = Array(9).fill("Y").join("");
      const setSymbolR = await setSymbol({
        appId,
        symbol: expected,
        ...acc,
      });
      // If we get here, the call succeeded when it should have failed
      assert.fail("Expected error caught");
    } catch (error) {
      // This is expected - the call should fail
      console.log("Expected error caught:", error.message);
      expect(error.message).to.equal(
        "Value array does not match static array length. Expected 8, got 9"
      );
    }
  });
  it("Should set name", async function () {
    const expected = "1234567890";
    const setNameR = await setName({
      appId,
      name: expected,
      ...acc,
    });
    const name2 = await arc200Name({
      appId,
    });
    console.log("name2", name2);
    expect(name2).to.equal(expected);
    expect(setNameR.success).to.be.true;
  });
  it("Should set name empty", async function () {
    const setNameR = await setName({
      appId,
      name: "",
      ...acc,
    });
    const name2 = await arc200Name({
      appId,
    });
    console.log("name2", name2);
    expect(name2).to.equal("");
    expect(setNameR.success).to.be.true;
  });
  it("Should set name short", async function () {
    const expected = "1";
    const setNameR = await setName({
      appId,
      name: expected,
      ...acc,
    });
    const name2 = await arc200Name({
      appId,
    });
    console.log("name2", name2);
    expect(name2).to.equal(expected);
    expect(setNameR.success).to.be.true;
  });
  it("Should set name long", async function () {
    const expected = Array(32).fill("1").join("");
    const setNameR = await setName({
      appId,
      name: expected,
      ...acc,
    });
    const name2 = await arc200Name({
      appId,
    });
    console.log("name2", name2);
    expect(name2).to.equal(expected);
    expect(setNameR.success).to.be.true;
  });
  it("Should not set name too long", async function () {
    try {
      const expected = Array(33).fill("1").join("");
      const setNameR = await setName({
        appId,
        name: expected,
        ...acc,
      });
      // If we get here, the call succeeded when it should have failed
      assert.fail("Expected error caught");
    } catch (error) {
      console.log("Expected error caught:", error.message);
      expect(error.message).to.equal(
        "Value array does not match static array length. Expected 32, got 33"
      );
    }
  });
  //     Should track balances correctly
  //     Should handle transfers correctly
  //     Should handle allowances correctly
  // Stakeable Features:
  //     Should handle delegation correctly
  //     Should not allow staking after fuse burned
  //     Should track staking rewards correctly
  // Upgradeable Features:
  //     Should handle upgrades correctly
  //     Should not allow upgrades after fuse burned
  //     Should maintain state during upgrades
  // Error Cases:
  //     Should handle zero amount deposits/withdrawals
  //     Should handle insufficient payment amounts
  //     Should handle invalid yield source configurations
  //     Should handle contract state edge cases
  // ---
  it("Should revoke yield bearing source", async function () {
    const revokeYieldBearingSourceR = await ybtRevokeYieldBearingSource({
      appId,
      newOwner: acc.addr,
      ...acc,
    });
    const owner = await getOwner({
      appId,
    });
    console.log("owner", owner);
    expect(owner).to.equal(acc.addr);
    expect(revokeYieldBearingSourceR.success).to.be.true;
  });
  // withdraw and depsitsw with active bets
  it("Should deposit with active bets", async function () {
    // acc2 funds bankroll
    // acc3 spins
    // acc4 deposits
    const acc2 = await getAccount();
    await fund(acc2.addr, 2_000_000e6);
    const acc3 = await getAccount();
    await fund(acc3.addr, 1_000_000e6);
    const acc4 = await getAccount();
    await fund(acc4.addr, 1_000_000e6);
    const depositR = await ybtDeposit({
      appId,
      amount: 2_000_000e6 - 1e6,
      ...acc2,
      debug: true,
    });
    const depositR2Sim = await ybtDeposit({
      appId,
      amount: 100_000e6,
      ...acc4,
      simulate: true,
    });
    const betKey = await spin({
      appId: slotMachineAppId,
      betAmount: 5e6,
      maxPaylineIndex: 19,
      index: 0,
      ...acc3,
      debug: true,
    });
    const depositR2 = await ybtDeposit({
      appId,
      amount: 100_000e6,
      ...acc4,
      debug: true,
    });
    const balance2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const balance4 = await arc200BalanceOf({
      appId,
      address: acc4.addr,
    });
    const totalSupply = await arc200TotalSupply({
      appId,
    });
    const expectedTotalSupply = balance2 + balance4;
    const pct2 = new BigNumber(balance2).div(totalSupply).toNumber();
    const pct4 = new BigNumber(balance4).div(totalSupply).toNumber();
    console.log("depositR", depositR.returnValue);
    console.log("depositR2", depositR2.returnValue);
    console.log("depositR2Sim", depositR2Sim.returnValue);
    console.log("balance2", balance2);
    console.log("balance4", balance4);
    console.log("totalSupply", totalSupply);
    console.log("expectedTotalSupply", expectedTotalSupply);
    console.log("betKey", betKey);
    console.log("pct2", pct2);
    console.log("pct4", pct4);
    expect(depositR.success).to.be.true;
    expect(depositR2.success).to.be.true;
    expect(Number(depositR2.returnValue)).to.lessThan(
      Number(depositR2Sim.returnValue)
    );
    expect(betKey).to.not.equal(invalidBetKey);
    expect(balance2 + balance4).to.equal(totalSupply);
    expect(Math.round(pct2 * 100)).to.equal(95);
    expect(Math.round(pct4 * 100)).to.equal(5);
  });
  it("Should withdraw", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 100e6);
    const depositR = await ybtDeposit({
      appId,
      amount: 100e6 - 1e6,
      ...acc2,
      debug: true,
    });
    const balanceBefore = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const withdrawAmount = balanceBefore;
    const withdrawR = await ybtWithdraw({
      appId,
      amount: withdrawAmount,
      ...acc2,
      debug: true,
    });
    const expectedBalanceAfter = balanceBefore - BigInt(withdrawAmount);
    const balanceAfter = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    console.log("withdrawR", withdrawR.returnValue);
    console.log("balanceBefore", balanceBefore);
    console.log("balanceAfter", balanceAfter);
    expect(withdrawR.success).to.be.true;
    expect(depositR.success).to.be.true;
    expect(balanceAfter).to.equal(expectedBalanceAfter);
  });

  it("Should withdraw with active bets", async function () {
    // can withdraw full balance with limit on amount relative to available
    // and locked ratio
    const acc2 = await getAccount();
    await fund(acc2.addr, 1_000_000e6 * 2);
    const depositR = await ybtDeposit({
      appId,
      amount: 1_000_000e6 - 1e6,
      ...acc2,
    });
    const betKey = await spin({
      appId: slotMachineAppId,
      betAmount: 100e6, // lock up min(2M, 200k) (10%)
      maxPaylineIndex: 19,
      index: 0,
      ...acc2,
    });
    const balanceBefore = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const withdrawAmount = BigInt(
      BigNumber(balanceBefore).multipliedBy(0.8).toFixed(0)
    );
    const withdrawR0 = await ybtWithdraw({
      appId,
      amount: BigInt(BigNumber(balanceBefore).multipliedBy(1).toFixed(0)),
      ...acc2,
    });
    const withdrawR1 = await ybtWithdraw({
      appId,
      amount: BigInt(BigNumber(balanceBefore).multipliedBy(0.81).toFixed(0)),
      ...acc2,
    });
    const maxWithdrawableAmountBefore = await ybtGetMaxWithdrawableAmount({
      appId,
      address: acc2.addr,
    });
    const withdrawAmount2 = BigInt(
      BigNumber(balanceBefore).multipliedBy(0.8).toFixed(0)
    );
    const withdrawR2 = await ybtWithdraw({
      appId,
      amount: BigInt(BigNumber(balanceBefore).multipliedBy(0.8).toFixed(0)),
      ...acc2,
      debug: true,
    });
    const expectedBalanceAfter = balanceBefore - withdrawAmount2;
    const balanceAfter = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const maxWithdrawableAmountAfter = await ybtGetMaxWithdrawableAmount({
      appId,
      address: acc2.addr,
      debug: true,
    });
    const withdrawR3 = await ybtWithdraw({
      appId,
      amount: maxWithdrawableAmountAfter,
      ...acc2,
      debug: true,
    });
    const maxWithdrawableAmountAfter2 = await ybtGetMaxWithdrawableAmount({
      appId,
      address: acc2.addr,
      debug: true,
    });
    console.log("betKey", betKey);
    console.log("withdrawR2", withdrawR2.returnValue);
    console.log("balanceBefore", balanceBefore);
    console.log("balanceAfter", balanceAfter);
    console.log("maxWithdrawableAmountBefore", maxWithdrawableAmountBefore);
    console.log("maxWithdrawableAmountAfter", maxWithdrawableAmountAfter);
    console.log("maxWithdrawableAmountAfter2", maxWithdrawableAmountAfter2);
    expect(withdrawR0.success).to.be.false;
    expect(withdrawR1.success).to.be.false;
    expect(withdrawR2.success).to.be.true;
    expect(withdrawR3.success).to.be.true;
    expect(depositR.success).to.be.true;
    expect(balanceAfter).to.equal(expectedBalanceAfter);
    expect(maxWithdrawableAmountAfter2).to.equal(BigInt(0));
  });

  // lockup cap
  it("Should cap lockup", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 1_000_000e6 * 2);
    const depositR = await ybtDeposit({
      appId,
      amount: 1_000_000e6 - 1e6,
      ...acc2,
    });
    await spin({
      appId: slotMachineAppId,
      betAmount: 100e6, // would lockup 4M but cap is 200k
      maxPaylineIndex: 19,
      index: 0,
      ...acc2,
    });
    const balance = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const maxWithdrawableAmount = await ybtGetMaxWithdrawableAmount({
      appId,
      address: acc2.addr,
    });
    const pctWithdrawable = BigInt(
      new BigNumber(maxWithdrawableAmount)
        .div(balance)
        .multipliedBy(100)
        .toFixed(0)
    );
    console.log("balance", balance);
    console.log("maxWithdrawableAmount", maxWithdrawableAmount);
    console.log("pctWithdrawable", pctWithdrawable);
    expect(pctWithdrawable).to.equal(BigInt(80)); // 80% of the balance is withdrawable
  });
});
