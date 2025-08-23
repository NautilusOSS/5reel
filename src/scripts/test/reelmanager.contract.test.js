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
  getReel,
  getReels,
  getSlot,
  getReelWindow,
} from "../command.js";

const acc = {
  sender: addressses.deployer,
  sk: sks.deployer,
};

const reels = [
  "_CCC__BD___D_____D_____D__DBDDCC_D_C_D__AD_D_CB_C_A_B___B_______DD___D_C_A_____B__C__D______D_______",
  "C_A_____C__DC_____B__B_CD_B___CD__DAD__C__C______CDD_______C_DA________DDD____CDDD___DB____BD__B____",
  "___D_D_B_________CD__D__C_C____B__A___CDB__BC_D__D__CD_C_________D___A_DC__B______B_DDDDD_____C_CDA_",
  "C___C_CDDDDC__D__CCB____D_B__B______D______BD_____A____D_D__AD__D__B___B__C____A____C_D_D___C__CDD__",
  "_________________CC___DC___DDB_BDADDC______B____C__D___D__CA_______CD__D_D_C_______BD_C_DBA_BDD__CD_",
];

describe("reelman: Bank Manager Testing", function () {
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
      type: "ReelManager",
      name: `ReelManager`,
      debug: !false,
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

  it("Should be true", async function () {
    expect(true).to.be.true;
  });

  // ---------------------------------------------

  // Reel data integrity tests
  // test reel count is 5
  // test reel length is 100
  // test all reels have correct length
  // test reels data is 500 bytes total

  // Symbol distribution tests
  // test symbol A exists and count frequency
  // test symbol B exists and count frequency
  // test symbol C exists and count frequency
  // test symbol D exists and count frequency
  // test blank symbol _ exists and count frequency
  // verify symbol distribution matches expected ratios

  // Reel window tests
  // test normal reel window (no wrap)
  // test reel window wrapping around end
  // test reel window at edge positions (98, 99)
  // test window always returns 3 bytes

  // Grid generation tests
  // test same seed always generates same grid
  // test different seeds generate different grids
  // test grid is always 15 bytes
  // test grid symbols come from correct reel positions

  // Reel position distribution tests
  // test reel positions are randomly distributed
  // test no bias toward certain reel positions
  // test all valid positions (0-96) are reachable

  // Symbol frequency in grids test
  // test symbol frequencies in generated grids
  // test high-value symbols don't dominate
  // test blank symbols appear reasonably often

  // Payline hit rate tests
  // test payline hit rates for each payline
  // test symbol-specific hit rates
  // test winning combination frequencies (3, 4, 5 of a kind)

  // Edge case tests
  // test invalid reel indices fail
  // test invalid slot indices fail
  // test empty seeds handle gracefully
  // test boundary conditions work correctly

  // ---------------------------------------------

  it("Should get reel", async function () {
    for (const i of [0, 1, 2, 3, 4]) {
      const reel = await getReel({
        appId,
        reelIndex: i,
        ...acc,
      });
      console.log(reel);
      expect(reel).to.equal(reels[i]);
    }
  });

  // Should not get reels out of bounds

  it("Should get reels", async function () {
    const theReels = await getReels({
      appId,
      ...acc,
    });
    console.log(reels);
    expect(theReels).to.equal(reels.join(""));
  });

  it("Should get slot", async function () {
    for (const i of [0, 1, 2, 3, 4]) {
      for (const j of Array(100).keys()) {
        const slot = await getSlot({
          appId,
          reel: i,
          index: j,
          ...acc,
        });
        expect(slot).to.equal(reels[i][j]);
      }
    }
  });

  it("Should not get slot out of bounds", async function () {
    const slot = await getSlot({
      appId,
      reel: 5,
      index: 0,
      ...acc,
    });
    const slot2 = await getSlot({
      appId,
      reel: 0,
      index: 100,
      ...acc,
    });
    expect(slot).to.equal("");
    expect(slot2).to.equal("");
  });

  it("Should get reel window", async function () {
    for (const i of [0, 1, 2, 3, 4]) {
      for (const j of Array(100).keys()) {
        const window = await getReelWindow({
          appId,
          reel: i,
          index: j,
          ...acc,
        });
        console.log(window);
        expect(window).to.equal(
          reels[i][(j + 0) % 100].slice(0, 3) +
            reels[i][(j + 1) % 100].slice(0, 3) +
            reels[i][(j + 2) % 100].slice(0, 3)
        );
      }
    }
  });
});
