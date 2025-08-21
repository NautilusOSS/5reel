import { expect } from "chai";
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
} from "../command.js";

const acc = {
  sender: addressses.deployer,
  sk: sks.deployer,
};

describe("spinman: Spin Manager Testing", function () {
  this.timeout(100000);
  let contract;
  let appId;
  let beaconAppId;
  let beaconContract;

  before(async function () {});

  beforeEach(async function () {
    const now = Date.now();
    {
      const { appId: id, appClient } = await deploy({
        type: "Beacon",
        name: `Beacon${now}`,
        debug: false,
      });
      beaconAppId = id;
      beaconContract = appClient;
    }
    {
      const { appId: id, appClient } = await deploy({
        type: "SpinManager",
        name: `SpinManager${now}`,
        debug: false,
      });
      appId = id;
      contract = appClient;
      await bootstrap({
        appId,
        ...acc,
      });
    }
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

  it("Should deploy spin manager contract", async function () {
    expect(appId).to.not.equal(0);
  });

  it("Should get spin params", async function () {});
});
