import { Command } from "commander";
import { SlotMachineClient, APP_SPEC as SlotMachineAppSpec, } from "./clients/SlotMachineClient.js";
import { BeaconClient } from "./clients/BeaconClient.js";
import { BankManagerClient, APP_SPEC as BankManagerAppSpec, } from "./clients/BankManagerClient.js";
import { SpinManagerClient } from "./clients/SpinManagerClient.js";
import { ReelManagerClient } from "./clients/ReelManagerClient.js";
import { YieldBearingTokenClient, APP_SPEC as YieldBearingTokenAppSpec, } from "./clients/YieldBearingTokenClient.js";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import BigNumber from "bignumber.js";
dotenv.config({ path: ".env" });
//
// TODO
// - [ ] - construct functions that builds payout multipliers for each symbol
//         based on the payout multipliers in the contract
//
// function that takes string and returns a Uint8Array of size 256
export function stringToUint8Array(str, length) {
    if (str.length > length)
        return new Uint8Array(Buffer.from(str, "utf8"));
    const bytes = new Uint8Array(length);
    bytes.set(new Uint8Array(Buffer.from(str, "utf8")), 0);
    return bytes;
}
export const paylines = [
    [1, 1, 1, 1, 1], // 1. Middle line
    [0, 0, 0, 0, 0], // 2. Top line
    [2, 2, 2, 2, 2], // 3. Bottom line
    [0, 1, 2, 1, 0], // 4. V shape
    [2, 1, 0, 1, 2], // 5. Inverted V
    [0, 1, 1, 2, 2], // 6. Diagonal down
    [2, 1, 1, 0, 0], // 7. Diagonal up
    [0, 0, 1, 0, 0], // 8. Zigzag top
    [2, 2, 1, 2, 2], // 9. Zigzag bottom
    [0, 1, 2, 2, 1], // 10. Staircase down
    [2, 1, 0, 0, 1], // 11. Staircase up
    [1, 0, 0, 0, 1], // 12. Slight diagonal (left top heavy)
    [1, 2, 2, 2, 1], // 13. Slight diagonal (left bottom heavy)
    [0, 2, 0, 2, 0], // 14. Top-bottom-top
    [2, 0, 2, 0, 2], // 15. Bottom-top-bottom
    [0, 2, 1, 2, 0], // 16. Outer rails (zigzag top start)
    [2, 0, 1, 0, 2], // 17. Outer rails (zigzag bottom start)
    [0, 0, 1, 2, 2], // 18. Left hook
    [2, 2, 1, 0, 0], // 19. Right hook
    [1, 0, 1, 2, 1], // 20. Wave
];
const makeContract = (appId, appSpec, acc) => {
    const { algodClient, indexerClient } = getCurrentClients();
    return new CONTRACT(appId, algodClient, indexerClient, {
        name: "",
        desc: "",
        methods: appSpec.contract.methods,
        events: [],
    }, {
        addr: acc.addr,
        sk: acc.sk,
    });
};
export const program = new Command();
// Set program metadata
program
    .name("5reel")
    .description("5Reel Slot Machine CLI - Deploy and interact with Algorand smart contracts")
    .version("1.0.0");
// Global options
program
    .option("-n, --network <string>", "Specify network (devnet, testnet, mainnet)")
    .option("--algod-server <string>", "Override Algorand node server URL")
    .option("--algod-port <number>", "Override Algorand node port")
    .option("--indexer-server <string>", "Override Algorand indexer server URL")
    .option("--indexer-port <number>", "Override Algorand indexer port")
    .option("--algod-token <string>", "Override Algorand node token")
    .option("--indexer-token <string>", "Override Algorand indexer token")
    .option("-d, --debug", "Enable debug mode")
    .option("-s, --simulate", "Simulate transactions without sending")
    .option("--dry-run", "Show what would be done without executing")
    .option("-h, --help", "Show help information");
// Hook to handle global options and configure network
program.hook("preAction", (thisCommand, actionCommand) => {
    const options = thisCommand.opts();
    // Set defaults for undefined options
    const network = options.network || "devnet";
    const debug = options.debug || false;
    const simulate = options.simulate || false;
    const dryRun = options.dryRun || false;
    console.log("Using network", network);
    // Update network configuration based on global options
    if (network === "testnet") {
        const ALGO_SERVER = "https://testnet-api.voi.nodely.dev";
        const ALGO_INDEXER_SERVER = "https://testnet-idx.voi.nodely.dev";
        const ALGO_PORT = 443;
        const ALGO_INDEXER_PORT = 443;
        // Update global variables if not overridden
        if (!options.algodServer) {
            globalThis.ALGO_SERVER = ALGO_SERVER;
            globalThis.ALGO_PORT = ALGO_PORT;
        }
        if (!options.indexerServer) {
            globalThis.ALGO_INDEXER_SERVER = ALGO_INDEXER_SERVER;
            globalThis.ALGO_INDEXER_PORT = ALGO_INDEXER_PORT;
        }
    }
    else if (network === "mainnet") {
        const ALGO_SERVER = "https://mainnet-api.voi.nodely.dev";
        const ALGO_PORT = 443;
        const ALGO_INDEXER_SERVER = "https://mainnet-idx.voi.nodely.dev";
        const ALGO_INDEXER_PORT = 443;
        // Update global variables if not overridden
        if (!options.algodServer) {
            globalThis.ALGO_SERVER = ALGO_SERVER;
            globalThis.ALGO_PORT = ALGO_PORT;
        }
        if (!options.indexerServer) {
            globalThis.ALGO_INDEXER_SERVER = ALGO_INDEXER_SERVER;
            globalThis.ALGO_INDEXER_PORT = ALGO_INDEXER_PORT;
        }
    }
    // Set global debug and simulate flags
    globalThis.GLOBAL_DEBUG = debug;
    globalThis.GLOBAL_SIMULATE = simulate;
    globalThis.GLOBAL_DRY_RUN = dryRun;
    // Store the current options globally for client creation
    globalThis.CURRENT_NETWORK_OPTIONS = options;
});
// Config command to show current settings
program
    .command("config")
    .description("Show current configuration and network settings")
    .action(() => {
    const options = program.opts();
    // Set defaults for undefined options
    const network = options.network || "devnet";
    const debug = options.debug || false;
    const simulate = options.simulate || false;
    const dryRun = options.dryRun || false;
    console.log("Current Configuration:");
    console.log("=====================");
    console.log(`Network: ${network}`);
    console.log(`Debug Mode: ${debug ? "Enabled" : "Disabled"}`);
    console.log(`Simulate Mode: ${simulate ? "Enabled" : "Disabled"}`);
    console.log(`Dry Run Mode: ${dryRun ? "Enabled" : "Disabled"}`);
    console.log("");
    console.log("Network Settings:");
    console.log("=================");
    console.log(`Algod Server: ${options.algodServer || "Using default for " + network}`);
    console.log(`Algod Port: ${options.algodPort || "Using default for " + network}`);
    console.log(`Indexer Server: ${options.indexerServer || "Using default for " + network}`);
    console.log(`Indexer Port: ${options.indexerPort || "Using default for " + network}`);
    console.log("");
    console.log("Environment Variables:");
    console.log("=====================");
    console.log(`MN: ${process.env.MN ? "Set" : "Not set"}`);
    console.log(`ALGOD_SERVER: ${process.env.ALGOD_SERVER || "Not set"}`);
    console.log(`ALGOD_PORT: ${process.env.ALGOD_PORT || "Not set"}`);
    console.log(`INDEXER_SERVER: ${process.env.INDEXER_SERVER || "Not set"}`);
    console.log(`INDEXER_PORT: ${process.env.INDEXER_PORT || "Not set"}`);
});
// Test network command to verify connectivity
program
    .command("test-network")
    .description("Test network connectivity and configuration")
    .action(async () => {
    try {
        const { algodClient, indexerClient } = getCurrentClients();
        const config = getCurrentNetworkConfig();
        console.log("Testing network configuration...");
        console.log("================================");
        console.log("Configuration:", config);
        console.log("");
        // Test algod connection
        console.log("Testing Algod connection...");
        const status = await algodClient.status().do();
        console.log("✓ Algod connected successfully");
        console.log("  Last round:", status["last-round"]);
        console.log("  Time since last round:", status["time-since-last-round"]);
        console.log("");
        // Test indexer connection
        console.log("Testing Indexer connection...");
        const health = await indexerClient.makeHealthCheck().do();
        console.log("✓ Indexer connected successfully");
        console.log("  Health:", health);
        console.log("");
        console.log("Network test completed successfully!");
    }
    catch (error) {
        console.error("Network test failed:", error);
        process.exit(1);
    }
});
// Help command to show all available commands
program
    .command("help")
    .description("Show detailed help for all commands")
    .action(() => {
    console.log("5Reel CLI - Available Commands");
    console.log("================================");
    console.log("");
    console.log("Global Options:");
    console.log("  -n, --network <string>     Specify network (devnet, testnet, mainnet)");
    console.log("  --algod-server <string>    Override Algorand node server URL");
    console.log("  --algod-port <number>      Override Algorand node port");
    console.log("  --indexer-server <string>  Override Algorand indexer server URL");
    console.log("  --indexer-port <number>    Override Algorand indexer port");
    console.log("  --algod-token <string>     Override Algorand node token");
    console.log("  --indexer-token <string>   Override Algorand indexer token");
    console.log("  -d, --debug                Enable debug mode");
    console.log("  -s, --simulate             Simulate transactions without sending");
    console.log("  --dry-run                  Show what would be done without executing");
    console.log("  -V, --version              Show version information");
    console.log("  -h, --help                 Show help information");
    console.log("");
    console.log("Commands:");
    console.log("  config                     Show current configuration and network settings");
    console.log("  test-network                Test network connectivity and configuration");
    console.log("  deploy                     Deploy a specific contract type");
    console.log("  spin                       Execute a slot machine spin");
    console.log("  bootstrap                  Bootstrap a contract");
    console.log("  get-owner                  Get contract owner");
    console.log("  ybt-deposit                Deposit to yield bearing token");
    console.log("  ybt-withdraw               Withdraw from yield bearing token");
    console.log("  set-yield-bearing-source   Set yield bearing source");
    console.log("  transfer-ownership         Transfer contract ownership");
    console.log("  pay                        Send payment transaction");
    console.log("  post-update                Post update to contract");
    console.log("  set-name                   Set yield bearing token name");
    console.log("  set-symbol                 Set yield bearing token symbol");
    console.log("  ybt-revoke-yield-bearing-source  Revoke yield bearing source");
    console.log("  get-balances               Get bank manager balances");
    console.log("  sync-balance               Sync bank manager balance");
    console.log("");
    console.log("Examples:");
    console.log("  # Deploy to testnet with debug mode");
    console.log('  5reel -n testnet -d deploy -t SlotMachine --name "MySlotMachine"');
    console.log("");
    console.log("  # Simulate a spin without sending transaction");
    console.log("  5reel -s spin -a 123 -b 1000 -m 19 -i 0");
    console.log("");
    console.log("  # Show current configuration");
    console.log("  5reel config");
});
const { MN } = process.env;
export const acc = algosdk.mnemonicToSecretKey(MN || "");
export const { addr, sk } = acc;
export const addressses = {
    deployer: addr,
};
export const sks = {
    deployer: sk,
};
// Debug: Log account info if MN is set
if (MN) {
    console.log("Mnemonic loaded, deployer address:", addr);
}
else {
    console.warn("No mnemonic (MN) found in environment variables");
}
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
// const ALGO_PORT = 443;
// const ALGO_INDEXER_SERVER = "https://mainnet-idx.voi.nodely.dev";
// const ALGO_INDEXER_PORT = 443;
// Function to get current network configuration
const getCurrentNetworkConfig = () => {
    const globalOptions = globalThis.CURRENT_NETWORK_OPTIONS;
    if (!globalOptions) {
        console.log("No global options found, using default devnet configuration");
        return {
            server: ALGO_SERVER,
            port: ALGO_PORT,
            indexerServer: ALGO_INDEXER_SERVER,
            indexerPort: ALGO_INDEXER_PORT,
            token: process.env.ALGOD_TOKEN ||
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            indexerToken: process.env.INDEXER_TOKEN || "",
        };
    }
    console.log("Global options found:", globalOptions);
    const config = {
        server: globalOptions.algodServer ||
            globalThis.ALGO_SERVER ||
            ALGO_SERVER,
        port: globalOptions.algodPort || globalThis.ALGO_PORT || ALGO_PORT,
        indexerServer: globalOptions.indexerServer ||
            globalThis.ALGO_INDEXER_SERVER ||
            ALGO_INDEXER_SERVER,
        indexerPort: globalOptions.indexerPort ||
            globalThis.ALGO_INDEXER_PORT ||
            ALGO_INDEXER_PORT,
        token: globalOptions.algodToken ||
            process.env.ALGOD_TOKEN ||
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexerToken: globalOptions.indexerToken || process.env.INDEXER_TOKEN || "",
    };
    if (globalOptions.debug) {
        console.log("Network configuration:", config);
    }
    return config;
};
const algodServerURL = process.env.ALGOD_SERVER || ALGO_SERVER;
const algodServerPort = process.env.ALGOD_PORT || ALGO_PORT;
export const algodClient = new algosdk.Algodv2(process.env.ALGOD_TOKEN ||
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", algodServerURL, algodServerPort);
const indexerServerURL = process.env.INDEXER_SERVER || ALGO_INDEXER_SERVER;
const indexerServerPort = process.env.INDEXER_PORT || ALGO_INDEXER_PORT;
export const indexerClient = new algosdk.Indexer(process.env.INDEXER_TOKEN || "", indexerServerURL, indexerServerPort);
// Function to get current clients with updated configuration
export const getCurrentClients = () => {
    const config = getCurrentNetworkConfig();
    const algodClient = new algosdk.Algodv2(config.token, config.server, config.port);
    const indexerClient = new algosdk.Indexer(config.indexerToken, config.indexerServer, config.indexerPort);
    return { algodClient, indexerClient };
};
const makeSpec = (methods) => {
    return {
        name: "",
        desc: "",
        methods,
        events: [],
    };
};
const signSendAndConfirm = async (txns, sk) => {
    const { algodClient: currentAlgodClient } = getCurrentClients();
    const stxns = txns
        .map((t) => new Uint8Array(Buffer.from(t, "base64")))
        .map((t) => {
        const txn = algosdk.decodeUnsignedTransaction(t);
        return txn;
    })
        .map((t) => algosdk.signTransaction(t, sk));
    const res = await currentAlgodClient
        .sendRawTransaction(stxns.map((txn) => txn.blob))
        .do();
    console.log(res);
    return await Promise.all(stxns.map((res) => algosdk.waitForConfirmation(currentAlgodClient, res.txID, 4)));
};
export const getAccount = async () => {
    const acc = algosdk.generateAccount();
    return acc;
};
export const fund = async (addr, amount) => {
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
export const getAccountBalance = async (addr) => {
    const accInfo = await algodClient.accountInformation(addr).do();
    return accInfo.amount;
};
export const getStatus = async () => {
    const status = await algodClient.status().do();
    return status;
};
// indxer client helpers
export const getBlockSeed = async (block) => {
    let blockInfo;
    do {
        try {
            blockInfo = await indexerClient.lookupBlock(block).do();
        }
        catch (e) { }
        if (blockInfo?.seed) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    } while (1);
    return blockInfo?.seed;
};
const makeABI = (spec) => {
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
export const deploy = async (options) => {
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
        case "ReelManager": {
            Client = ReelManagerClient;
            break;
        }
        case "YieldBearingToken": {
            Client = YieldBearingTokenClient;
            break;
        }
    }
    const clientParams = {
        resolveBy: "creatorAndName",
        findExistingUsing: getCurrentClients().indexerClient,
        creatorAddress: acc.addr,
        name: options.name || "",
        sender: acc,
    };
    const appClient = Client
        ? new Client(clientParams, getCurrentClients().algodClient)
        : null;
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
    .requiredOption("--name <string>", "Specify contract name")
    .option("--debug", "Debug the deployment", false)
    .description("Deploy a specific contract type")
    .action(async (options) => {
    const apid = await deploy(options);
    if (!apid) {
        console.log("Failed to deploy contract");
        return;
    }
    console.log(apid);
});
export const getReels = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const get_reelsR = await ci.get_reels();
    return get_reelsR.returnValue;
};
export const getGrid = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setFee(2000);
    const get_gridR = await ci.get_grid(new Uint8Array(Buffer.from(options.seed, "base64")));
    if (options.debug) {
        console.log({ get_gridR });
    }
    return get_gridR;
};
export const getReel = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const get_reelR = await ci.get_reel(options.reelIndex);
    return get_reelR.returnValue;
};
export const getPayline = async (options) => {
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
export const getReelWindow = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const get_reel_windowR = await ci.get_reel_window(options.reel, options.index);
    return get_reel_windowR.returnValue;
};
export const getPaylines = async (options) => {
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
export const matchPayline = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setFee(2000);
    const match_paylineR = await ci.match_payline(options.grid, options.paylineIndex);
    if (options.debug) {
        console.log(match_paylineR);
    }
    return match_paylineR;
};
export const getBetClaimRound = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const get_bet_claim_roundR = await ci.get_bet_claim_round(new Uint8Array(Buffer.from(options.betKey, "hex")));
    if (get_bet_claim_roundR.success) {
        return Number(get_bet_claim_roundR.returnValue);
    }
    return 0;
};
export const invalidBetKey = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
export const spin = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const spin_costR = await ci.spin_cost();
    const spin_cost = Number(spin_costR.returnValue);
    if (options.debug)
        console.log("spin_cost", spin_cost);
    //const spin_payline_costR = await ci.spin_payline_cost();
    //const spin_payline_cost = Number(spin_payline_costR.returnValue);
    //const total_spin_payline_cost =
    //  spin_payline_cost * (options.maxPaylineIndex + 1);
    const paymentAmount = options.betAmount * (options.maxPaylineIndex + 1) + spin_cost; //+
    //total_spin_payline_cost;
    ci.setPaymentAmount(paymentAmount);
    ci.setEnableRawBytes(true);
    const spinR = await ci.spin(options.betAmount, options.maxPaylineIndex, options.index);
    if (options.debug) {
        console.log({ spinR });
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
    .action(async (options) => {
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
        const simulatedMatchPayline = simulateGridPaylineMatch(getBetGridR.returnValue, paylines[j]);
        console.log({ simulatedMatchPayline });
        const matchPaylineR = await matchPayline({
            appId,
            grid: new Uint8Array(Buffer.from(getBetGridR.returnValue)),
            paylineIndex: j,
            ...acc,
        });
        const [matchesBN, initialSymbolBN] = matchPaylineR.returnValue;
        console.log("matches", Number(matchesBN), "initialSymbol", String.fromCharCode(initialSymbolBN));
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
        const matchPaylineR = simulateGridPaylineMatch(getBetGridR.returnValue, payline);
        if (matchPaylineR.matches >= 3) {
            console.log(i++, matchPaylineR);
        }
    }
});
export const getBetGrid = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setFee(5000);
    ci.setEnableParamsLastRoundMod(true);
    const get_bet_gridR = await ci.get_bet_grid(new Uint8Array(Buffer.from(options.betKey, "hex")));
    if (options.debug) {
        console.log(get_bet_gridR);
    }
    return get_bet_gridR;
};
export const getPayoutMultiplier = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const get_payout_multiplierR = await ci.get_payout_multiplier(new Uint8Array(Buffer.from(options.symbol))[0], options.count);
    return get_payout_multiplierR;
};
// simulate reel window
export const simulateReelWindow = (reel, index) => {
    const reelArray = reel.split("");
    const reelWindow = [];
    for (let i = 0; i < 3; i++) {
        const wrappedIndex = (index + i) % reelArray.length;
        reelWindow.push(reelArray[wrappedIndex]);
    }
    return reelWindow.join("");
};
// simulate grid payline match
export const simulateGridPaylineMatch = (grid, payline, payoutMultipliers) => {
    // grid is 5 x 3 grid of symbols
    // payline is 5 numbers
    // each number an index in the grid column
    const gridArray = grid.split("");
    // split into columns of 3
    const columns = [];
    for (let i = 0; i < gridArray.length; i += 3) {
        columns.push(gridArray.slice(i, i + 3));
    }
    // get symbols along the payline
    const paylineSymbols = payline.map((rowIndex, colIndex) => columns[colIndex][rowIndex]);
    // Check if first symbol is wildcard
    if (paylineSymbols[0] === "_") {
        return { matches: 0, initialSymbol: "_" };
    }
    // Count occurrences of each symbol
    const symbolCounts = {};
    for (let i = 0; i < paylineSymbols.length; i++) {
        if (paylineSymbols[i] === "_")
            continue; // Skip wildcards
        const currentSymbol = paylineSymbols[i];
        symbolCounts[currentSymbol] = (symbolCounts[currentSymbol] || 0) + 1;
    }
    // Find the symbol with highest payout value
    let bestMatches = 0;
    let bestSymbol = "";
    let bestPayout = 0;
    for (const [symbol, count] of Object.entries(symbolCounts)) {
        if (count < 3)
            continue; // Need at least 3 matches for payout
        const symbolMultiplier = payoutMultipliers?.[symbol] || 1;
        const payout = count * symbolMultiplier;
        if (payout > bestPayout) {
            bestPayout = payout;
            bestMatches = count;
            bestSymbol = symbol;
        }
    }
    // return the symbol with highest payout and the count
    return { matches: bestMatches, initialSymbol: bestSymbol };
};
export const simulateGridPaylineSymbols = (grid, payline) => {
    const gridArray = grid.split("");
    const paylineSymbols = payline.map((rowIndex, colIndex) => gridArray[colIndex * 3 + rowIndex]);
    const paylineSymbolsArray = paylineSymbols.map((symbol) => new Uint8Array(Buffer.from(symbol)));
    const paylineSymbolsString = paylineSymbolsArray.map((symbol) => String.fromCharCode(symbol[0]));
    return paylineSymbolsString.join("");
};
// Display the grid in a readable format ie 5 x 3 grid
// Display the grid in a readable format ie 5 x 3 grid
// from C0_0 C0_1 C0_2 C1_0 C1_1 C1_2 C2_0 C2_1 C2_2 C3_0 C3_1 C3_2 C4_0 C4_1 C4_2
// to
// C0_0 C1_0 C2_0 C3_0 C4_0
// C0_1 C1_1 C2_1 C3_1 C4_1
// C0_2 C1_2 C2_2 C3_2 C4_2
export const displayGrid = (grid) => {
    const row1 = grid[0] + grid[3] + grid[6] + grid[9] + grid[12];
    const row2 = grid[1] + grid[4] + grid[7] + grid[10] + grid[13];
    const row3 = grid[2] + grid[5] + grid[8] + grid[11] + grid[14];
    return [row1, row2, row3].join("\n");
};
// generate random 32 byte seed
export const generateSeed = () => {
    return crypto.randomBytes(32);
};
export const touch = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const appClient = new BeaconClient({
        resolveBy: "id",
        id: Number(options.appId),
        sender: acc,
    }, getCurrentClients().algodClient);
    const txn = await appClient.touch({});
    if (options.debug) {
        console.log(txn);
    }
    return txn;
};
export const deposit = async (options) => {
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
export const withdraw = async (options) => {
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
export const bootstrap = async (options) => {
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
    .action(async (options) => {
    const success = await bootstrap({
        ...options,
        appId: Number(options.appId),
    });
    if (!success) {
        console.log("Failed to bootstrap");
    }
});
export const getOwner = async (options) => {
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
    .action(async (options) => {
    const owner = await getOwner({
        ...options,
        appId: Number(options.appId),
    });
    console.log(owner);
});
export const bootstrapCost = async (options) => {
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
export const ybtDeposit = async (options) => {
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
    const paymentAmount = Number(options.amount) + Number(ybt_deposit_cost);
    console.log("options.amount", options.amount);
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
    .action(async (options) => {
    const success = await ybtDeposit({
        ...options,
        appId: Number(options.appId),
    });
    if (!success) {
        console.log("Failed to deposit ybt");
    }
});
export const ybtWithdraw = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(7000);
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
    .action(async (options) => {
    const success = await ybtWithdraw({
        ...options,
        appId: Number(options.appId),
        amount: Number(options.amount),
    });
    if (!success) {
        console.log("Failed to withdraw ybt");
    }
});
export const setYieldBearingSource = async (options) => {
    if (options.debug) {
        console.log(options);
    }
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(2000);
    const set_yield_bearing_sourceR = await ci.set_yield_bearing_source(options.source);
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
    .action(async (options) => {
    const success = await setYieldBearingSource({
        ...options,
        appId: Number(options.appId),
        source: Number(options.source),
    });
    if (!success) {
        console.log("Failed to set yield bearing source");
    }
});
export const arc200Name = async (options) => {
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
export const arc200Symbol = async (options) => {
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
export const arc200Decimals = async (options) => {
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
export const arc200BalanceOf = async (options) => {
    const addr = options.sender || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    const balanceOfR = await ci.arc200_balanceOf(options.address);
    return balanceOfR.returnValue;
};
export const transferOwnership = async (options) => {
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
    .action(async (options) => {
    const success = await transferOwnership({
        ...options,
        appId: Number(options.appId),
    });
    if (!success) {
        console.log("Failed to transfer ownership");
    }
});
export const payment = async (options) => {
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
    .action(async (options) => {
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
export const arc200TotalSupply = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    const totalSupplyR = await ci.arc200_totalSupply();
    return totalSupplyR.returnValue;
};
export const arc200PostUpdate = async (options) => {
    try {
        console.log("=== arc200PostUpdate START ===");
        if (options.debug) {
            console.log("PostUpdateOptions:", options);
        }
        // Validate app ID
        const appId = Number(options.apid);
        if (isNaN(appId) || appId <= 0) {
            console.error("Invalid app ID:", options.apid);
            return false;
        }
        const addr = options?.addr || addressses.deployer;
        const sk = options?.sk || sks.deployer;
        const acc = { addr, sk };
        if (options.debug) {
            console.log("App ID:", appId);
            console.log("Address:", addr);
        }
        console.log("Creating contract instance...");
        const ci = makeContract(appId, YieldBearingTokenAppSpec, acc);
        console.log("Contract instance created successfully");
        ci.setFee(2000);
        console.log("Fee set to 2000");
        if (options.debug) {
            console.log("Calling post_update...");
        }
        console.log("About to call ci.post_update()...");
        const postUpdateR = await ci.post_update();
        console.log("post_update() call completed");
        if (options.debug) {
            console.log("post_update result:", postUpdateR);
        }
        if (postUpdateR.success) {
            console.log("post_update was successful");
            if (!options.simulate) {
                if (options.debug) {
                    console.log("Executing transaction (not simulating)...");
                }
                await signSendAndConfirm(postUpdateR.txns, sk);
                if (options.debug) {
                    console.log("Transaction confirmed");
                }
            }
            else {
                if (options.debug) {
                    console.log("Simulation mode - skipping transaction execution");
                }
            }
        }
        else {
            console.log("post_update failed:", postUpdateR);
        }
        console.log("=== arc200PostUpdate END ===");
        return postUpdateR.success;
    }
    catch (e) {
        console.error("Error in arc200PostUpdate:", e);
        console.error("Error stack:", e instanceof Error ? e.stack : "No stack trace");
        return false; // Return false on error
    }
};
program
    .command("post-update")
    .description("Post update the contract")
    .requiredOption("-a, --apid <number>", "Specify the application ID")
    .option("--simulate", "Simulate the post update", false)
    .option("--debug", "Debug the deployment", false)
    .option("--addr <string>", "Specify the address")
    .action(async (options) => {
    try {
        console.log("Starting post-update command...");
        const success = await arc200PostUpdate({
            ...options,
            apid: Number(options.apid),
            addr: options.addr,
            sk: sks.deployer,
            debug: options.debug,
            simulate: options.simulate,
        });
        if (!success) {
            console.log("Failed to post update");
        }
        else {
            console.log("Post update completed successfully");
        }
    }
    catch (error) {
        console.error("Error in post-update command:", error);
    }
});
export const setName = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(2000);
    const setNameR = await ci.set_name(stringToUint8Array(options.name, 32));
    if (options.debug) {
        console.log(setNameR);
    }
    if (setNameR.success) {
        if (!options.simulate) {
            await signSendAndConfirm(setNameR.txns, sk);
        }
    }
    return setNameR;
};
program
    .command("set-name")
    .description("Set the name of the yield bearing token")
    .requiredOption("-a, --appId <number>", "Specify the application ID")
    .requiredOption("-n, --name <string>", "Specify the name")
    .option("-s, --sender <string>", "Specify sender")
    .option("--debug", "Debug the set-name", false)
    .option("--simulate", "Simulate the set-name", false)
    .action(async (options) => {
    const success = await setName(options);
});
export const setSymbol = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(2000);
    const setSymbolR = await ci.set_symbol(stringToUint8Array(options.symbol, 8));
    if (options.debug) {
        console.log(setSymbolR);
    }
    if (setSymbolR.success) {
        if (!options.simulate) {
            await signSendAndConfirm(setSymbolR.txns, sk);
        }
    }
    return setSymbolR;
};
program
    .command("set-symbol")
    .description("Set the symbol of the yield bearing token")
    .requiredOption("-a, --appId <number>", "Specify the application ID")
    .requiredOption("-s, --symbol <string>", "Specify the symbol")
    .option("-t, --sender <string>", "Specify sender")
    .option("--debug", "Debug the set-symbol", false)
    .option("--simulate", "Simulate the set-symbol", false)
    .action(async (options) => {
    const success = await setSymbol(options);
});
export const ybtRevokeYieldBearingSource = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(2000);
    const revokeYieldBearingSourceR = await ci.revoke_yield_bearing_source(options.newOwner);
    if (options.debug) {
        console.log(revokeYieldBearingSourceR);
    }
    if (revokeYieldBearingSourceR.success) {
        if (!options.simulate) {
            await signSendAndConfirm(revokeYieldBearingSourceR.txns, sk);
        }
    }
    return revokeYieldBearingSourceR;
};
program
    .command("ybt-revoke-yield-bearing-source")
    .description("Revoke the yield bearing source")
    .requiredOption("-a, --appId <number>", "Specify the application ID")
    .requiredOption("-n, --newOwner <string>", "Specify the new owner")
    .option("-s, --sender <string>", "Specify sender")
    .option("--debug", "Debug the ybt-revoke-yield-bearing-source", false)
    .option("--simulate", "Simulate the ybt-revoke-yield-bearing-source", false)
    .action(async (options) => {
    const success = await ybtRevokeYieldBearingSource(options);
});
export const getGridPaylineSymbols = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    const getGridPaylineSymbolsR = await ci.get_grid_payline_symbols(options.grid, options.paylineIndex);
    if (options.debug) {
        console.log(getGridPaylineSymbolsR);
    }
    return getGridPaylineSymbolsR.returnValue;
};
export const ybtGetMaxWithdrawableAmount = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    ci.setFee(7000);
    const getMaxWithdrawableAmountR = await ci.get_max_withdrawable_amount(options.address);
    if (options.debug) {
        console.log(getMaxWithdrawableAmountR);
    }
    return getMaxWithdrawableAmountR.returnValue;
};
export const getBetKey = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setEnableRawBytes(true);
    ci.setFee(7000); // TODO set to appropriate amount
    const getBetKeyR = await ci.get_bet_key(options.address, options.amount, options.maxPaylineIndex, options.index);
    if (options.debug) {
        console.log(getBetKeyR);
    }
    if (getBetKeyR.success) {
        return Buffer.from(getBetKeyR.returnValue).toString("base64");
    }
    return "";
};
export const getSeedBetGrid = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setEnableRawBytes(true);
    ci.setFee(7000); // TODO set to appropriate amount
    const getBetKeyR = await ci.get_seed_bet_grid(new Uint8Array(Buffer.from(options.seed, "base64")), new Uint8Array(Buffer.from(options.betKey, "base64")));
    if (options.debug) {
        console.log(getBetKeyR);
    }
    if (getBetKeyR.success) {
        return Buffer.from(getBetKeyR.returnValue).toString("utf-8");
    }
    return "";
};
export const getSlot = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setEnableRawBytes(true);
    ci.setFee(7000); // TODO set to appropriate amount
    const getSlotR = await ci.get_slot(options.reel, options.index);
    if (options.debug) {
        console.log(getSlotR);
    }
    if (getSlotR.success) {
        return Buffer.from(getSlotR.returnValue).toString("utf-8");
    }
    return "";
};
export const ybtGetDepositCost = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, YieldBearingTokenAppSpec, acc);
    const getDepositCostR = await ci.deposit_cost();
    if (options.debug) {
        console.log(getDepositCostR);
    }
    return getDepositCostR.returnValue;
};
// bankman
const decodeBalances = (balances) => {
    return {
        balanceAvailable: new BigNumber(balances[0]).div(1e6).toNumber(),
        balanceTotal: new BigNumber(balances[1]).div(1e6).toNumber(),
        balanceLocked: new BigNumber(balances[2]).div(1e6).toNumber(),
        //balanceFuse: Boolean(balances[3]),
    };
};
export const getBalances = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, BankManagerAppSpec, acc);
    const getBalancesR = await ci.get_balances();
    if (options.debug) {
        console.log(getBalancesR);
    }
    return decodeBalances(getBalancesR.returnValue);
};
program
    .command("get-balances")
    .description("Get the balances of the bank manager")
    .requiredOption("-a, --appId <number>", "Specify the application ID")
    .option("-s, --addr <string>", "Specify sender")
    .option("--debug", "Debug the get-balances", false)
    .action(async (options) => {
    const balances = await getBalances({
        ...options,
        appId: Number(options.appId),
    });
    console.log(balances);
});
export const claim = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, SlotMachineAppSpec, acc);
    ci.setFee(32000);
    ci.setEnableParamsLastRoundMod(true);
    const claimR = await ci.claim(new Uint8Array(Buffer.from(options.betKey, "hex")));
    if (options.debug) {
        console.log({ claimR });
    }
    if (claimR.success) {
        if (!options.simulate) {
            await signSendAndConfirm(claimR.txns, sk);
        }
    }
    return claimR;
};
export const syncBalance = async (options) => {
    const addr = options.addr || addressses.deployer;
    const sk = options.sk || sks.deployer;
    const acc = { addr, sk };
    const ci = makeContract(options.appId, BankManagerAppSpec, acc);
    const syncBalanceR = await ci.sync_balance();
    if (options.debug) {
        console.log(syncBalanceR);
    }
    if (syncBalanceR.success) {
        if (!options.simulate) {
            await signSendAndConfirm(syncBalanceR.txns, sk);
        }
    }
    return syncBalanceR;
};
program
    .command("sync-balance")
    .description("Sync the balance of the bank manager")
    .requiredOption("-a, --appId <number>", "Specify the application ID")
    .option("-s, --addr <string>", "Specify sender")
    .option("--debug", "Debug the sync-balance", false)
    .option("--simulate", "Simulate the sync-balance", false)
    .action(async (options) => {
    const syncBalanceR = await syncBalance({
        ...options,
        appId: Number(options.appId),
        addr: options.addr,
        simulate: options.simulate,
        debug: options.debug,
    });
    console.log(syncBalanceR);
});
// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
    program.parse();
}
