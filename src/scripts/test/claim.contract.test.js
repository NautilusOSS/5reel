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
  ybtGetDepositCost,
  deposit,
  claim,
  touch,
  algodClient,
} from "../command.js";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

describe("bet-claim: Bet Claim Testing", function () {
  this.timeout(60_000);
  let appId;
  let acc;
  let slotMachineAppId;
  let beaconAppId;
  let betKey;
  before(async function () {
    const acc = await getAccount();
    await fund(acc.addr, 10e6);
    const { appId: id0 } = await deploy({
      type: "Beacon",
      name: "Beacon",
      ...acc,
      debug: false,
    });
    beaconAppId = id0;
  });
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
    await fund(acc.addr, 1_000_000e6 * 2);
    // deploy slot machine
    const { appId: id0 } = await deploy({
      type: "YieldBearingToken",
      name: "YieldBearingToken",
      ...acc,
      debug: false,
    });
    appId = id0;
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
    // deploy slot machine
    const { appId: id1 } = await deploy({
      type: "SlotMachine",
      name: "SlotMachine",
      ...acc,
      debug: false,
    });
    slotMachineAppId = id1;
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
    await ybtDeposit({
      appId,
      amount: 1_000_000e6,
      ...acc,
    });
    betKey = await spin({
      appId: slotMachineAppId,
      betAmount: 5e6,
      maxPaylineIndex: 19,
      index: 0,
      ...acc,
    });
    console.log("ybtAppId", appId);
    console.log("slotMachineAppId", slotMachineAppId);
    console.log("betKey", betKey);
    expect(betKey).to.not.equal(
      "'0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'"
    );
    expect(appId).to.greaterThan(0);
    expect(slotMachineAppId).to.greaterThan(0);
  });

  afterEach(async function () {
    await touch({
      appId: beaconAppId,
      ...acc,
    });
  });
  // Claim Tests

  it("Should claim bet", async function () {
    let claimR;
    do {
      await touch({
        appId: beaconAppId,
        ...acc,
      });
      claimR = await claim({
        appId: slotMachineAppId,
        betKey,
        ...acc,
      });
    } while (!claimR.success);
    expect(claimR.success).to.be.true;
  });

  it("Should claim bet as anybody", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 1e6);
    let claimR;
    do {
      await touch({
        appId: beaconAppId,
        ...acc,
      });
      claimR = await claim({
        appId: slotMachineAppId,
        betKey,
        ...acc2,
        debug: true,
      });
    } while (!claimR.success);
    expect(claimR.success).to.be.true;
  });

  it("Should not claim bet with invalid bet key", async function () {
    const claimR = await claim({
      appId: slotMachineAppId,
      betKey: invalidBetKey,
      ...acc,
    });
    expect(claimR.success).to.be.false;
    expect(claimR.error).match(
      /logic eval error: assert failed pc=[0-9]+. Details: app=[0-9]+, pc=[0-9]+, opcodes=box_len; bury 1; assert/
    );
  });

  it("Should claim expired bet", async function () {
    const status = await algodClient.status().do();
    const initialRound = status["last-round"];
    console.log("waiting for 1000 rounds");
    let elapsedRounds = 0;
    do {
      process.stdout.write(".");
      const status = await algodClient.status().do();
      elapsedRounds = status["last-round"] - initialRound;
      await touch({
        appId: beaconAppId,
        ...acc,
      });
    } while (elapsedRounds < 1000);
    const claimR = await claim({
      appId: slotMachineAppId,
      betKey,
      ...acc,
    });
    console.log("");
    expect(claimR.success).to.be.true;
  });

  // 1. Double claim attempt - Test that a bet cannot be claimed twice
  // 1. Claim after bet deletion - Test claiming when the bet data has been removed
  // 1. Claim with insufficient balance - Test claiming when the account doesn't have enough ALGO for transaction fees
  // 1. Claim before spin completion - Test claiming before the spin has fully processed
  // 1. Claim with maximum bet amount - Test claiming the largest possible bet
  // 1. Claim with minimum bet amount - Test claiming the smallest possible bet
  // 1. Concurrent claims - Test multiple accounts trying to claim the same bet simultaneously
  // 1. Claim at exact expiration - Test claiming exactly when the bet expires
  // 1. Claim with different account types - Test claiming with rekeyed accounts, multisig accounts, etc.
});
