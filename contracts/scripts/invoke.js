const hre = require("hardhat");

async function main() {
  const { MANAGER_ADDRESS, AGENT_ID, VALUE_WEI } = process.env;
  if (!MANAGER_ADDRESS) throw new Error("MANAGER_ADDRESS env var required");
  if (!AGENT_ID) throw new Error("AGENT_ID env var required");
  if (!VALUE_WEI) throw new Error("VALUE_WEI env var required (wei)");

  const manager = await hre.ethers.getContractAt(
    "AgentCallManagerWithVerify",
    MANAGER_ADDRESS
  );

  const [signer] = await hre.ethers.getSigners();
  console.log("Invoking agent", AGENT_ID, "from", signer.address, "with value", VALUE_WEI);

  const tx = await manager.invokeAgent(AGENT_ID, { value: VALUE_WEI });
  const receipt = await tx.wait();

  let invocationId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = manager.interface.parseLog(log);
      if (parsed && parsed.name === "AgentInvoked") {
        invocationId = parsed.args.invocationId;
        console.log("AgentInvoked: agentId=", parsed.args.agentId.toString(), "paid=", parsed.args.paid.toString());
      }
    } catch (e) {}
  }

  console.log("InvocationId:", invocationId ? invocationId : "<unknown>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
