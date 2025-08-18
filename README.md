# Getting Started

This is a lightweight repo to get started with building AVM smart contracts, testing them and deploying them.

Ensure you have the following installed:
  - [node](https://nodejs.org/en/download/)
  - [algokit](https://developer.algorand.org/docs/get-started/algokit/)
    - Algokit will have prerequestites that need to be installed too.

# Development

Edit the `contract.py` file to implement your desired contract using Python.

You can add other files and import them in the `contract.py` file as necessary.

# Compilation

1. Edit `generate_clients.sh`.
  - Update `artifacts` to match your contract name(s).
  - E.g. local artifacts=("HelloWorld")
  - E.g. local artifacts=("HelloWorld" "OtherContract" "AnotherContract")
2. In root directory run `source commands.sh`
3. In root directory run `build-all`
  - This will compile the contracts and put the teal and json files in the `artifacts` folder.
  - This will put the interface ts files into the `src/scripts/clients` folder.
4. To just re-compile the contracts you can use `build-artifacts`.

# Testing

## Environment

You can test on either testnet or your local devnet.

It's a matter of updating the deploy options as outlined in the [Deployment](#deployment) section.

If you opt to use devnet you will need to spin up the local devnet first with `algokit localnet start`

Once running you can check the status at the following link:
  - https://lora.algokit.io/localnet

From there you can fund your testing account with tokens via the interface.

## Run Tests

1. Run `mocha` in root directory.

# Deployment

Update `command.ts` to match contract name(s). This file is a helper to deploy your compiled contracts to the network set in the file itself.

1. Set your mnemonic in the `src/scripts/.env` file.
2. Update the import statement starting on line 2 for your contract.
3. DeployType to match your contract name(s).
  - E.g. type DeployType = "HelloWorld";
  - E.g. type DeployType = "HelloWorld" | "OtherContract" | "AnotherContract";
4. options.type switch statement to match your contract name(s).
  - Ensure the case matches your DeployTypes in the previous step and you return the correct Client for your contract from the import statement in the first step.
5. If you get lint errrors for `algoClient` and `deploy` you can ignore.
6. To change network you deploy to change the `ALGO_SERVER` and `ALGO_INDEXER_SERVER` variables.
7. Run `npm i` in the `scripts` directory.
8. Run `npx tsc` in the `scripts` directory.
9. In the root directory run `cli deploy -t <contract name> -n <contract name>`
  - E.g. `cli deploy -t HelloWorld -n HelloWorld`
  - E.g. `cli deploy -t HelloWorld -n AnotherContract`
  - E.g. `cli deploy -t HelloWorld -n OtherContract`



