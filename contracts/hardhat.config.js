require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config({ path: `.env.${process.env.NETWORK || 'sepolia'}` });

const { RPC_URL, PRIVATE_KEY, CHAIN_ID } = process.env;

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    sepolia: {
      url: RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com", // Using publicnode.com as it worked in your test
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: CHAIN_ID ? parseInt(CHAIN_ID) : 11155111,
      httpHeaders: {
        "Content-Type": "application/json"
      },
      timeout: 120000 // 120 seconds
    },
    somnia: {
      url: "https://dream-rpc.somnia.network/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 5031,
      httpHeaders: {
        "Content-Type": "application/json"
      },
      timeout: 120000
    }
  }
};