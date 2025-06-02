import { expect } from "chai";
import {
  deploy,
  addressses,
  sks,
  bootstrap,
  getOwner,
  fund,
  // arc200
  arc200Name,
  arc200Symbol,
  arc200Decimals,
  // common
  bootstrapCost,
} from "../command.js";
import algosdk from "algosdk";

describe("ybt: Yield Bearing Token Testing", function () {
  this.timeout(60_000);
  let deployOptions = {
    type: "YieldBearingToken",
    name: "TestYieldBearingToken",
  };
  let contract;
  let appId;
  before(async function () {});
  beforeEach(async function () {
    const now = Date.now();
    const { appId: id, appClient } = await deploy({
      ...deployOptions,
      name: `${deployOptions.name}-${now}`,
    });
    appId = id;
    contract = appClient;
    const owner = await getOwner({
      appId,
    });
    expect(owner).to.equal(addressses.deployer);
  });
  afterEach(async function () {});
  // Basic Functionality:
  it("Should deploy token", async function () {
    console.log("appId", appId);
    expect(appId).to.not.equal(0);
  });
  it("Should not bootstrap if not owner", async function () {
    const acc = algosdk.generateAccount();
    await fund(acc.addr, 1e6); // fund account to avoid false positiveq
    const bootstrapR = await bootstrap({
      appId,
      sender: acc.addr,
      sk: acc.sk,
    });
    expect(bootstrapR).to.be.false;
  });
  it("Should bootstrap", async function () {
    const bootstrapSuccess = await bootstrap({
      appId,
    });
    expect(bootstrapSuccess).to.be.true;
  });
  it("Should not bootstrap if already bootstrapped", async function () {
    await bootstrap({
      appId,
    });
    const bootstrapSuccess = await bootstrap({
      appId,
    });
    expect(bootstrapSuccess).to.be.false;
  });
  it("Should get correct bootstrap cost", async function () {
    const bootstrapCostR = await bootstrapCost({
      appId,
    });
    console.log(bootstrapCostR);
  });
  // Yield Source Management:
  //     Should not set yield source if not owner
  //     Should set yield source correctly
  //     Should revoke yield source ownership
  //     Should not set yield source after fuse burned
  // Deposit Functionality:
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
    const name1 = await arc200Name({
      appId,
    });
    await bootstrap({ appId });
    const name2 = await arc200Name({
      appId,
    });
    expect(name1).to.equal("");
    expect(name2).to.equal("Submarine Gaming Token");
  });
  //     Should have correct symbol
  it("Should have correct symbol", async function () {
    const symbol1 = await arc200Symbol({
      appId,
    });
    await bootstrap({ appId });
    const symbol2 = await arc200Symbol({
      appId,
    });
    expect(symbol1).to.equal("");
    expect(symbol2).to.equal("GAME");
  });
  //     Should have correct decimals
  it("Should have correct decimals", async function () {
    const decimals1 = await arc200Decimals({
      appId,
    });
    await bootstrap({ appId });
    const decimals2 = await arc200Decimals({
      appId,
    });
    expect(decimals1).to.equal(BigInt(0));
    expect(decimals2).to.equal(BigInt(9));
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
});
