const path = require("path");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { SOMNIA_RPC_URL, PRIVATE_KEY, CHAIN_ID } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts", // only compile Solidity under ./contracts
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    somnia: {
      url: SOMNIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: CHAIN_ID ? parseInt(CHAIN_ID) : undefined,
    },
  },
};
