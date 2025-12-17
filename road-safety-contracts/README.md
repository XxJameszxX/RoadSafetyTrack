# RoadSafetyTrack Contracts

FHEVM smart contract project

## Installation

```bash
npm install
```

## Compile

```bash
npm run compile
```

## Test

```bash
npm run test
```

## Deploy

### Local Network
```bash
npx hardhat deploy --network localhost
```

### Sepolia Testnet
```bash
npx hardhat deploy --network sepolia
```

## Environment Variables

Use Hardhat vars to manage sensitive information:

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY
```
