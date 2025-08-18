import { expect } from "chai";
import algosdk from "algosdk";
import crypto from "crypto";
import fs from "fs";
import {
  addressses,
  sks,
  // beacon
  touch,
  // slot machine
  getGrid,
  getReel,
  getReels,
  getReelWindow,
  displayGrid,
  generateSeed,
  getPayline,
  getPaylines,
  matchPayline,
  simulateGridPaylineMatch,
  simulateReelWindow,
  getPayoutMultiplier,
  spin,
  claim,
  getBetGrid,
  // bank manager
  deposit,
  withdraw,
  // common
  fund,
  deploy,
  bootstrap,
  // yield bearing token
  ybtDeposit,
  setYieldBearingSource,
  // ownable
  getOwner,
  transferOwnership,
  ybtWithdraw,
  // arc200
  arc200BalanceOf,
  algodClient,
  getAccountBalance,
  invalidBetKey,
  getBetClaimRound,
  getBlockSeed,
  getStatus,
  paylines,
} from "../command.js";

const sha256 = (data) => {
  return crypto.createHash("sha256").update(data).digest();
};

describe("slotmac: Slot Machine Testing", function () {
  this.timeout(100000);
  let contract;
  let appId;
  let beaconAppId;
  let ybtAppId;
  let acc;

  before(async function () {
    const newAcc = algosdk.generateAccount();
    acc = {
      addr: newAcc.addr,
      sk: newAcc.sk,
    };
    console.log("acc", acc);
    await fund(newAcc.addr, BigInt(1e6) * BigInt(1e6));
  });

  beforeEach(async function () {
    const now = Date.now();
    {
      const { appId: id } = await deploy({
        type: "Beacon",
        name: `Beacon${now}`,
        ...acc,
      });
      beaconAppId = id;
    }
    {
      const { appId: id, appClient } = await deploy({
        type: "SlotMachine",
        name: `SlotMachine${now}`,
        ...acc,
      });
      appId = id;
      contract = appClient;
    }
    {
      const { appId: id } = await deploy({
        type: "YieldBearingToken",
        name: `YieldBearingToken${now}`,
        ...acc,
      });
      ybtAppId = id;
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

  it("Should deploy the contract", async function () {
    expect(appId).to.not.equal(0);
  });

  it("Should deploy the yield bearing token contract", async function () {
    expect(ybtAppId).to.not.equal(0);
  });

  const bootstrapSlot = async () => {
    await bootstrap({
      appId,
      ...acc,
    });
  };

  it("Should deposit", async function () {
    await bootstrapSlot();
    const depositR = await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(depositR).to.be.true;
  });

  it("Should withdraw", async function () {
    await bootstrapSlot();
    const depositR = await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(depositR).to.be.true;
    const withdrawR = await withdraw({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(withdrawR).to.be.true;
  });

  it("Should not withdraw over balance", async function () {
    await bootstrapSlot();
    const depositR = await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(depositR).to.be.true;
    const withdrawR = await withdraw({
      appId,
      amount: 1 * 1e6 + 1,
      ...acc,
    });
    expect(withdrawR).to.be.false;
  });

  it("Should get the reels", async function () {
    const reelsR = await getReels({
      appId: appId,
      ...acc,
    });
    expect(reelsR.success).to.be.true;
    expect(reelsR.returnValue).to.equal(
      "DDD_C___CD_C__C_C__CBDDBC______DD_____D_D_A_DDC_CCDC_D_____BD_DC_C________C__C_C_____B_D_C______C_D__D_D_D___C_____DBC_C_B__D_B_____CAD______D___CDC_CCD__D____CD__C_CCDC___C_C_______C_DBD_D__DC___CD_D_CC_DBD__DC_C___DD_BDD___CA__D___CC_DC__DCD__CCC_C_____DC_B_CD__C________D___DB____C_DC_D____D________DCDBCD_DDD___CC____C__C__CCD_C__C_CBDB__C_DC___C__DD_D________D____CAB____D_C__DDD___C_____C_D________DCDCD_D_BBDDC_____CC__D__D__D_______B_CC___D_CD___BCDC__A_______DCD_C__C__D_____D__D___C_C_CDCC_"
    );
  });

  it("Should get the grid", async function () {
    const gridR = await getGrid({
      appId: appId,
      seed: "WOnoYeqYrHRnB2BJL1rXZ/leX8dby4h6xKQVVgfYBf0=",
      ...acc,
    });
    displayGrid(gridR.returnValue);
    expect(gridR.success).to.be.true;
    expect(gridR.returnValue).to.equal("D_C_DBDD____D__");
  });

  it("Should get the reel", async function () {
    const reelR = await getReel({
      appId: appId,
      reelIndex: 0,
      ...acc,
    });
    expect(reelR.success).to.be.true;
    expect(reelR.returnValue).to.equal(
      "DDD_C___CD_C__C_C__CBDDBC______DD_____D_D_A_DDC_CCDC_D_____BD_DC_C________C__C_C_____B_D_C______C_D_"
    );
  });

  it("Should not get the reel window for invalid reel", async function () {
    const reelWindowR = await getReelWindow({
      appId: appId,
      reel: 100,
      index: 0,
      ...acc,
    });
    expect(reelWindowR.success).to.equal(false);
  });

  it("Should get reel window", async function () {
    const getReelR = await getReel({
      appId: appId,
      reelIndex: 0,
      ...acc,
    });
    const reel = getReelR.returnValue;
    for (let i = 0; i < 200; i++) {
      const reelWindowR = await getReelWindow({
        appId: appId,
        reel: 0,
        index: i,
        ...acc,
      });
      const reelWindow = reelWindowR.returnValue;
      const simulatedReelWindow = simulateReelWindow(reel, i);
      expect(reelWindow).to.equal(simulatedReelWindow);
    }
  });

  it("Should get the payline", async function () {
    // Test paylines 0 through 8
    for (let i = 0; i < 9; i++) {
      const paylineR = await getPayline({
        appId: appId,
        paylineIndex: i,
        ...acc,
      });
      expect(paylineR.success).to.be.true;
      expect(paylineR.returnValue.map(Number)).to.deep.equal(paylines[i]);
    }
  });

  it("Should get the paylines", async function () {
    const paylinesR = await getPaylines({
      appId,
      ...acc,
    });
    expect(paylinesR.success).to.be.true;
    expect(paylinesR.returnValue.map(Number)).to.deep.equal(paylines.flat());
  });

  const maxAttempts = 100;
  it("Should find a seed with 5 matching symbols", async function () {
    let found = false;
    let attempts = 0;
    let matchingSeed;
    let matchingGrid;
    let matchingPaylineIndex;
    let highestMatches = 0;
    let highestMatchGrid;
    let highestMatchAttempt;
    let highestMatchPaylineIndex;
    let highestMatchInitialSymbol;
    let highestMatchPayline;
    while (!found && attempts < maxAttempts) {
      const seed = generateSeed();
      const gridR = await getGrid({
        appId: appId,
        seed: seed,
        ...acc,
      });
      const grid = gridR.returnValue;
      for (let i = 0; i < paylines.length; i++) {
        const { matches, initialSymbol } = simulateGridPaylineMatch(
          grid,
          paylines[i]
        );
        if (matches > highestMatches) {
          highestMatches = matches;
          highestMatchGrid = grid;
          highestMatchAttempt = attempts;
          highestMatchPaylineIndex = i;
          highestMatchInitialSymbol = initialSymbol;
          highestMatchPayline = paylines[i];
        }
        if (matches === 5) {
          found = true;
          matchingSeed = seed;
          matchingGrid = grid;
          matchingPaylineIndex = i;
          break;
        }
      }
      attempts++;
    }
    if (found) {
      console.log("Found matching seed:", matchingSeed);
      console.log("Grid:");
      displayGrid(matchingGrid);
      console.log("Matching payline index:", matchingPaylineIndex);
      console.log("Matching payline:", paylines[matchingPaylineIndex]);
    } else {
      console.log("No matching seed found after", attempts, "attempts");
    }
  });

  it("Should match the payline", async function () {
    const gridR = await getGrid({
      appId: appId,
      seed: "WOnoYeqYrHRnB2BJL1rXZ/leX8dby4h6xKQVVgfYBf0=",
      ...acc,
    });
    const grid = gridR.returnValue;
    for (let i = 0; i < paylines.length; i++) {
      const matchPaylineR = await matchPayline({
        appId: appId,
        grid: Buffer.from(grid),
        paylineIndex: i,
        ...acc,
      });
      expect(matchPaylineR.success).to.be.true;
      const [matchesBN, initialSymbolBN] = matchPaylineR.returnValue;
      const matches = Number(matchesBN);
      const initialSymbol = String.fromCharCode(initialSymbolBN);
      const simulatedMatchPayline = simulateGridPaylineMatch(grid, paylines[i]);
      expect(matches).to.equal(simulatedMatchPayline.matches);
      expect(initialSymbol).to.equal(simulatedMatchPayline.initialSymbol);
    }
  });

  it("Should get payout multiplier", async function () {
    const PAYOUTS = {
      A: { 0: 0, 1: 0, 2: 0, 3: 50, 4: 200, 5: 1000, 6: 0 },
      B: { 0: 0, 1: 0, 2: 0, 3: 20, 4: 100, 5: 500, 6: 0 },
      C: { 0: 0, 1: 0, 2: 0, 3: 10, 4: 50, 5: 200, 6: 0 },
      D: { 0: 0, 1: 0, 2: 0, 3: 5, 4: 20, 5: 100, 6: 0 },
      _: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
    for (const [k, v] of Object.entries(PAYOUTS)) {
      for (const [j, u] of Object.entries(v)) {
        const getPayoutMultiplierR = await getPayoutMultiplier({
          appId: appId,
          symbol: k,
          count: Number(j),
        });
        const pm = getPayoutMultiplierR.returnValue;
        expect(Number(pm)).to.equal(u);
      }
    }
  });

  it("Should spin", async function () {
    await bootstrapSlot();
    await deposit({
      appId,
      amount: 20_000 * 1e6, // need at least 20k to spin
      ...acc,
    });
    for (let i = 0; i < 20; i++) {
      const spinR = await spin({
        appId: appId,
        betAmount: 1e6,
        maxPaylineIndex: i,
        index: 0,
        simulate: true,
        ...acc,
      });
      console.log(spinR);
      expect(spinR).not.equal(invalidBetKey);
    }
  });

  const spinAndClaim = async () => {
    for (let i = 0; i < 20; i++) {
      const balance = await getAccountBalance(acc.addr);
      console.log("balance", balance / 1e6);
      const bankBalance = await getAccountBalance(
        algosdk.getApplicationAddress(appId)
      );
      console.log("bankBalance", bankBalance / 1e6);
      const spinR = await spin({
        appId: appId,
        betAmount: 1e6,
        maxPaylineIndex: i,
        index: new Date().getTime(),
        ...acc,
        debug: true,
      });
      expect(spinR).not.equal(invalidBetKey);
      for (let j = 0; j < i; j++) {
        let claimR;
        do {
          await touch({
            appId: beaconAppId,
            ...acc,
          });
          claimR = await claim({
            appId: appId,
            betKey: spinR,
            ...acc,
          });
          if (claimR.success) break;
        } while (1);
        expect(claimR.success).to.be.true;
        expect(Number(claimR.returnValue)).to.be.gte(0);
      }
    }
  };

  it("Should should spin and claim with positive delta", async function () {
    await bootstrapSlot();
    await deposit({
      appId,
      amount: 200_000 * 1e6,
      ...acc,
    });
    const initialBalance = await getAccountBalance(
      algosdk.getApplicationAddress(appId)
    );
    await spinAndClaim();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const finalBalance = await getAccountBalance(
      algosdk.getApplicationAddress(appId)
    );
    const delta = finalBalance - initialBalance;
    console.log("initialBalance", initialBalance / 1e6);
    console.log("finalBalance", finalBalance / 1e6);
    console.log("delta", delta / 1e6);
    //expect(delta).to.be.gt(0);
  });

  const setupBetGrid = async () => {
    await bootstrapSlot();
    await deposit({
      appId,
      amount: 999 * 1e6,
      ...acc,
    });
    const spinR = await spin({
      appId: appId,
      betAmount: 1e6,
      maxPaylineIndex: 0,
      index: 0,
      debug: true,
      ...acc,
    });
    expect(spinR).not.to.equal(invalidBetKey);
    const claimRound = await getBetClaimRound({
      appId: appId,
      betKey: spinR,
      ...acc,
    });
    console.log("claimRound", claimRound);
    expect(claimRound).to.be.gt(0);
    let betGridR;
    do {
      await touch({
        appId: beaconAppId,
        ...acc,
      });
      betGridR = await getBetGrid({
        appId: appId,
        betKey: spinR,
        ...acc,
      });
      if (betGridR.success) break;
    } while (1);
    expect(betGridR.success).to.be.true;
    const betGrid = betGridR.returnValue;
    expect(betGrid.length).to.equal(15);
    displayGrid(betGrid);
    return [spinR, betGrid, claimRound];
  };

  it("Should get bet grid", async function () {
    const [betKey, betGrid, claimRound] = await setupBetGrid();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const blockSeed = Buffer.from(
      await getBlockSeed(claimRound),
      "base64"
    ).toString("hex");
    const hashed = sha256(Buffer.from(blockSeed + betKey, "hex"));
    const gridR = await getGrid({
      appId: appId,
      seed: hashed,
      ...acc,
    });
    const grid = gridR.returnValue;
    expect(grid).to.equal(betGrid);
  });

  // should claim and delete box on last paylines
  // should claim after 1000 without payout
  // TODO test get_slot

  // --- with ybt ---

  const checkSlotOwner = async (addr) => {
    const owner = await getOwner({
      appId,
      ...acc,
    });
    console.log("owner", owner);
    expect(owner).to.equal(addr);
  };
  const withYBT = async () => {
    await bootstrapSlot();
    await checkSlotOwner(acc.addr);
    await bootstrap({
      appId: ybtAppId,
      ...acc,
      debug: true,
    });
    const transferR = await transferOwnership({
      appId: appId,
      newOwner: algosdk.getApplicationAddress(ybtAppId),
      ...acc,
    });
    expect(transferR).to.be.true;
    await setYieldBearingSource({
      appId: ybtAppId,
      source: appId,
      ...acc,
      debug: true,
    });
    await checkSlotOwner(algosdk.getApplicationAddress(ybtAppId));
  };
  it("Should have owner", async function () {
    await checkSlotOwner(acc.addr);
  });
  it("Should transfer ownership to ybt", async function () {
    await withYBT();
  });
  it("Should not withdraw with ybt", async function () {
    await withYBT();
    const depositR = await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    const withdrawR = await withdraw({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    expect(withdrawR.success).to.be.false;
  });
  it("Should bank with ybt", async function () {
    await withYBT();
    await ybtDeposit({
      appId: ybtAppId,
      amount: 1 * 1e6,
      ...acc,
    });
    const balanceBefore = await arc200BalanceOf({
      appId: ybtAppId,
      address: acc.addr,
      ...acc,
    });
    await ybtWithdraw({
      appId: ybtAppId,
      amount: balanceBefore,
      ...acc,
    });
    const balanceAfter = await arc200BalanceOf({
      appId: ybtAppId,
      address: acc.addr,
      ...acc,
    });
    expect(balanceAfter).to.equal(BigInt(0));
  });
  it("Should bank with ybt", async function () {
    await withYBT();
    const balance = await getAccountBalance(acc.addr);
    await ybtDeposit({
      appId: ybtAppId,
      amount: 1 * 1e6,
      ...acc,
    });
    const balanceBefore = await arc200BalanceOf({
      appId: ybtAppId,
      address: acc.addr,
      ...acc,
    });
    await ybtWithdraw({
      appId: ybtAppId,
      amount: balanceBefore,
      ...acc,
    });
    const balanceAfter = await getAccountBalance(acc.addr);
    const delta = Number(balanceAfter) - Number(balance);
    console.log("delta", delta);
    expect(delta).to.be.equal(-38500);
    expect(balanceAfter).to.be.lt(balance);
  });
  it("Should bank with ybt", async function () {
    await withYBT();
    const accBalance = await getAccountBalance(acc.addr);
    await ybtDeposit({
      appId: ybtAppId,
      amount: 1 * 1e6,
      ...acc,
    });
    const balance = await arc200BalanceOf({
      appId: ybtAppId,
      address: acc.addr,
      ...acc,
    });
    await deposit({
      appId,
      amount: 1 * 1e6,
      ...acc,
    });
    await ybtWithdraw({
      appId: ybtAppId,
      amount: balance,
      ...acc,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const balanceAfter = await getAccountBalance(acc.addr);
    const delta = Number(balanceAfter) - Number(accBalance);
    console.log("accBalance", accBalance);
    console.log("balanceAfter", balanceAfter);
    console.log("delta", delta);
  });

  it("Should spin and claim with payout", async function () {
    await bootstrapSlot();
    await deposit({
      appId,
      amount: 300_000 * 1e6, // need at least 20k to spin
      ...acc,
    });
    for (let i = 0; i < 20; i++) {
      const spinR = await spin({
        appId: appId,
        betAmount: 1e6,
        maxPaylineIndex: i,
        index: 0,
        ...acc,
      });
      let getBetGridR;
      do {
        await touch({
          appId: beaconAppId,
          ...acc,
        });
        getBetGridR = await getBetGrid({
          appId: appId,
          betKey: spinR,
          ...acc,
        });
        if (getBetGridR.success) {
          break;
        }
      } while (1);
      const betGrid = getBetGridR.returnValue;
      console.log("betGrid", betGrid);
      displayGrid(betGrid);
      for (let j = 0; j <= i; j++) {
        const simulatedMatchPayline = simulateGridPaylineMatch(
          betGrid,
          paylines[j]
        );
        console.log({ simulatedMatchPayline });
        const matchPaylineR = await matchPayline({
          appId: appId,
          grid: betGrid,
          paylineIndex: j,
        });
        const [matchesBN, initialSymbolBN] = matchPaylineR.returnValue;
        console.log(
          "matches",
          Number(matchesBN),
          "initialSymbol",
          String.fromCharCode(initialSymbolBN)
        );
        if (matchesBN >= BigInt(3)) {
          do {
            await touch({
              appId: beaconAppId,
              ...acc,
            });
            const claimR = await claim({
              appId: appId,
              betKey: spinR,
              ...acc,
            });
            //if (claimR.success) break;
          } while (1);
          break;
        }
      }
    }
  });
});
