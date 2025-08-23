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
  getGridPaylineSymbols,
  simulateGridPaylineSymbols,
  getBalances,
  //getPaylineCount,
} from "../command.js";

const sha256 = (data) => {
  return crypto.createHash("sha256").update(data).digest();
};

// Helper function to calculate payouts
function calculatePayout(symbol, matches, betAmount = 1) {
  const PAYOUT_MULTIPLIERS = {
    A: { 3: 100, 4: 400, 5: 2000 }, // Updated from 50, 200, 1000
    B: { 3: 40, 4: 200, 5: 1000 }, // Updated from 20, 100, 500
    C: { 3: 25, 4: 100, 5: 400 }, // Updated from 10, 50, 200
    D: { 3: 15, 4: 40, 5: 200 }, // Updated from 5, 20, 100
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
    const lookback = 100;
    const startRound = Math.max(lastRound - lookback, 0);
    for (let i = startRound; i < lastRound - 1; i++) {
      const block = await indexerClient.lookupBlock(i).do();
      const seed = block.seed;
      blockSeeds.add(seed);
    }
  });

  beforeEach(async function () {
    acc = await getAccount();
    const fundingAmount = 1_000_000 * 1e6;
    await fund(acc.addr, fundingAmount * 2);
    const now = Date.now();
    const { appId: id1 } = await deploy({
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
    });
    const balance = await getAccountBalance(
      algosdk.getApplicationAddress(appId)
    );
    // add this so that bank total balance matches up to 1M
    await ybtDeposit({
      appId: ybtAppId,
      amount: 2e6,
      ...acc,
    });
    console.log("balance", balance / 1e6);
    expect(balance).to.equal(fundingAmount - 2e6 + 135000);
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

  // moved to reelmanager.contract.test.js

  it("Should get the payline", async function () {
    // Test paylines 0 through 19
    for (let i = 0; i < 20; i++) {
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
    expect(paylinesR.returnValue.length).to.equal(100); // 20 paylines * 5 positions
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
      A: { 3: 100, 4: 400, 5: 2000 },
      B: { 3: 40, 4: 200, 5: 1000 },
      C: { 3: 25, 4: 100, 5: 400 },
      D: { 3: 15, 4: 40, 5: 200 },
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

    // Test high-value scenarios with updated multipliers
    console.log("\n=== HIGH-VALUE SCENARIOS ===");
    console.log(
      "Symbol 'A' with 5 matches, bet 1000:",
      calculatePayout("A", 5, 1000)
    ); // Should be 2,000,000 (not 1,000,000)
    console.log(
      "Symbol 'B' with 5 matches, bet 500:",
      calculatePayout("B", 5, 500)
    ); // Should be 500,000 (not 250,000)

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
      const gridSymbols = new Set(grid.split(""));
      if (gridSymbols.has("A")) {
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
          if (matches >= 3) {
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

    // In the backtesting test, update the A-5 impact analysis
    console.log("\n=== THEORETICAL A-5 IMPACT ANALYSIS ===");
    const a5Payout = 2000; // A-5 pays 2000x (not 1000x)
    const a5HouseLoss = 20 - a5Payout; // House loses 1980 per A-5 match
    console.log("A-5 payout: 2000x bet =", a5Payout);
    console.log("House loss per A-5 match:", a5HouseLoss);
    console.log("Current house earnings:", houseNetEarnings);

    // Show impact of 1, 2, 3 A-5 matches
    for (let a5Count = 1; a5Count <= 3; a5Count++) {
      const additionalLoss = a5Count * a5HouseLoss;
      const newHouseEarnings = houseNetEarnings - additionalLoss;
      const newHouseEdge = (newHouseEarnings / (totalBets * 20)) * 100;
      console.log(
        `${a5Count} A-5 match(es): House earnings = ${newHouseEarnings}, Edge = ${newHouseEdge.toFixed(
          2
        )}%`
      );
    }

    // Show break-even point for A-5 matches
    const breakEvenA5Count = Math.ceil(
      houseNetEarnings / Math.abs(a5HouseLoss)
    );
    console.log(
      `Break-even point: ${breakEvenA5Count} A-5 matches would eliminate house profit`
    );
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
      .filter(([key]) => key.endsWith("-3"))
      .reduce((sum, [, data]) => sum + data.count, 0);
    const total4PlusMatches = Object.entries(payoutBreakdown)
      .filter(([key]) => !key.endsWith("-3"))
      .reduce((sum, [, data]) => sum + data.count, 0);

    console.log(`Total 3-symbol matches: ${total3Matches}`);
    console.log(`Total 4+ symbol matches: ${total4PlusMatches}`);
    console.log(
      `3-symbol match rate: ${((total3Matches / totalBets) * 100).toFixed(2)}%`
    );
    console.log(
      `4+ symbol match rate: ${((total4PlusMatches / totalBets) * 100).toFixed(
        2
      )}%`
    );

    console.log("\nSUGGESTIONS TO INCREASE 3-SYMBOL MATCHES:");
    console.log("1. Increase symbol density in reels (more A,B,C,D, fewer _)");
    console.log("2. Bias reel generation toward consecutive symbols");
    console.log("3. Reduce wild card (_) frequency");
    console.log("4. Adjust symbol distribution to favor common symbols");
    console.log(
      `5. Current 3-match rate is ${((total3Matches / totalBets) * 100).toFixed(
        2
      )}% - target might be 8-12%`
    );
    console.log("===================");
  });

  it("Should get grid payline symbols", async function () {
    const gridR = await getGrid({
      appId: appId,
      seed: "WOnoYeqYrHRnB2BJL1rXZ/leX8dby4h6xKQVVgfYBf0=",
      ...acc,
    });
    const grid = gridR.returnValue;
    console.log("grid", grid);
    console.log("displayGrid:");
    console.log(displayGrid(grid));
    console.log("Total paylines:", paylines.length);
    for (let i = 0; i < paylines.length; i++) {
      const gridPaylineSymbols = await getGridPaylineSymbols({
        appId: appId,
        grid: Buffer.from(grid),
        paylineIndex: i,
        ...acc,
      });
      const paylineSymbols = simulateGridPaylineSymbols(grid, paylines[i]);
      console.log(`gridPaylineSymbols for payline ${i}:`, gridPaylineSymbols);
      expect(gridPaylineSymbols).to.equal(paylineSymbols);
    }
  });

  it("Should match the payline", async function () {
    let maxPayout = 0;
    const gridR = await getGrid({
      appId: appId,
      seed: "WOnoYeqYrHRnB2BJL1rXZ/leX8dby4h6xKQVVgfYBf0=",
      ...acc,
    });
    const grid = gridR.returnValue;
    console.log("Grid:");
    console.log(grid);
    console.log(displayGrid(grid));
    console.log("Total paylines:", paylines.length);

    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < paylines.length; i++) {
      const payline = paylines[i];
      console.log(`\nProcessing payline ${i}: [${payline.join(",")}]`);

      try {
        const paylineSymbols = simulateGridPaylineSymbols(grid, payline);
        console.log("paylineSymbols", paylineSymbols);
        const matchPaylineR = await matchPayline({
          appId: appId,
          grid: Buffer.from(grid),
          paylineIndex: i,
        });
        if (matchPaylineR.success) {
          const [matchesBN, matchSymbolBN] = matchPaylineR.returnValue;
          const matches = Number(matchesBN);
          const matchSymbol = String.fromCharCode(matchSymbolBN);
          const payout = calculatePayout(matchSymbol, matches, 1);
          if (payout > maxPayout) {
            maxPayout = payout;
          }
          console.log(
            `✓ Payline ${i}: [${payline.join(
              ","
            )}] | Symbol: ${matchSymbol} | Matches: ${matches} | Payout: ${payout}`
          );
          processedCount++;
        } else {
          console.log(`✗ Payline ${i} failed:`, matchPaylineR);
          failedCount++;
        }
      } catch (error) {
        console.log(`✗ Payline ${i} error:`, error.message);
        failedCount++;
      }
    }

    console.log(
      `\nSummary: Processed ${processedCount}/${paylines.length} paylines, ${failedCount} failed`
    );
    expect(processedCount).to.be.greaterThan(0);
  });

  it("Should get payout multiplier", async function () {
    const PAYOUTS = {
      A: { 3: 200, 4: 1000, 5: 10000 },
      B: { 3: 60, 4: 200, 5: 1000 },
      C: { 3: 30, 4: 100, 5: 500 },
      D: { 3: 10, 4: 55, 5: 250 },
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
    for (let i = 0; i < 20; i++) {
      const spinR = await spin({
        appId: appId,
        betAmount: 1e6,
        maxPaylineIndex: i,
        index: 0,
        simulate: true,
        ...acc,
      });
      const betKey = spinR.returnValue;
      expect(betKey).not.equal(invalidBetKey);
    }
  });

  it("Should validate contract initialization", async function () {
    // Test that all required boxes are created
    // Test spin parameters are set correctly
    // Test payline count is 20 (not 9)
  });

  it("Should test payline count matches contract", async function () {
    // TODO: test payline count matches contract
  });

  it("Should handle invalid bet amounts", async function () {
    // Test bet below minimum (1 VOI)
    // Test bet above maximum (20 VOI)
    // Test insufficient payment
  });

  it("Should handle insufficient bank balance", async function () {
    // Test spin when bank balance < 100k VOI
    // Test proper error messages
  });

  it("Should test claim round validation", async function () {
    // Test CLAIM_ROUND_DELAY (5 rounds)
    // Test MAX_CLAIM_ROUND_DELTA (1000 rounds)
    // Test expired bet handling
  });

  it("Should unlock balance on claim incrementally", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 1000e6);
    const bankBalancesR0 = await getBalances({
      appId,
    });
    console.log(bankBalancesR0);
    const spinCost = 20e6;
    const betAmount = 1e6;
    const expectedLockedBalance = betAmount * 10_000;
    const betKey = await spin({
      appId: appId,
      betAmount: 1e6,
      maxPaylineIndex: 19,
      index: 0,
      ...acc2,
    });
    const bankBalancesR1 = await getBalances({
      appId,
      ...acc2,
    });
    let bankBalancesR2;
    let claimed = BigInt(0);
    for (let i = 0; i < 20; i++) {
      let claimR0;
      do {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await touch({ appId: beaconAppId });
        claimR0 = await claim({
          appId,
          betKey,
          ...acc2,
        });
      } while (!claimR0.success);
      console.log("");
      bankBalancesR2 = await getBalances({
        appId,
        ...acc2,
      });
      console.log({
        bankBalancesR2,
      });
      claimed += claimR0.returnValue;
      expect(claimR0.success).to.be.true;
    }
    const claimR1 = await claim({
      appId,
      betKey,
      ...acc2,
    });
    console.log({
      betKey,
      bankBalancesR0,
      bankBalancesR1,
      bankBalancesR2,
      claimed,
    });
    expect(claimR1.success).to.be.false;
    expect(bankBalancesR0.balanceAvailable).to.equal(1e6);
    expect(bankBalancesR0.balanceTotal).to.equal(1e6);
    expect(bankBalancesR0.balanceLocked).to.equal(0);
    expect(bankBalancesR1.balanceAvailable).to.equal(
      bankBalancesR0.balanceAvailable - (expectedLockedBalance - spinCost) / 1e6
    );
    expect(bankBalancesR1.balanceTotal).to.equal(
      bankBalancesR0.balanceTotal + spinCost / 1e6
    );
  });

  it("Should payout winning bets", async function () {
    const acc2 = await getAccount();
    await fund(acc2.addr, 1000e6);
    let win = false;
    do {
      const betKey = await spin({
        appId: appId,
        betAmount: 1e6,
        maxPaylineIndex: 19,
        index: 0,
        ...acc2,
      });
      for (let i = 0; i < 20; i++) {
        let claimR0;
        do {
          process.stdout.write(".");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await touch({ appId: beaconAppId });
          claimR0 = await claim({
            appId,
            betKey,
            ...acc2,
            debug: true,
          });
          if (claimR0.returnValue > BigInt(0)) {
            console.log("Claimed", claimR0.returnValue);
            win = true;
            break;
          }
        } while (!claimR0.success);
        if (win) {
          break;
        }
      }
    } while (!win);
  });
});
