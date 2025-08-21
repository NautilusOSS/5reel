import { expect } from "chai";
import fs from "fs";
import {
  addressses,
  sks,
  // beacon
  touch,
  // bank managaer
  deposit,
  // common
  deploy,
  bootstrap,
  getAccount,
  fund,
  withdraw,
} from "../command.js";

const acc = {
  sender: addressses.deployer,
  sk: sks.deployer,
};

describe("bankman: Bank Manager Testing", function () {
  this.timeout(100000);
  let acc;
  let appId;
  let beaconAppId;

  before(async function () {
    const acc = await getAccount();
    await fund(acc.addr, 1001e6);
    const { appId: id0 } = await deploy({
      type: "Beacon",
      name: `Beacon`,
      debug: false,
      ...acc,
    });
    beaconAppId = id0;
  });

  beforeEach(async function () {
    acc = await getAccount();
    await fund(acc.addr, 1001e6);
    const { appId: id1 } = await deploy({
      type: "BankManager",
      name: `BankManager`,
      debug: false,
      ...acc,
    });
    appId = id1;
    await bootstrap({
      appId,
      ...acc,
    });
  });

  afterEach(async function () {
    await touch({
      appId: beaconAppId,
      ...acc,
    });
  });

  it("Should deploy the beacon contract", async function () {
    expect(beaconAppId).to.not.equal(0);
  });

  it("Should deploy bank manager contract", async function () {
    expect(appId).to.not.equal(0);
  });

  it("Should deposit", async function () {
    const depositR = await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(depositR.success).to.be.true;
  });

  // Add these critical tests:
  it("Should reject deposits with zero amount", async function () {
    const depositR = await deposit({
      appId,
      amount: 0,
      ...acc,
      debug: true,
    });
    expect(depositR.success).to.be.false;
  });

  it("Should reject withdrawals exceeding available balance", async function () {
    // Test withdrawal > available balance
    await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    const withdrawR = await withdraw({
      appId,
      amount: 1 * 1e6 + 1,
      ...acc,
    });
    expect(withdrawR.success).to.be.false;
  });

  // it("Should reject withdrawals exceeding total balance", async function () {
  //   // Test withdrawal > total balance
  // });

  // it("Should reject withdrawals by non-owner", async function () {
  //   // Test withdrawal by non-owner
  // });

  // it("Should handle multiple deposits correctly", async function () {
  //   // Test multiple deposits and balance tracking
  // });

  // it("Should handle owner deposits correctly", async function () {
  //   // Test owner_deposit method
  // });

  // it("Should maintain correct balance ratios during operations", async function () {
  //   // Test balance consistency
  // });
});
