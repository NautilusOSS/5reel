import { Command } from "commander";
import {
  SlotMachineClient,
  APP_SPEC as SlotMachineAppSpec,
} from "./clients/SlotMachineClient.js";

import { BeaconClient } from "./clients/BeaconClient.js";
import { BankManagerClient } from "./clients/BankManagerClient.js";
import { SpinManagerClient } from "./clients/SpinManagerClient.js";
import {
  YieldBearingTokenClient,
  APP_SPEC as YieldBearingTokenAppSpec,
} from "./clients/YieldBearingTokenClient.js";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import fs from "fs";
import { AppSpec } from "@algorandfoundation/algokit-utils/types/app-spec.js";
dotenv.config({ path: ".env" });

export const paylines = [
  [0, 0, 0, 0, 0], // top line
  [1, 1, 1, 1, 1], // middle line
  [2, 2, 2, 2, 2], // bottom line
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // inverted V
  [0, 0, 1, 0, 0], // top-center peak
  [2, 2, 1, 2, 2], // bottom-center valley
  [1, 0, 1, 2, 1], // M shape
  [1, 2, 1, 0, 1], // W shape
  [0, 1, 1, 1, 2],
  [2, 1, 1, 1, 0],
  [0, 1, 2, 2, 2],
  [2, 1, 0, 0, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 2, 2, 2, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 2],
];

const makeContract = (
  appId: number,
  appSpec: any,
  acc: { addr: string; sk: Uint8Array }
) => {
  return new CONTRACT(
    appId,
    algodClient,
    indexerClient,
    {
      name: "",
      desc: "",
      methods: appSpec.contract.methods,
      events: [],
    },
    {
      addr: acc.addr,
      sk: acc.sk,
    }
  );
};

export const program = new Command();

const { MN } = process.env;

export const acc = algosdk.mnemonicToSecretKey(MN || "");
export const { addr, sk } = acc;

export const addressses = {
  deployer: addr,
};

export const sks = {
  deployer: sk,
};

// DEVNET
const ALGO_SERVER = "http://localhost";
const ALGO_PORT = 4001;
const ALGO_INDEXER_SERVER = "http://localhost";
const ALGO_INDEXER_PORT = 8980;

// TESTNET
// const ALGO_SERVER = "https://testnet-api.voi.nodely.dev";
// const ALGO_INDEXER_SERVER = "https://testnet-idx.voi.nodely.dev";
// const ALGO_PORT = 443;
// const ALGO_INDEXER_PORT = 443;

// MAINNET
// const ALGO_SERVER = "https://mainnet-api.voi.nodely.dev";
// const ALGO_INDEXER_SERVER = "https://mainnet-idx.voi.nodely.dev";

const algodServerURL = process.env.ALGOD_SERVER || ALGO_SERVER;
const algodServerPort = process.env.ALGOD_PORT || ALGO_PORT;
export const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN ||
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  algodServerURL,
  algodServerPort
);

const indexerServerURL = process.env.INDEXER_SERVER || ALGO_INDEXER_SERVER;
const indexerServerPort = process.env.INDEXER_PORT || ALGO_INDEXER_PORT;
export const indexerClient = new algosdk.Indexer(
  process.env.INDEXER_TOKEN || "",
  indexerServerURL,
  indexerServerPort
);

const makeSpec = (methods: any) => {
  return {
    name: "",
    desc: "",
    methods,
    events: [],
  };
};

const signSendAndConfirm = async (txns: string[], sk: any) => {
  const stxns = txns
    .map((t) => new Uint8Array(Buffer.from(t, "base64")))
    .map((t) => {
      const txn = algosdk.decodeUnsignedTransaction(t);
      return txn;
    })
    .map((t: any) => algosdk.signTransaction(t, sk));
  const res = await algodClient
    .sendRawTransaction(stxns.map((txn: any) => txn.blob))
    .do();
  console.log(res);
  return await Promise.all(
    stxns.map((res: any) =>
      algosdk.waitForConfirmation(algodClient, res.txID, 4)
    )
  );
};

export const getAccount = async () => {
  const acc = algosdk.generateAccount();
  return acc;
};

export const fund = async (addr: string, amount: number) => {
  console.log("funding", addr, amount);
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: addressses.deployer,
    to: addr,
    amount: amount,
    suggestedParams: await algodClient.getTransactionParams().do(),
  });
  const signedTxn = algosdk.signTransaction(txn, sks.deployer);
  const res = await algodClient.sendRawTransaction(signedTxn.blob).do();
  await algosdk.waitForConfirmation(algodClient, res.txId, 4);
};

// algod client helpers

export const getAccountBalance = async (addr: string) => {
  const accInfo = await algodClient.accountInformation(addr).do();
  return accInfo.amount;
};

export const getStatus = async () => {
  const status = await algodClient.status().do();
  return status;
};

// indxer client helpers

export const getBlockSeed = async (block: number) => {
  let blockInfo;
  do {
    try {
      blockInfo = await indexerClient.lookupBlock(block).do();
    } catch (e) {}
    if (blockInfo?.seed) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } while (1);
  return blockInfo?.seed;
};

const makeABI = (spec: AppSpec) => {
  return {
    name: spec.contract.name,
    desc: spec.contract.desc,
    methods: spec.contract.methods,
    events: [
      {
        name: "BetPlaced",
        args: [
          {
            type: "address",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
        ],
      },
      {
        name: "BetClaimed",
        args: [
          {
            type: "address",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
          {
            type: "uint64",
          },
        ],
      },
    ],
  };
};

type DeployType =
  | "SlotMachine"
  | "Beacon"
  | "BankManager"
  | "SpinManager"
  | "YieldBearingToken";

interface DeployOptions {
  type: DeployType;
  name: string;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const deploy: any = async (options: DeployOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = {
    addr,
    sk,
  };
  let Client;
  switch (options.type) {
    case "SlotMachine": {
      Client = SlotMachineClient;
      break;
    }
    case "Beacon": {
      Client = BeaconClient;
      break;
    }
    case "BankManager": {
      Client = BankManagerClient;
      break;
    }
    case "SpinManager": {
      Client = SpinManagerClient;
      break;
    }
    case "YieldBearingToken": {
      Client = YieldBearingTokenClient;
      break;
    }
  }
  const clientParams: any = {
    resolveBy: "creatorAndName",
    findExistingUsing: indexerClient,
    creatorAddress: acc.addr,
    name: options.name || "",
    sender: acc,
  };
  const appClient = Client ? new Client(clientParams, algodClient) : null;
  if (appClient) {
    const app = await appClient.deploy({
      deployTimeParams: {},
      onUpdate: "update",
      onSchemaBreak: "fail",
    });
    return { appId: app.appId, appClient: appClient };
  }
};
program
  .command("deploy")
  .requiredOption("-t, --type <string>", "Specify factory type")
  .requiredOption("-n, --name <string>", "Specify contract name")
  .option("--debug", "Debug the deployment", false)
  .description("Deploy a specific contract type")
  .action(async (options: DeployOptions) => {
    const apid = await deploy(options);
    if (!apid) {
      console.log("Failed to deploy contract");
      return;
    }
    console.log(apid);
  });

interface GetReelsOptions {
  appId: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getReels = async (options: GetReelsOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_reelsR = await ci.get_reels();
  return get_reelsR;
};

interface GetGridOptions {
  appId: number;
  seed: string; // b64 encoded
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getGrid = async (options: GetGridOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  ci.setFee(2000);
  const get_gridR = await ci.get_grid(
    new Uint8Array(Buffer.from(options.seed, "base64"))
  );
  return get_gridR;
};

interface GetReelOptions {
  appId: number;
  reelIndex: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getReel = async (options: GetReelOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_reelR = await ci.get_reel(options.reelIndex);
  return get_reelR;
};

interface GetPaylineOptions {
  appId: number;
  paylineIndex: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getPayline = async (options: GetPaylineOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_paylineR = await ci.get_payline(options.paylineIndex);
  return get_paylineR;
};

interface GetReelWindowOptions {
  appId: number;
  reel: number;
  index: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getReelWindow = async (options: GetReelWindowOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_reel_windowR = await ci.get_reel_window(
    options.reel,
    options.index
  );
  return get_reel_windowR;
};

interface GetPaylinesOptions {
  appId: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getPaylines = async (options: GetPaylinesOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_paylinesR = await ci.get_paylines();
  return get_paylinesR;
};

interface MatchPaylineOptions {
  appId: number;
  grid: any;
  paylineIndex: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const matchPayline = async (options: MatchPaylineOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const match_paylineR = await ci.match_payline(
    options.grid,
    options.paylineIndex
  );
  if (options.debug) {
    console.log(match_paylineR);
  }
  return match_paylineR;
};

interface GetBetClaimRoundOptions {
  appId: number;
  betKey: string;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const getBetClaimRound = async (options: GetBetClaimRoundOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_bet_claim_roundR = await ci.get_bet_claim_round(
    new Uint8Array(Buffer.from(options.betKey, "hex"))
  );
  if (get_bet_claim_roundR.success) {
    return Number(get_bet_claim_roundR.returnValue);
  }
  return 0;
};

interface SpinOptions {
  appId: number;
  betAmount: number;
  maxPaylineIndex: number;
  index: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
  simulate?: boolean;
}

export const invalidBetKey =
  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // Bytes56()

export const spin = async (options: SpinOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const spin_costR = await ci.spin_cost();
  const spin_cost = Number(spin_costR.returnValue);
  const spin_payline_costR = await ci.spin_payline_cost();
  const spin_payline_cost = Number(spin_payline_costR.returnValue);
  const total_spin_payline_cost =
    spin_payline_cost * (options.maxPaylineIndex + 1);
  ci.setEnableRawBytes(true);
  const paymentAmount =
    options.betAmount * (options.maxPaylineIndex + 1) +
    spin_cost +
    total_spin_payline_cost;
  ci.setPaymentAmount(paymentAmount);
  const spinR = await ci.spin(
    options.betAmount,
    options.maxPaylineIndex,
    options.index
  );
  if (options.debug) {
    console.log(spinR);
  }
  if (spinR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(spinR.txns, sk);
    }
    return Buffer.from(spinR.returnValue).toString("hex");
  }
  return invalidBetKey;
};

program
  .command("spin")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .requiredOption("-b, --betAmount <number>", "Specify bet amount")
  .requiredOption("-m, --maxPaylineIndex <number>", "Specify max payline index")
  .requiredOption("-i, --index <number>", "Specify index")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the spin", false)
  .option("--simulate", "Simulate the spin", false)
  .action(async (options: SpinOptions) => {
    const appId = Number(options.appId);
    const maxPaylineIndex = Number(options.maxPaylineIndex);
    const betKey = await spin({
      ...options,
      appId,
      betAmount: Number(options.betAmount),
      maxPaylineIndex,
      index: Number(options.index),
    });
    if (betKey === invalidBetKey) {
      return;
    }
    console.log(betKey);
    let getBetGridR;
    do {
      getBetGridR = await getBetGrid({
        ...options,
        appId: Number(options.appId),
        betKey,
      });
      if (getBetGridR.success) {
        displayGrid(getBetGridR.returnValue);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    } while (1);
    console.log(getBetGridR.returnValue);
    console.log(getBetGridR.returnValue.length);
    for (let j = 0; j <= maxPaylineIndex; j++) {
      const simulatedMatchPayline = simulateGridPaylineMatch(
        getBetGridR.returnValue,
        paylines[j]
      );
      console.log({ simulatedMatchPayline });
      const matchPaylineR = await matchPayline({
        appId,
        grid: new Uint8Array(Buffer.from(getBetGridR.returnValue)),
        paylineIndex: j,
        ...acc,
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
          const claimR = await claim({
            appId,
            betKey,
            ...acc,
          });
          //if (claimR.success) break;
        } while (1);
        break;
      }
    }
    let i = 0;
    for (const payline of paylines) {
      const matchPaylineR = simulateGridPaylineMatch(
        getBetGridR.returnValue,
        payline
      );
      if (matchPaylineR.matches >= 3) {
        console.log(i++, matchPaylineR);
      }
    }
  });

interface GetBetGridOptions {
  appId: number;
  betKey: string;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
  simulate?: boolean;
}

export const getBetGrid = async (options: GetBetGridOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  ci.setFee(5000);
  ci.setEnableParamsLastRoundMod(true);
  const get_bet_gridR = await ci.get_bet_grid(
    new Uint8Array(Buffer.from(options.betKey, "hex"))
  );
  if (options.debug) {
    console.log(get_bet_gridR);
  }
  return get_bet_gridR;
};

interface ClaimOptions {
  appId: number;
  betKey: string;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
  simulate?: boolean;
}

export const claim = async (options: ClaimOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  ci.setFee(5000);
  ci.setEnableParamsLastRoundMod(true);
  ci.setEnableRawBytes(true);
  const claimR = await ci.claim(
    new Uint8Array(Buffer.from(options.betKey, "hex"))
  );
  if (options.debug) {
    console.log(claimR);
  }
  if (claimR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(claimR.txns, sk);
    }
  }
  return claimR;
};

interface GetPayoutMultiplierOptions {
  appId: number;
  symbol: string;
  count: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
  simulate?: boolean;
}

export const getPayoutMultiplier = async (
  options: GetPayoutMultiplierOptions
) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const get_payout_multiplierR = await ci.get_payout_multiplier(
    new Uint8Array(Buffer.from(options.symbol))[0],
    options.count
  );
  return get_payout_multiplierR;
};

// simulate reel window
export const simulateReelWindow = (reel: string, index: number) => {
  const reelArray = reel.split("");
  const reelWindow = [];
  for (let i = 0; i < 3; i++) {
    const wrappedIndex = (index + i) % reelArray.length;
    reelWindow.push(reelArray[wrappedIndex]);
  }
  return reelWindow.join("");
};

// simulate grid payline match
export const simulateGridPaylineMatch = (grid: string, payline: number[]) => {
  // grid is 5 x 3 grid of symbols
  // payline is 5 numbers
  // each number an index in the grid column
  const gridArray = grid.split("");
  // split into columns of 3
  const columns: string[][] = [];
  for (let i = 0; i < gridArray.length; i += 3) {
    columns.push(gridArray.slice(i, i + 3));
  }
  // get symbols along the payline
  const paylineSymbols = payline.map(
    (rowIndex, colIndex) => columns[colIndex][rowIndex]
  );

  // count consecutive matching symbols from left to right
  let matches = 1; // Start with 1 since we're counting symbols, not pairs
  for (let i = 0; i < paylineSymbols.length - 1; i++) {
    if (paylineSymbols[i] === paylineSymbols[i + 1]) {
      matches++;
    } else {
      break; // Stop counting when we hit a non-match
    }
  }
  if (paylineSymbols[0] === "_") {
    return { matches: 0, initialSymbol: "_" };
  }
  // return the number of matches and initial symbol
  return { matches, initialSymbol: paylineSymbols[0] };
};

// Display the grid in a readable format ie 5 x 3 grid
// Display the grid in a readable format ie 5 x 3 grid
// from C0_0 C0_1 C0_2 C1_0 C1_1 C1_2 C2_0 C2_1 C2_2 C3_0 C3_1 C3_2 C4_0 C4_1 C4_2
// to
// C0_0 C1_0 C2_0 C3_0 C4_0
// C0_1 C1_1 C2_1 C3_1 C4_1
// C0_2 C1_2 C2_2 C3_2 C4_2

export const displayGrid = (grid: string) => {
  const row1 = grid[0] + grid[3] + grid[6] + grid[9] + grid[12];
  const row2 = grid[1] + grid[4] + grid[7] + grid[10] + grid[13];
  const row3 = grid[2] + grid[5] + grid[8] + grid[11] + grid[14];
  console.log(row1);
  console.log(row2);
  console.log(row3);
};

// generate random 32 byte seed
export const generateSeed = () => {
  return crypto.randomBytes(32);
};

// Beacon

interface TouchOptions {
  appId: number;
  addr: string;
  sk: Uint8Array;
  debug?: boolean;
}

export const touch = async (options: TouchOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const appClient = new BeaconClient(
    {
      resolveBy: "id",
      id: Number(options.appId),
      sender: acc,
    },
    algodClient
  );
  const txn = await appClient.touch({});
  if (options.debug) {
    console.log(txn);
  }
  return txn;
};

// bank

interface DepositOptions {
  appId: number;
  amount: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const deposit: any = async (options: DepositOptions) => {
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  ci.setPaymentAmount(options.amount);
  const depositR = await ci.deposit();
  if (options.debug) {
    console.log(depositR);
  }
  if (depositR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(depositR.txns, sk);
    }
  }
  return depositR;
};

interface WithdrawOptions {
  appId: number;
  amount: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const withdraw: any = async (options: WithdrawOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  ci.setFee(2000);
  const withdrawR = await ci.withdraw(options.amount);
  if (options.debug) {
    console.log(withdrawR);
  }
  if (withdrawR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(withdrawR.txns, sk);
    }
  }
  return withdrawR;
};

// common

interface BootstrapOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const bootstrap: any = async (options: BootstrapOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const bootstrap_costR = await ci.bootstrap_cost();
  const bootstrap_cost = bootstrap_costR.returnValue;
  ci.setPaymentAmount(bootstrap_cost);
  const bootstrapR = await ci.bootstrap();
  if (options.debug) {
    console.log(bootstrapR);
  }
  if (bootstrapR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(bootstrapR.txns, sk);
    }
    return true;
  }
  return false;
};

program
  .command("bootstrap")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the bootstrap", false)
  .option("--simulate", "Simulate the bootstrap", false)
  .action(async (options: BootstrapOptions) => {
    const success = await bootstrap({
      ...options,
      appId: Number(options.appId),
    });
    if (!success) {
      console.log("Failed to bootstrap");
    }
  });

interface GetOwnerOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const getOwner: any = async (options: GetOwnerOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const ownerR = await ci.get_owner();
  if (options.debug) {
    console.log(ownerR);
  }
  return ownerR.returnValue;
};

program
  .command("get-owner")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the get-owner", false)
  .action(async (options: GetOwnerOptions) => {
    const owner = await getOwner({
      ...options,
      appId: Number(options.appId),
    });
    console.log(owner);
  });

// yield bearing token

interface BootstrapCostOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const bootstrapCost: any = async (options: BootstrapCostOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const bootstrap_costR = await ci.bootstrap_cost();
  return bootstrap_costR.returnValue;
};

interface YBTDepositOptions {
  appId: number;
  amount: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const ybtDeposit: any = async (options: YBTDepositOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const ybt_balanceR = await ci.arc200_balanceOf(acc.addr);
  const ybt_balance = ybt_balanceR.returnValue;
  console.log("ybt_balance", ybt_balance);
  const ybt_deposit_costR = await ci.deposit_cost();
  const ybt_deposit_cost = ybt_deposit_costR.returnValue;
  console.log("ybt_deposit_cost", ybt_deposit_cost);
  const paymentAmount =
    Number(options.amount) +
    (Number(ybt_balance) === 0 ? Number(ybt_deposit_cost) : 0);
  console.log("paymentAmount", paymentAmount);
  ci.setFee(4000);
  ci.setPaymentAmount(paymentAmount);
  const ybt_depositR = await ci.deposit();
  if (options.debug) {
    console.log(ybt_depositR);
  }
  if (ybt_depositR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(ybt_depositR.txns, sk);
    }
  }
  return ybt_depositR;
};

program
  .command("ybt-deposit")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .requiredOption("-b, --amount <number>", "Specify amount")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the ybt-deposit", false)
  .option("--simulate", "Simulate the ybt-deposit", false)
  .action(async (options: YBTDepositOptions) => {
    const success = await ybtDeposit({
      ...options,
      appId: Number(options.appId),
    });
    if (!success) {
      console.log("Failed to deposit ybt");
    }
  });

interface YBTWithdrawOptions {
  appId: number;
  amount: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const ybtWithdraw: any = async (options: YBTWithdrawOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  ci.setFee(5000);
  const ybt_withdrawR = await ci.withdraw(options.amount);
  if (options.debug) {
    console.log(ybt_withdrawR);
  }
  if (ybt_withdrawR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(ybt_withdrawR.txns, sk);
    }
  }
  return ybt_withdrawR;
};

program
  .command("ybt-withdraw")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .requiredOption("-b, --amount <number>", "Specify amount")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the ybt-withdraw", false)
  .option("--simulate", "Simulate the ybt-withdraw", false)
  .action(async (options: YBTWithdrawOptions) => {
    const success = await ybtWithdraw({
      ...options,
      appId: Number(options.appId),
      amount: Number(options.amount),
    });
    if (!success) {
      console.log("Failed to withdraw ybt");
    }
  });

interface SetYieldBearingSourceOptions {
  appId: number;
  source: number;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const setYieldBearingSource: any = async (
  options: SetYieldBearingSourceOptions
) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  ci.setFee(2000);
  const set_yield_bearing_sourceR = await ci.set_yield_bearing_source(
    options.source
  );
  if (options.debug) {
    console.log(set_yield_bearing_sourceR);
  }
  if (set_yield_bearing_sourceR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(set_yield_bearing_sourceR.txns, sk);
    }
    return true;
  }
  return false;
};

program
  .command("set-yield-bearing-source")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .requiredOption("-s, --source <number>", "Specify source")
  .option("-t, --sender <string>", "Specify sender")
  .option("--debug", "Debug the set-yield-bearing-source", false)
  .option("--simulate", "Simulate the set-yield-bearing-source", false)
  .action(async (options: SetYieldBearingSourceOptions) => {
    const success = await setYieldBearingSource({
      ...options,
      appId: Number(options.appId),
      source: Number(options.source),
    });
    if (!success) {
      console.log("Failed to set yield bearing source");
    }
  });

// arc200

interface Arc200NameOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const arc200Name: any = async (options: Arc200NameOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const arc200_nameR = await ci.arc200_name();
  return arc200_nameR.returnValue;
};

interface Arc200SymbolOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const arc200Symbol: any = async (options: Arc200SymbolOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const arc200_symbolR = await ci.arc200_symbol();
  return arc200_symbolR.returnValue;
};

interface Arc200DecimalsOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const arc200Decimals: any = async (options: Arc200DecimalsOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const arc200_decimalsR = await ci.arc200_decimals();
  return arc200_decimalsR.returnValue;
};

interface Arc200BalanceOfOptions {
  appId: number;
  address: string;
  sender: string;
  sk: any;
  debug?: boolean;
}

export const arc200BalanceOf: any = async (options: Arc200BalanceOfOptions) => {
  const addr = options.sender || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const balanceOfR = await ci.arc200_balanceOf(options.address);
  return balanceOfR.returnValue;
};

// ownable

interface TransferOwnershipOptions {
  appId: number;
  newOwner: string;
  addr: string;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const transferOwnership: any = async (
  options: TransferOwnershipOptions
) => {
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
  const transferOwnershipR = await ci.transfer_ownership(options.newOwner);
  if (options.debug) {
    console.log(transferOwnershipR);
  }
  if (transferOwnershipR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(transferOwnershipR.txns, sk);
    }
    return true;
  }
  return false;
};

program
  .command("transfer-ownership")
  .requiredOption("-a, --appId <number>", "Specify app id")
  .requiredOption("-n, --newOwner <string>", "Specify new owner")
  .option("-s, --sender <string>", "Specify sender")
  .option("--debug", "Debug the transfer-ownership", false)
  .option("--simulate", "Simulate the transfer-ownership", false)
  .action(async (options: TransferOwnershipOptions) => {
    const success = await transferOwnership({
      ...options,
      appId: Number(options.appId),
    });
    if (!success) {
      console.log("Failed to transfer ownership");
    }
  });

interface PayoutOptions {
  sender: string;
  to: string;
  amount: number;
  sk: any;
  debug?: boolean;
  simulate?: boolean;
}

export const payment: any = async (options: PayoutOptions) => {
  const addr = options.sender || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const suggestedParams = await algodClient.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: addr,
    to: options.to,
    amount: options.amount,
    suggestedParams,
  });
  const stxn = algosdk.signTransaction(txn, sk);
  const txid = await algodClient.sendRawTransaction(stxn.blob).do();
  console.log("txid", txid);
  return txid;
};

program
  .command("pay")
  .option("-s, --sender <string>", "Specify sender")
  .option("-a, --amount <number>", "Specify amount")
  .option("-t, --to <string>", "Specify to")
  .option("--debug", "Debug the payout", false)
  .option("--simulate", "Simulate the payout", false)
  .action(async (options: PayoutOptions) => {
    const success = await payment({
      ...options,
      sender: options.sender || addressses.deployer,
      sk: sks.deployer,
      amount: Number(options.amount),
      to: options.to,
    });
    if (!success) {
      console.log("Failed to pay");
    }
  });

// arc200

interface Arc200TotalSupplyOptions {
  appId: number;
  addr: string;
  sk: any;
  debug?: boolean;
}

export const arc200TotalSupply: any = async (
  options: Arc200TotalSupplyOptions
) => {
  const addr = options.addr || addressses.deployer;
  const sk = options.sk || sks.deployer;
  const acc = { addr, sk };
  const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
  const totalSupplyR = await ci.arc200_totalSupply();
  return totalSupplyR.returnValue;
};

// upgrade

interface PostUpdateOptions {
  apid: number;
  simulate?: boolean;
  debug?: boolean;
}

export const arc200PostUpdate: any = async (options: PostUpdateOptions) => {
  const ci = new CONTRACT(
    Number(options.apid),
    algodClient,
    indexerClient,
    makeSpec(YieldBearingTokenAppSpec.contract.methods),
    {
      addr: addr,
      sk: sk,
    }
  );
  ci.setFee(2000);
  const postUpdateR = await ci.post_update();
  if (options.debug) {
    console.log(postUpdateR);
  }
  if (postUpdateR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(postUpdateR.txns, sk);
    }
  }
  return postUpdateR.success;
};

program
  .command("post-update")
  .description("Post update the arc200 token")
  .requiredOption("-a, --apid <number>", "Specify the application ID")
  .option("-s, --simulate", "Simulate the post update", false)
  .option("--debug", "Debug the deployment", false)
  .action(async (options) => {
    const success = await arc200PostUpdate(options);
    if (!success) {
      console.log("Failed to post update");
    }
  });
