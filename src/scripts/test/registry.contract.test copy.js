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
  participate,
  registerMachine,
  touch,
  deleteMachine,
} from "../command.js";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

describe("registry: Machine Registry Testing", function () {
  this.timeout(60_000);
  let appId;
  let slotMachineAppId;
  let registryAppId;
  let beaconAppId;
  let acc;
  before(async function () {
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
    await fund(acc.addr, 1001e6 * 2);
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
    const { appId: id2 } = await deploy({
      type: "MachineRegistry",
      name: "MachineRegistry",
      ...acc,
      debug: false,
    });
    registryAppId = id2;
    await bootstrap({
      appId: registryAppId,
      ...acc,
    });
    expect(appId).to.greaterThan(0);
    expect(slotMachineAppId).to.greaterThan(0);
    expect(registryAppId).to.greaterThan(0);
  });
  afterEach(async function () {
    await touch({ appId: beaconAppId });
  });

  it("should register a machine", async function () {
    const registerMachineR = await registerMachine({
      appId: registryAppId,
      machineId: slotMachineAppId,
      ...acc,
      debug: true,
    });
    expect(registerMachineR.success).to.be.true;
  });

  it("should delete a machine", async function () {
    await registerMachine({
      appId: registryAppId,
      machineId: slotMachineAppId,
      ...acc,
      debug: true,
    });
    const deleteMachineR = await deleteMachine({
      appId: registryAppId,
      machineId: slotMachineAppId,
      ...acc,
      debug: true,
    });
    expect(deleteMachineR.success).to.be.true;
  });
});
