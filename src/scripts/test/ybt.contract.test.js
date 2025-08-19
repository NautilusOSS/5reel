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
    await fund(acc.addr, 1001e6);
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
  it("Should deposit correctly", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 10001e6);
    const acc3 = await getAccount();
    await fund(acc3.addr, 101e6);
    const depositR = await ybtDeposit({
      appId,
      amount: 100e6,
      ...acc,
    });
    const shares1 = depositR.returnValue;
    const balanceAfter = await arc200BalanceOf({
      appId,
      address: acc.addr,
    });
    const balanceNormal = new BigNumber(balanceAfter).div(10 ** 6).toNumber();
    const depositR2 = await ybtDeposit({
      appId,
      amount: 10_000e6,
      ...acc2,
    });
    const shares2 = depositR2.returnValue;
    const balanceAfter2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const balanceNormal2 = new BigNumber(balanceAfter2).div(10 ** 6).toNumber();
    const depositR3 = await ybtDeposit({
      appId,
      amount: 100e6,
      ...acc3,
    });
    const shares3 = depositR3.returnValue;
    const balanceAfter3_1 = await arc200BalanceOf({
      appId,
      address: acc.addr,
    });
    const balanceNormal3_1 = new BigNumber(balanceAfter3_1)
      .div(10 ** 6)
      .toNumber();
    const balanceAfter3_2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const balanceNormal3_2 = new BigNumber(balanceAfter3_2)
      .div(10 ** 6)
      .toNumber();
    const balanceAfter3_3 = await arc200BalanceOf({
      appId,
      address: acc3.addr,
    });
    const balanceNormal3_3 = new BigNumber(balanceAfter3_3)
      .div(10 ** 6)
      .toNumber();
    const totalSupply3 = await arc200TotalSupply({
      appId,
    });
    const withdrawR1 = await ybtWithdraw({
      appId,
      amount: balanceAfter3_1,
      ...acc,
    });
    const withdrawR2 = await ybtWithdraw({
      appId,
      amount: balanceAfter3_2,
      ...acc2,
    });
    const withdrawR3 = await ybtWithdraw({
      appId,
      amount: balanceAfter3_3,
      ...acc3,
    });
    const accBal1Diff = (await getAccountBalance(acc.addr)) / 1e6;
    const accBal2Diff = (await getAccountBalance(acc2.addr)) / 1e6;
    const accBal3Diff = (await getAccountBalance(acc3.addr)) / 1e6;
    const balance4_1 = await arc200BalanceOf({
      appId,
      address: acc.addr,
    });
    const balanceNormal4 = new BigNumber(balance4_1).div(10 ** 6).toNumber();
    const balance4_2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const balanceNormal4_2 = new BigNumber(balance4_2).div(10 ** 6).toNumber();
    const balance4_3 = await arc200BalanceOf({
      appId,
      address: acc3.addr,
    });
    const balanceNormal4_3 = new BigNumber(balance4_3).div(10 ** 6).toNumber();
    const totalSupply4 = Number(
      await arc200TotalSupply({
        appId,
      })
    );
    console.log({
      shares1,
      balanceAfter,
      balanceNormal,
      shares2,
      balanceAfter2,
      balanceNormal2,
      shares3,
      balanceAfter3_1,
      balanceNormal3_1,
      balanceAfter3_2,
      balanceNormal3_2,
      balanceAfter3_3,
      balanceNormal3_3,
      totalSupply3,
      accBal1Diff,
      accBal2Diff,
      accBal3Diff,
      balance4_1,
      balanceNormal4,
      balance4_2,
      balanceNormal4_2,
      balance4_3,
      balanceNormal4_3,
      totalSupply4,
    });
    expect(shares1).to.equal(100000000n);
    expect(balanceAfter).to.equal(100000000n);
    expect(balanceNormal).to.equal(100);
    expect(shares2).to.equal(10000000000n);
    expect(balanceAfter2).to.equal(10000000000n);
    expect(balanceNormal2).to.equal(10000);
    expect(shares3).to.equal(100000000n);
    expect(balanceNormal4).to.equal(0);
    expect(balanceNormal4_2).to.equal(0);
    expect(balanceNormal4_3).to.equal(0);
    expect(totalSupply4).to.equal(0);
    expect(withdrawR1.success).to.be.true;
    expect(withdrawR2.success).to.be.true;
    expect(withdrawR3.success).to.be.true;
  });
  // new test
  //   acc1 deposits 10
  //   acc2 deposits 150
  //   acc3 deposits 173
  it("Should deposit correctly", async function () {
    const acc1 = await getAccount();
    await fund(acc1.addr, 10001e6);
    const acc2 = await getAccount();
    await fund(acc2.addr, 15001e6);
    await ybtDeposit({
      appId,
      amount: 10e6,
      ...acc2,
    });
    await ybtWithdraw({
      appId,
      amount: 1e6,
      ...acc2,
    });
    await ybtDeposit({
      appId,
      amount: 10e6,
      ...acc1,
    });
    await ybtDeposit({
      appId,
      amount: 150e6,
      ...acc2,
    });
    const depositR1 = await ybtDeposit({
      appId,
      amount: 173e6,
      ...acc1,
    });
    const balance1 = await arc200BalanceOf({
      appId,
      address: acc1.addr,
    });
    const balance2 = await arc200BalanceOf({
      appId,
      address: acc2.addr,
    });
    const totalSupply = await arc200TotalSupply({
      appId,
    });
    const pct1 = new BigNumber(balance1).div(totalSupply).toNumber();
    const pct2 = new BigNumber(balance2).div(totalSupply).toNumber();
    console.log({
      pct1,
      pct2,
      balance1,
      balance2,
      totalSupply,
    });
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
});
