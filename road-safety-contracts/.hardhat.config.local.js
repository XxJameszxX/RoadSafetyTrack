require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
    },
  },
};
