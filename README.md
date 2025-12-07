# RoadSafetyTrack - Privacy-Preserving Driving Safety Score DApp

A privacy-preserving driving safety score on-chain DApp based on FHEVM fully homomorphic encryption technology.

## Project Structure

```
action/
├── road-safety-contracts/    # Smart contract project
└── road-safety-frontend/     # Frontend project
```

## Quick Start

### 1. Install Dependencies

#### Contract Project
```bash
cd road-safety-contracts
npm install
```

#### Frontend Project
```bash
cd road-safety-frontend
npm install
```

### 2. Local Development (Mock Mode)

#### Start Hardhat Node
```bash
cd road-safety-contracts
npx hardhat node --verbose
```

#### Deploy Contract
```bash
# In another terminal
cd road-safety-contracts
npx hardhat deploy --network localhost
```

#### Generate ABI
```bash
cd road-safety-frontend
npm run genabi
```

#### Start Frontend (Mock Mode)
```bash
cd road-safety-frontend
npm run dev:mock
```

The frontend will automatically detect the local Hardhat node and use a Mock FHEVM instance.

### 3. Testnet Deployment (Relayer Mode)

#### Deploy to Sepolia
```bash
cd road-safety-contracts
npx hardhat deploy --network sepolia
```

#### Generate ABI (Including Sepolia Address)
```bash
cd road-safety-frontend
npm run genabi
```

#### Start Frontend (Relayer Mode)
```bash
cd road-safety-frontend
npm run dev
```

The frontend will use `@zama-fhe/relayer-sdk` to interact with the Sepolia testnet.

## Tech Stack

### Contracts
- **Solidity**: ^0.8.27
- **FHEVM**: @fhevm/solidity ^0.9.1
- **Hardhat**: ^2.26.0
- **@fhevm/hardhat-plugin**: ^0.3.0-1

### Frontend
- **React**: ^18.3.1
- **Vite**: ^5.3.1
- **TypeScript**: ^5.5.3
- **Tailwind CSS**: ^3.4.4
- **@zama-fhe/relayer-sdk**: 0.3.0-5
- **@fhevm/mock-utils**: 0.3.0-1

## Core Features

1. **Encrypted Score Submission**: Encrypt driving safety scores (0-100) using FHEVM
2. **Trend Analysis**: Calculate improvement/decline trends in encrypted state
3. **Average Statistics**: Accumulate encrypted scores and calculate averages
4. **Consecutive Days Tracking**: Record consecutive safe driving days
5. **Data Visualization**: Score trend charts and mileage distribution statistics
6. **History Records**: View all submitted records (encrypted storage)

## ✨ Brand New Multi-Page UI

The frontend features a modern design with 4 core pages:
- 📊 **Dashboard**: Key data overview and quick actions
- 📝 **Submit Score**: Interactive score submission interface
- 📜 **History**: View and decrypt historical scores
- 📈 **Trend Analysis**: Data visualization charts and intelligent insights

For detailed information, see [UI_UPGRADE.md](./road-safety-frontend/UI_UPGRADE.md)

## Contract Interface

### RoadSafetyTrack.sol

- `submitScore(encScore, inputProof, mileageLevel)`: Submit encrypted score
- `getTrend(user)`: Get trend difference (encrypted)
- `getAverageData(user)`: Get accumulated value and count
- `getLatestRecord(user)`: Get latest record
- `getUserStats(user)`: Get user statistics

## Important Notes

1. **Local Development**: Ensure Hardhat node is running on `http://localhost:8545`
2. **Testnet**: Requires `INFURA_API_KEY` and `MNEMONIC` configuration
3. **ABI Generation**: Need to regenerate ABI after each contract deployment
4. **Wallet Connection**: Requires MetaMask or other EIP-1193 compatible wallet

## Development Commands

### Contracts
```bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run deploy:localhost  # Deploy to localhost
npm run deploy:sepolia    # Deploy to Sepolia
```

### Frontend
```bash
npm run dev         # Development mode (Relayer)
npm run dev:mock    # Development mode (Mock)
npm run build       # Build for production
npm run genabi      # Generate ABI files
```

## License

MIT
