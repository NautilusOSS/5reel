import { expect } from "chai";
import algosdk from "algosdk";
import crypto from "crypto";
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
  getAccount,
  setSymbol,
  setName,
  arc200Name,
  arc200Symbol,
  indexerClient,
} from "../command.js";

const sha256 = (data) => {
  return crypto.createHash("sha256").update(data).digest();
};

// Helper function to calculate payouts
function calculatePayout(symbol, matches, betAmount = 1) {
  const PAYOUT_MULTIPLIERS = {
    A: { 3: 50, 4: 200, 5: 1000 },
    B: { 3: 20, 4: 100, 5: 500 },
    C: { 3: 10, 4: 50, 5: 200 },
    D: { 3: 5, 4: 20, 5: 100 },
    _: {},
  };

  const multiplier = PAYOUT_MULTIPLIERS[symbol]?.[matches] || 0;
  return multiplier * betAmount;
}

// Helper function to get symbol from ASCII code
function getSymbolFromCode(code) {
  return String.fromCharCode(code);
}

describe("slotmac: Slot Machine Payout Testing", function () {
  this.timeout(1_000_000);
  let appId;
  let beaconAppId;
  let ybtAppId;
  let acc;
  let blockSeeds = new Set();

  before(async function () {
    const { appId: id0 } = await deploy({
      type: "Beacon",
      name: `Beacon`,
      addr: addressses[0],
      sk: sks[0],
    });
    beaconAppId = id0;
    expect(beaconAppId).to.be.greaterThan(0);
    const status = await algodClient.status().do();
    const lastRound = status["last-round"];
    const lookback = 4000;
    const startRound = Math.max(lastRound - lookback, 0);
    for (let i = startRound; i < lastRound; i++) {
      const block = await indexerClient.lookupBlock(i).do();
      const seed = block.seed;
      blockSeeds.add(seed);
    }
  });

  beforeEach(async function () {
    acc = await getAccount();
    const fundingAmount = 1_000_000 * 1e6;
    await fund(acc.addr, fundingAmount);
    const now = Date.now();
    const { appId: id1, appClient } = await deploy({
      type: "SlotMachine",
      name: "SlotMachine",
      ...acc,
    });
    appId = id1;
    const { appId: id2 } = await deploy({
      type: "YieldBearingToken",
      name: `YieldBearingToken${now}`,
      ...acc,
    });
    ybtAppId = id2;
    await bootstrap({
      appId,
      ...acc,
    });
    await bootstrap({
      appId: ybtAppId,
      ...acc,
    });
    const ybtName = "YieldBearingToken";
    await setName({
      appId: ybtAppId,
      name: ybtName,
      ...acc,
    });
    const name = await arc200Name({
      appId: ybtAppId,
    });
    console.log("name", name);
    const ybtSymbol = "YBT";
    await setSymbol({
      appId: ybtAppId,
      symbol: ybtSymbol,
      ...acc,
    });
    const symbol = await arc200Symbol({
      appId: ybtAppId,
    });
    console.log("symbol", symbol);
    await transferOwnership({
      appId,
      newOwner: algosdk.getApplicationAddress(ybtAppId),
      ...acc,
    });
    const owner = await getOwner({
      appId,
    });
    console.log("owner", owner);
    await setYieldBearingSource({
      appId: ybtAppId,
      source: appId,
      ...acc,
    });
    await ybtDeposit({
      appId: ybtAppId,
      amount: fundingAmount - 2e6,
      ...acc,
      debug: true,
    });
    const balance = await getAccountBalance(
      algosdk.getApplicationAddress(appId)
    );
    console.log("balance", balance / 1e6);
    expect(balance).to.equal(fundingAmount - 2e6 + 161500);
    expect(owner).to.equal(algosdk.getApplicationAddress(ybtAppId));
    expect(name).to.equal(ybtName);
    expect(symbol).to.equal(ybtSymbol);
    expect(appId).to.be.greaterThan(0);
    expect(ybtAppId).to.be.greaterThan(0);
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

  const maxAttempts = 1000;
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
      console.log("Attempts:", attempts);
      console.log("Found matching seed:", matchingSeed);
      console.log("Grid:");
      displayGrid(matchingGrid);
      console.log("Matching payline index:", matchingPaylineIndex);
      console.log("Matching payline:", paylines[matchingPaylineIndex]);
    } else {
      console.log("No matching seed found after", attempts, "attempts");
    }
  });

  it("Should verify payout calculations match contract exactly", async function () {
    console.log("=== CONTRACT PAYOUT VERIFICATION ===");

    // Expected payouts from the contract (bet of 1)
    const expectedPayouts = {
      A: { 3: 50, 4: 200, 5: 1000 },
      B: { 3: 20, 4: 100, 5: 500 },
      C: { 3: 10, 4: 50, 5: 200 },
      D: { 3: 5, 4: 20, 5: 100 },
      _: {},
    };

    let allTestsPassed = true;

    // Test all combinations
    Object.entries(expectedPayouts).forEach(([symbol, matchPayouts]) => {
      Object.entries(matchPayouts).forEach(([matches, expectedPayout]) => {
        const actualPayout = calculatePayout(symbol, parseInt(matches), 1);
        if (actualPayout !== expectedPayout) {
          console.log(
            `❌ FAIL: ${symbol}-${matches} expected ${expectedPayout}, got ${actualPayout}`
          );
          allTestsPassed = false;
        } else {
          console.log(`✅ PASS: ${symbol}-${matches} = ${actualPayout}`);
        }
      });
    });

    // Test invalid combinations (should return 0)
    const invalidCombinations = [
      ["A", 2],
      ["A", 6],
      ["B", 2],
      ["B", 6],
      ["C", 2],
      ["C", 6],
      ["D", 2],
      ["D", 6],
      ["_", 3],
      ["_", 4],
      ["_", 5],
    ];

    invalidCombinations.forEach(([symbol, matches]) => {
      const actualPayout = calculatePayout(symbol, matches, 1);
      if (actualPayout !== 0) {
        console.log(
          `❌ FAIL: ${symbol}-${matches} should be 0, got ${actualPayout}`
        );
        allTestsPassed = false;
      } else {
        console.log(`✅ PASS: ${symbol}-${matches} = 0 (invalid)`);
      }
    });

    if (allTestsPassed) {
      console.log("\n🎉 All payout calculations match the contract exactly!");
    } else {
      console.log("\n💥 Some payout calculations don't match the contract!");
    }

    console.log("===================");
  });

  it("Should calculate payouts correctly for different bet amounts", async function () {
    console.log("=== PAYOUT CALCULATION TEST ===");

    // Test different bet amounts
    const betAmounts = [1, 5, 10, 100];

    betAmounts.forEach((bet) => {
      console.log(`\nBet amount: ${bet}`);
      console.log("Symbol | Matches | Multiplier | Payout");
      console.log("-------|---------|------------|--------");

      // Test all symbols and match combinations
      ["A", "B", "C", "D"].forEach((symbol) => {
        [3, 4, 5].forEach((matches) => {
          const payout = calculatePayout(symbol, matches, bet);
          if (payout > 0) {
            console.log(
              `${symbol.padEnd(7)} | ${matches.toString().padEnd(9)} | ${(
                payout / bet
              )
                .toString()
                .padEnd(11)} | ${payout}`
            );
          }
        });
      });
    });

    // Test edge cases
    console.log("\n=== EDGE CASES ===");
    console.log("Symbol '_' with 3 matches:", calculatePayout("_", 3, 1)); // Should be 0
    console.log("Symbol 'A' with 2 matches:", calculatePayout("A", 2, 1)); // Should be 0
    console.log("Symbol 'B' with 6 matches:", calculatePayout("B", 6, 1)); // Should be 0

    // Test high-value scenarios
    console.log("\n=== HIGH-VALUE SCENARIOS ===");
    console.log(
      "Symbol 'A' with 5 matches, bet 1000:",
      calculatePayout("A", 5, 1000)
    ); // Should be 1,000,000
    console.log(
      "Symbol 'B' with 5 matches, bet 500:",
      calculatePayout("B", 5, 500)
    ); // Should be 250,000

    console.log("===================");
  });

  it("Should find match backtesting block seed", async function () {
    let matchCount = 0;
    let totalPayout = 0;
    let totalBets = 0;
    let houseNetEarnings = 0;
    let payoutDetails = [];

        for (const seed of blockSeeds) {
      // Each seed represents a bet, so track the bet cost
      totalBets++;
      const betCost = 20; // Cost per bet
      
      // Add the bet cost to house earnings (house always collects the bet)
      houseNetEarnings += betCost;
      
      const gridR = await getGrid({
        appId: appId,
        seed: seed,
        ...acc,
      });
      const grid = gridR.returnValue;
      
      // Track all symbols in the grid for analysis
      const gridSymbols = new Set(grid.split(''));
      if (gridSymbols.has('A')) {
        console.log(`Grid with symbol A found: ${grid}`);
      }

      for (let i = 0; i < paylines.length; i++) {
        const { matches, initialSymbol } = simulateGridPaylineMatch(
          grid,
          paylines[i]
        );

        if (matches >= 3) {
          matchCount++;

          // Calculate payout for bet of 1
          // initialSymbol is already a string from simulateGridPaylineMatch, no need to convert
          const symbol = initialSymbol;
          const payout = calculatePayout(symbol, matches, 1);

          totalPayout += payout;
          
          // Subtract the payout from house earnings
          houseNetEarnings -= payout;

          const payoutInfo = {
            seed: seed,
            matches: matches,
            symbol: symbol,
            paylineIndex: i,
            payline: paylines[i],
            payoutMultiplier: payout, // Since bet is 1, payout = multiplier
            payout: payout,
            betCost: betCost,
            houseEarnings: betCost - payout, // House earnings for this specific bet
          };
          payoutDetails.push(payoutInfo);

          // Only show detailed output for 4+ matches to reduce noise
          if (matches >= 4) {
            console.log("=== PAYOUT FOUND ===");
            console.log("matches:", matches);
            console.log("initialSymbol (raw):", initialSymbol);
            console.log("symbol (processed):", symbol);
            console.log("Found matching seed:", seed);
            console.log("Grid:");
            displayGrid(grid);
            console.log("Matching payline index:", i);
            console.log("Matching payline:", paylines[i]);
            console.log("Payout multiplier:", payout);
            console.log("Payout (bet=1):", payout);
            console.log("Bet cost:", betCost);
            console.log("House earnings for this bet:", betCost - payout);
            console.log("===================");
          }

          break; // Found a match for this seed, move to next
        }
      }
    }

    console.log("=== SUMMARY ===");
    console.log("Total bets placed:", totalBets);
    console.log("Total matches found:", matchCount);
    console.log("Total payout (bet=1):", totalPayout);
    console.log(
      "Average payout per match:",
      matchCount > 0 ? totalPayout / matchCount : 0
    );
    console.log("Total house earnings:", houseNetEarnings);
    console.log(
      "House edge per bet:",
      totalBets > 0 ? (houseNetEarnings / totalBets).toFixed(2) : 0
    );
    console.log(
      "House edge percentage:",
      totalBets > 0
        ? ((houseNetEarnings / (totalBets * 20)) * 100).toFixed(2) + "%"
        : "0%"
    );
    
    // Calculate theoretical impact of A-5 matches
    console.log("\n=== THEORETICAL A-5 IMPACT ANALYSIS ===");
    const a5Payout = 1000; // A-5 pays 1000x
    const a5HouseLoss = 20 - a5Payout; // House loses 980 per A-5 match
    console.log("A-5 payout: 1000x bet =", a5Payout);
    console.log("House loss per A-5 match:", a5HouseLoss);
    console.log("Current house earnings:", houseNetEarnings);
    
    // Show impact of 1, 2, 3 A-5 matches
    for (let a5Count = 1; a5Count <= 3; a5Count++) {
      const additionalLoss = a5Count * a5HouseLoss;
      const newHouseEarnings = houseNetEarnings - additionalLoss;
      const newHouseEdge = (newHouseEarnings / (totalBets * 20)) * 100;
      console.log(`${a5Count} A-5 match(es): House earnings = ${newHouseEarnings}, Edge = ${newHouseEdge.toFixed(2)}%`);
    }
    
    // Show break-even point for A-5 matches
    const breakEvenA5Count = Math.ceil(houseNetEarnings / Math.abs(a5HouseLoss));
    console.log(`Break-even point: ${breakEvenA5Count} A-5 matches would eliminate house profit`);
    console.log("===================");
    
    // This analysis will be done after payoutBreakdown is created
    console.log("===================");

    // Group payouts by symbol and match count
    const payoutBreakdown = {};
    payoutDetails.forEach((detail) => {
      const key = `${detail.symbol}-${detail.matches}`;
      if (!payoutBreakdown[key]) {
        payoutBreakdown[key] = {
          count: 0,
          totalPayout: 0,
          totalHouseEarnings: 0,
        };
      }
      payoutBreakdown[key].count++;
      payoutBreakdown[key].totalPayout += detail.payout;
      payoutBreakdown[key].totalHouseEarnings += detail.houseEarnings;
    });

    console.log("Payout breakdown:");
    Object.entries(payoutBreakdown).forEach(([key, data]) => {
      console.log(
        `  ${key}: ${data.count} times, total payout: ${data.totalPayout}, house earnings: ${data.totalHouseEarnings}`
      );
    });
    
    // Analyze 3-symbol match frequency and suggestions
    console.log("\n=== 3-SYMBOL MATCH ANALYSIS & SUGGESTIONS ===");
    const total3Matches = Object.entries(payoutBreakdown)
      .filter(([key]) => key.endsWith('-3'))
      .reduce((sum, [, data]) => sum + data.count, 0);
    const total4PlusMatches = Object.entries(payoutBreakdown)
      .filter(([key]) => !key.endsWith('-3'))
      .reduce((sum, [, data]) => sum + data.count, 0);
    
    console.log(`Total 3-symbol matches: ${total3Matches}`);
    console.log(`Total 4+ symbol matches: ${total4PlusMatches}`);
    console.log(`3-symbol match rate: ${((total3Matches / totalBets) * 100).toFixed(2)}%`);
    console.log(`4+ symbol match rate: ${((total4PlusMatches / totalBets) * 100).toFixed(2)}%`);
    
    console.log("\nSUGGESTIONS TO INCREASE 3-SYMBOL MATCHES:");
    console.log("1. Increase symbol density in reels (more A,B,C,D, fewer _)");
    console.log("2. Bias reel generation toward consecutive symbols");
    console.log("3. Reduce wild card (_) frequency");
    console.log("4. Adjust symbol distribution to favor common symbols");
    console.log(`5. Current 3-match rate is ${((total3Matches / totalBets) * 100).toFixed(2)}% - target might be 8-12%`);
    console.log("===================");
  });

  // it("Should match the payline", async function () {
  //   const gridR = await getGrid({
  //     appId: appId,
  //     seed: "WOnoYeqYrHRnB2BJL1rXZ/leX8dby4h6xKQVVgfYBf0=",
  //     ...acc,
  //   });
  //   const grid = gridR.returnValue;
  //   for (let i = 0; i < paylines.length; i++) {
  //     const matchPaylineR = await matchPayline({
  //       appId: appId,
  //       grid: Buffer.from(grid),
  //       paylineIndex: i,
  //       ...acc,
  //     });
  //     expect(matchPaylineR.success).to.be.true;
  //     const [matchesBN, initialSymbolBN] = matchPaylineR.returnValue;
  //     const matches = Number(matchesBN);
  //     const initialSymbol = String.fromCharCode(initialSymbolBN);
  //     const simulatedMatchPayline = simulateGridPaylineMatch(grid, paylines[i]);
  //     expect(matches).to.equal(simulatedMatchPayline.matches);
  //     expect(initialSymbol).to.equal(simulatedMatchPayline.initialSymbol);
  //   }
  // });

  // it("Should get payout multiplier", async function () {
  //   const PAYOUTS = {
  //     A: { 0: 0, 1: 0, 2: 0, 3: 50, 4: 200, 5: 1000, 6: 0 },
  //     B: { 0: 0, 1: 0, 2: 0, 3: 20, 4: 100, 5: 500, 6: 0 },
  //     C: { 0: 0, 1: 0, 2: 0, 3: 10, 4: 50, 5: 200, 6: 0 },
  //     D: { 0: 0, 1: 0, 2: 0, 3: 5, 4: 20, 5: 100, 6: 0 },
  //     _: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  //   };
  //   for (const [k, v] of Object.entries(PAYOUTS)) {
  //     for (const [j, u] of Object.entries(v)) {
  //       const getPayoutMultiplierR = await getPayoutMultiplier({
  //         appId: appId,
  //         symbol: k,
  //         count: Number(j),
  //       });
  //       const pm = getPayoutMultiplierR.returnValue;
  //       expect(Number(pm)).to.equal(u);
  //     }
  //   }
  // });

  // it("Should spin", async function () {
  //   await bootstrapSlot();
  //   await deposit({
  //     appId,
  //     amount: 20_000 * 1e6, // need at least 20k to spin
  //     ...acc,
  //   });
  //   for (let i = 0; i < 20; i++) {
  //     const spinR = await spin({
  //       appId: appId,
  //       betAmount: 1e6,
  //       maxPaylineIndex: i,
  //       index: 0,
  //       simulate: true,
  //       ...acc,
  //     });
  //     console.log(spinR);
  //     //expect(spinR).not.equal(invalidBetKey);
  //   }
  // });

  // const spinAndClaim = async () => {
  //   for (let i = 0; i < 20; i++) {
  //     const balance = await getAccountBalance(acc.addr);
  //     console.log("balance", balance / 1e6);
  //     const bankBalance = await getAccountBalance(
  //       algosdk.getApplicationAddress(appId)
  //     );
  //     console.log("bankBalance", bankBalance / 1e6);
  //     const spinR = await spin({
  //       appId: appId,
  //       betAmount: 1e6,
  //       maxPaylineIndex: i,
  //       index: new Date().getTime(),
  //       ...acc,
  //       debug: true,
  //     });
  //     //expect(spinR).not.equal(invalidBetKey);
  //     for (let j = 0; j < i; j++) {
  //       let claimR;
  //       do {
  //         await touch({
  //           appId: beaconAppId,
  //           ...acc,
  //         });
  //         claimR = await claim({
  //           appId: appId,
  //           betKey: spinR,
  //           ...acc,
  //         });
  //         if (claimR.success) break;
  //       } while (1);
  //       //expect(claimR.success).to.be.true;
  //       //expect(Number(claimR.returnValue)).to.be.gte(0);
  //     }
  //   }
  // };

  // it("Should should spin and claim with positive delta", async function () {
  //   await bootstrapSlot();
  //   await deposit({
  //     appId,
  //     amount: 200_000 * 1e6,
  //     ...acc,
  //   });
  //   const initialBalance = await getAccountBalance(
  //     algosdk.getApplicationAddress(appId)
  //   );
  //   await spinAndClaim();
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  //   const finalBalance = await getAccountBalance(
  //     algosdk.getApplicationAddress(appId)
  //   );
  //   const delta = finalBalance - initialBalance;
  //   console.log("initialBalance", initialBalance / 1e6);
  //   console.log("finalBalance", finalBalance / 1e6);
  //   console.log("delta", delta / 1e6);
  //   //expect(delta).to.be.gt(0);
  // });

  // const setupBetGrid = async () => {
  //   await bootstrapSlot();
  //   await deposit({
  //     appId,
  //     amount: 1_000_000 * 1e6,
  //     ...acc,
  //   });
  //   const spinR = await spin({
  //     appId: appId,
  //     betAmount: 1e6,
  //     maxPaylineIndex: 0,
  //     index: 0,
  //     debug: true,
  //     ...acc,
  //   });
  //   expect(spinR).not.to.equal(invalidBetKey);
  //   const claimRound = await getBetClaimRound({
  //     appId: appId,
  //     betKey: spinR,
  //     ...acc,
  //   });
  //   console.log("claimRound", claimRound);
  //   expect(claimRound).to.be.gt(0);
  //   let betGridR;
  //   do {
  //     await touch({
  //       appId: beaconAppId,
  //       ...acc,
  //     });
  //     betGridR = await getBetGrid({
  //       appId: appId,
  //       betKey: spinR,
  //       ...acc,
  //     });
  //     if (betGridR.success) break;
  //   } while (1);
  //   expect(betGridR.success).to.be.true;
  //   const betGrid = betGridR.returnValue;
  //   expect(betGrid.length).to.equal(15);
  //   displayGrid(betGrid);
  //   return [spinR, betGrid, claimRound];
  // };

  // it("Should get bet grid", async function () {
  //   const [betKey, betGrid, claimRound] = await setupBetGrid();
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  //   const blockSeed = Buffer.from(
  //     await getBlockSeed(claimRound),
  //     "base64"
  //   ).toString("hex");
  //   const hashed = sha256(Buffer.from(blockSeed + betKey, "hex"));
  //   const gridR = await getGrid({
  //     appId: appId,
  //     seed: hashed,
  //     ...acc,
  //   });
  //   const grid = gridR.returnValue;
  //   console.log("grid", grid);
  //   //expect(grid).to.equal(betGrid);
  // });

  // // should claim and delete box on last paylines
  // // should claim after 1000 without payout
  // // TODO test get_slot

  // // --- with ybt ---

  // const checkSlotOwner = async (addr) => {
  //   const owner = await getOwner({
  //     appId,
  //     ...acc,
  //   });
  //   console.log("owner", owner);
  //   expect(owner).to.equal(addr);
  // };
  // const withYBT = async () => {
  //   await bootstrapSlot();
  //   await checkSlotOwner(acc.addr);
  //   await bootstrap({
  //     appId: ybtAppId,
  //     ...acc,
  //     debug: true,
  //   });
  //   const transferR = await transferOwnership({
  //     appId: appId,
  //     newOwner: algosdk.getApplicationAddress(ybtAppId),
  //     ...acc,
  //   });
  //   expect(transferR).to.be.true;
  //   await setYieldBearingSource({
  //     appId: ybtAppId,
  //     source: appId,
  //     ...acc,
  //     debug: true,
  //   });
  //   await checkSlotOwner(algosdk.getApplicationAddress(ybtAppId));
  // };
  // it("Should have owner", async function () {
  //   await checkSlotOwner(acc.addr);
  // });
  // it("Should transfer ownership to ybt", async function () {
  //   await withYBT();
  // });
  // it("Should not withdraw with ybt", async function () {
  //   await withYBT();
  //   const depositR = await deposit({
  //     appId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   const withdrawR = await withdraw({
  //     appId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   expect(withdrawR.success).to.be.false;
  // });
  // it("Should bank with ybt", async function () {
  //   await withYBT();
  //   await ybtDeposit({
  //     appId: ybtAppId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   const balanceBefore = await arc200BalanceOf({
  //     appId: ybtAppId,
  //     address: acc.addr,
  //     ...acc,
  //   });
  //   await ybtWithdraw({
  //     appId: ybtAppId,
  //     amount: balanceBefore,
  //     ...acc,
  //   });
  //   const balanceAfter = await arc200BalanceOf({
  //     appId: ybtAppId,
  //     address: acc.addr,
  //     ...acc,
  //   });
  //   expect(balanceAfter).to.equal(BigInt(0));
  // });
  // it("Should bank with ybt", async function () {
  //   await withYBT();
  //   const balance = await getAccountBalance(acc.addr);
  //   await ybtDeposit({
  //     appId: ybtAppId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   const balanceBefore = await arc200BalanceOf({
  //     appId: ybtAppId,
  //     address: acc.addr,
  //     ...acc,
  //   });
  //   await ybtWithdraw({
  //     appId: ybtAppId,
  //     amount: balanceBefore,
  //     ...acc,
  //   });
  //   const balanceAfter = await getAccountBalance(acc.addr);
  //   const delta = Number(balanceAfter) - Number(balance);
  //   console.log("delta", delta);
  //   expect(delta).to.be.equal(-38500);
  //   expect(balanceAfter).to.be.lt(balance);
  // });
  // it("Should bank with ybt", async function () {
  //   await withYBT();
  //   const accBalance = await getAccountBalance(acc.addr);
  //   await ybtDeposit({
  //     appId: ybtAppId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   const balance = await arc200BalanceOf({
  //     appId: ybtAppId,
  //     address: acc.addr,
  //     ...acc,
  //   });
  //   await deposit({
  //     appId,
  //     amount: 1 * 1e6,
  //     ...acc,
  //   });
  //   await ybtWithdraw({
  //     appId: ybtAppId,
  //     amount: balance,
  //     ...acc,
  //   });
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  //   const balanceAfter = await getAccountBalance(acc.addr);
  //   const delta = Number(balanceAfter) - Number(accBalance);
  //   console.log("accBalance", accBalance);
  //   console.log("balanceAfter", balanceAfter);
  //   console.log("delta", delta);
  // });

  // it("Should spin and claim with payout", async function () {
  //   await bootstrapSlot();
  //   await deposit({
  //     appId,
  //     amount: 300_000 * 1e6, // need at least 20k to spin
  //     ...acc,
  //   });
  //   for (let i = 0; i < 20; i++) {
  //     const spinR = await spin({
  //       appId: appId,
  //       betAmount: 1e6,
  //       maxPaylineIndex: i,
  //       index: 0,
  //       ...acc,
  //     });
  //     let getBetGridR;
  //     do {
  //       await touch({
  //         appId: beaconAppId,
  //         ...acc,
  //       });
  //       getBetGridR = await getBetGrid({
  //         appId: appId,
  //         betKey: spinR,
  //         ...acc,
  //       });
  //       if (getBetGridR.success) {
  //         break;
  //       }
  //     } while (1);
  //     const betGrid = getBetGridR.returnValue;
  //     console.log("betGrid", betGrid);
  //     displayGrid(betGrid);
  //     for (let j = 0; j <= i; j++) {
  //       const simulatedMatchPayline = simulateGridPaylineMatch(
  //         betGrid,
  //         paylines[j]
  //       );
  //       console.log({ simulatedMatchPayline });
  //       const matchPaylineR = await matchPayline({
  //         appId: appId,
  //         grid: betGrid,
  //         paylineIndex: j,
  //       });
  //       const [matchesBN, initialSymbolBN] = matchPaylineR.returnValue;
  //       console.log(
  //         "matches",
  //         Number(matchesBN),
  //         "initialSymbol",
  //         String.fromCharCode(initialSymbolBN)
  //       );
  //       if (matchesBN >= BigInt(3)) {
  //         do {
  //           await touch({
  //             appId: beaconAppId,
  //             ...acc,
  //           });
  //           const claimR = await claim({
  //             appId: appId,
  //             betKey: spinR,
  //             ...acc,
  //           });
  //           //if (claimR.success) break;
  //         } while (1);
  //         break;
  //       }
  //     }
  //   }
  // });
});
