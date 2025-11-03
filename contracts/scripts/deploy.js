const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AgentRegistry deployed to:", registryAddress);

  const Manager = await hre.ethers.getContractFactory("AgentCallManagerWithVerify");
  const manager = await Manager.deploy(registryAddress);
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log("AgentCallManagerWithVerify deployed to:", managerAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
