# 5reel - Slot Machine Gaming Platform

A comprehensive slot machine gaming platform built on the Algorand blockchain using Algorand Python and the ARC4 standard. The system consists of multiple interconnected smart contracts that provide a complete gaming experience with yield-bearing token mechanics.

## 🎰 Features

- **5x3 Slot Machine Grid** with 20 paylines
- **Deterministic Outcomes** using block seeds for fair gameplay
- **Multi-Payline Betting** system with configurable bet amounts
- **Automatic Payout Calculation** based on symbol matches
- **Yield-Bearing Token (YBT)** system for profit sharing
- **Comprehensive Testing Suite** with extensive coverage
- **Modular Architecture** with upgradeable contracts
- **Advanced Token Lockup Mechanism** for financial solvency
- **Enhanced Documentation** with detailed system explanations

## 🏗️ Architecture

The system is built with a modular architecture consisting of several key components:

- **SlotMachine**: Main gaming contract that combines all functionality
- **ReelManager**: Manages slot machine reels and grid generation
- **SpinManager**: Handles betting, spinning, and payout logic
- **BankManager**: Manages contract balances and financial operations
- **YieldBearingToken**: ERC-20 compatible token with yield generation
- **Base Contracts**: Ownable, Bootstrapped, and Touchable interfaces

## 🎯 Payout System

The slot machine uses a symbol-based payout system:

| Symbol | 3-in-a-row | 4-in-a-row | 5-in-a-row |
|--------|-------------|-------------|-------------|
| A      | 200x        | 1000x       | 10000x      |
| B      | 60x         | 200x        | 1000x       |
| C      | 30x         | 100x        | 500x        |
| D      | 10x         | 55x         | 250x        |
| _      | 0x          | 0x          | 0x          |

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/en/download/)
- [Algokit](https://developer.algorand.org/docs/get-started/algokit/)
- Python 3.8+ with pip

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 5reel
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install Node.js dependencies:
```bash
cd src/scripts
npm install
```

## 🛠️ Development

### Contract Development

Edit the `src/contract.py` file to implement your desired contract using Python. The main contracts include:

- **SlotMachine**: Core gaming logic
- **YieldBearingToken**: Token mechanics
- **BankManager**: Financial operations
- **ReelManager**: Reel management
- **SpinManager**: Betting and spinning

### Compilation

1. Edit `generate_clients.sh`:
   - Update `artifacts` to match your contract name(s)
   - Example: `local artifacts=("SlotMachine" "YieldBearingToken")`

2. Build all contracts:
```bash
source commands.sh
build-all
```

This will:
- Compile the contracts and put the TEAL and JSON files in the `artifacts` folder
- Generate TypeScript interface files in `src/scripts/clients`

3. Re-compile specific contracts:
```bash
build-artifacts
```

## 🧪 Testing

### Environment Setup

You can test on either testnet or your local devnet:

- **Local Devnet**: Run `algokit localnet start` and check status at [https://lora.algokit.io/localnet](https://lora.algokit.io/localnet)
- **Testnet**: Update deployment options in `src/scripts/command.ts`

### Running Tests

1. Run all tests:
```bash
mocha
```

2. Run specific test files:
```bash
mocha src/scripts/test/contract.test.js
mocha src/scripts/test/ybt.contract.test.js
```

### Test Coverage

The project includes comprehensive test coverage for:
- Contract deployment and bootstrap
- Betting and spinning functionality
- Payout calculation and distribution
- Yield token mechanics
- Access control and security features
- Grid generation and payline matching

## 🚀 Deployment

### Configuration

1. Set your mnemonic in `src/scripts/.env`
2. Update the import statements in `src/scripts/command.ts` for your contracts
3. Update `DeployType` to match your contract names
4. Update the `options.type` switch statement
5. Configure network settings (`ALGO_SERVER`, `ALGO_INDEXER_SERVER`)

### Deployment Commands

1. Compile TypeScript:
```bash
cd src/scripts
npx tsc
```

2. Deploy contracts:
```bash
cli deploy -t <contract-name> -n <contract-name>
```

Example:
```bash
cli deploy -t SlotMachine -n SlotMachine
cli deploy -t YieldBearingToken -n YieldBearingToken
```

## 📊 Contract Costs

### Bootstrap Requirements

Each contract has specific bootstrap costs:

- **SlotMachine**: ~71,200 microAlgos
- **SpinManager**: ~26,500 microAlgos
- **BankManager**: ~17,700 microAlgos
- **Ownable**: ~17,300 microAlgos
- **YieldBearingToken**: 100,000 microAlgos

### Transaction Costs

- **Spin**: 50,500 microAlgos + 30,000 per payline
- **Claim**: 1,400 opcodes (uses OpUp)
- **Deposit**: 28,500 microAlgos (box creation)

## 🔒 Security Features

- **Access Control**: Critical functions restricted to contract owner
- **Upgradeable**: Contract can be upgraded by authorized parties
- **Fuse System**: Irreversible security controls
- **Deterministic Outcomes**: Fair gameplay using block seeds
- **Claim Round Validation**: Prevents manipulation
- **Automatic Expiration**: Unclaimed bets expire automatically

## 📚 Documentation

- **Main Documentation**: [docs/index.md](docs/index.md)
- **Yield-Bearing Token**: [docs/yield-bearing-token.md](docs/yield-bearing-token.md)
- **Token Lockup Mechanism**: [docs/token-lockup-mechanism.md](docs/token-lockup-mechanism.md)
- **API Reference**: Generated TypeScript interfaces in `src/scripts/clients`

## 🏷️ Version History

- **v0.7** (2025-08-24): Documentation overhaul, enhanced slot machine logic, and comprehensive testing improvements
- **v0.5** (2025-08-22): Treasury lock adjustment and contract versioning
- **v0.1.4** (2025-08-21): Simplified bet claiming process and contract cleanup
- **v0.1.3** (2025-08-21): Comprehensive slot machine testing and contract improvements
- **v0.1.2** (2025-08-19): Enhanced contract testing and command functionality
- **v0.1.1** (2025-08-18): Yield-bearing token documentation and testing improvements
- **v0.1.0** (2025-06-02): Initial stable release

See [CHANGELOG.md](CHANGELOG.md) for detailed version information.

## 🤝 Contributing

When contributing to this project, please follow the conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Features in Development

- Additional payline patterns
- Progressive jackpot system
- Tournament functionality
- Cross-chain compatibility
- Enhanced yield distribution models
- Advanced analytics and reporting tools

---

**5reel** - Bringing blockchain gaming to the next level with Algorand technology.



