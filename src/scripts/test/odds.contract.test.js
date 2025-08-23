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
  addressses,
  sks,
  algodClient,
  indexerClient,
  deposit,
  displayGrid,
  getGrid,
  simulateGridPaylineSymbols,
  getPayline,
  paylines,
  getBetKey,
  getSeedBetGrid,
} from "../command.js";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

function generateNonces(count, length = 16) {
  return Array.from({ length: count }, () => {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  });
}

function countChar(str, char) {
  return str.split(char).length - 1;
}

const PAYOUT_MULTIPLIERS = {
  // current payout multipliers
  A: { 3: 200, 4: 1000, 5: 10000 },
  B: { 3: 60, 4: 200, 5: 1000 },
  C: { 3: 30, 4: 100, 5: 500 },
  D: { 3: 10, 4: 55, 5: 250 },
  _: {},
};

const symbols = ["A", "B", "C", "D"];

// Helper function to calculate payouts
function calculatePayout(symbol, matches, betAmount = 1) {
  const multiplier = PAYOUT_MULTIPLIERS[symbol]?.[matches] || 0;
  return multiplier * betAmount;
}

const lookback = 100;

describe("odds: Yield Bearing Token Testing", function () {
  this.timeout(60_000);
  let appId;
  let slotMachineAppId;
  let beaconAppId;
  let acc;
  let blockSeeds = [];
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
    console.log("lookupback", lookback);
    const startRound = Math.max(lastRound - lookback, 0);
    for (let i = startRound; i < lastRound - 1; i++) {
      const block = await indexerClient.lookupBlock(i).do();
      const seed = block.seed;
      blockSeeds.push(seed);
    }
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
    await fund(acc.addr, 1_000_000e6);
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
    await deposit({
      appId,
      amount: 1_000_000e6 - 1e6,
      ...acc,
    });
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
  it("Should tally up", async function () {
    const acc = await getAccount();
    await fund(acc.addr, 1e6);
    const nonces = generateNonces(10);
    const counts = {
      "3A": 0,
      "4A": 0,
      "5A": 0,
      "3B": 0,
      "4B": 0,
      "5B": 0,
      "3C": 0,
      "4C": 0,
      "5C": 0,
      "3D": 0,
      "4D": 0,
      "5D": 0,
    };
    const contributions = {
      "3A": 0,
      "4A": 0,
      "5A": 0,
      "3B": 0,
      "4B": 0,
      "5B": 0,
      "3C": 0,
      "4C": 0,
      "5C": 0,
      "3D": 0,
      "4D": 0,
      "5D": 0,
    };
    const paylineCounts = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
    };
    const paylineContributions = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
    };
    // Grids
    // 0 - grid (block seed)
    // 1 - seedBedGrid (block seed + bet key)
    const whichGrid = 1;
    let totalPayout = 0;
    let bet = 0;
    let spinWinCount = 0;
    for (const seed of blockSeeds) {
      //console.log("seed", seed);
      for (const nonce of nonces) {
        //console.log("nonce", nonce);
        const getBetKeyParams = {
          appId: slotMachineAppId,
          address: acc.addr, // address
          amount: 1, // bet amount
          maxPaylineIndex: 19, // 20 paylines
          index: BigInt("0x" + nonce) % BigInt(Number.MAX_SAFE_INTEGER),
        };
        const betKey = await getBetKey(getBetKeyParams);
        //console.log("betKey", betKey);
        const grid =
          whichGrid > 0
            ? await getSeedBetGrid({
                appId: slotMachineAppId,
                seed,
                betKey,
              })
            : (
                await getGrid({
                  appId: slotMachineAppId,
                  seed: seed,
                  ...acc,
                })
              ).returnValue;
        //console.log("grid", grid);

        let spinWin = false;
        for (const i of Array(paylines.length).keys()) {
          // compute once per payline
          const paylineSymbols = simulateGridPaylineSymbols(grid, paylines[i]);
          //console.log("paylineSymbols", paylineSymbols);

          const payouts = [];
          for (const symbol of symbols) {
            const count = countChar(paylineSymbols, symbol);
            const value = calculatePayout(symbol, count, 1);
            payouts.push({ symbol, value, count }); // cleaner structure
          }
          const {
            symbol,
            value: maxPayout,
            count: maxCount,
          } = payouts.reduce(
            (max, curr) => (curr.value > max.value ? curr : max),
            { symbol: null, value: -Infinity, count: 0 }
          );
          if (maxPayout > 0) {
            console.log("symbol", symbol);
            console.log("maxPayout", maxPayout);
            console.log("maxCount", maxCount);
            counts[`${maxCount}${symbol}`]++;
            contributions[`${maxCount}${symbol}`] += maxPayout;
            paylineCounts[`${i}`]++;
            paylineContributions[`${i}`] += maxPayout;
            spinWin = true;
          }

          totalPayout += maxPayout;
          bet++;

          console.log(
            [
              bet,
              betKey,
              grid,
              i,
              paylineSymbols,
              symbol,
              maxCount,
              maxPayout,
              totalPayout,
            ].join(",")
          );
        }
        if (spinWin) {
          spinWinCount++;
        }
      }
    }
    // === Monte Carlo Report ===
    // Spins: 10,000
    // Spin Wins: 3084
    // Lines per spin: 20
    // Bet per line: 1
    // Total Bet: 200,000
    // Total Return: 185,660
    // RTP: 92.83%
    // Win Rate: 30.84% (any positive payout)
    const nonce_count = 10;
    const paylineIndex = 20;
    const spins = lookback * nonce_count;
    const betPerLine = 1;
    const totalBet = spins * betPerLine * paylineIndex;
    const totalWins = Object.values(counts).reduce(
      (acc, count) => acc + count,
      0
    );
    const totalReturn = totalPayout;

    console.log(`
      === Monte Carlo Report ===
      Spins: ${spins}
      Spin Wins: ${spinWinCount}
      Win Rate (spin): ${(spinWinCount / spins) * 100}

      Lines per spin: ${paylineIndex}
      Bet per line: ${betPerLine}
      Total Bet: ${totalBet}
      Total Wins: ${totalWins}
      Win Rate (bet): ${(totalWins / totalBet) * 100}
      Total Return: ${totalPayout}
      RTP: ${(totalReturn / totalBet) * 100}
      `);

    console.log("Match Frequencies (across evaluated lines):");
    console.log(counts);

    console.log("Payout Contribution by Combo (multiplier * bet_perline):");
    console.log(contributions);

    console.log("Payline Wins by Line:");
    console.log(paylineCounts);

    console.log("Payline Contribution by Line (multiplier * bet_perline):");
    console.log(paylineContributions);
  });
});
