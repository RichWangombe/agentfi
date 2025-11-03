const hre = require("hardhat");

async function main() {
  const {
    REGISTRY_ADDRESS,
    AGENT_NAME,
    AGENT_URI,
    AGENT_FEE,
    AGENT_SIGNER,
  } = process.env;

  if (!REGISTRY_ADDRESS) throw new Error("REGISTRY_ADDRESS env var required");
  if (!AGENT_NAME) throw new Error("AGENT_NAME env var required");
  if (!AGENT_URI) throw new Error("AGENT_URI env var required");
  if (!AGENT_FEE) throw new Error("AGENT_FEE env var required (wei)");
  if (!AGENT_SIGNER) throw new Error("AGENT_SIGNER env var required");

  const registry = await hre.ethers.getContractAt("AgentRegistry", REGISTRY_ADDRESS);
  const [signer] = await hre.ethers.getSigners();
  console.log("Using signer:", signer.address);
  console.log("Registering agent:", AGENT_NAME);

  const tx = await registry.registerAgent(AGENT_NAME, AGENT_URI, AGENT_FEE, AGENT_SIGNER);
  const receipt = await tx.wait();

  let agentId = null;
  for (const ev of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog(ev);
      if (parsed && parsed.name === "AgentRegistered") {
        agentId = parsed.args.agentId.toString();
        break;
      }
    } catch (_) {}
  }

  console.log("Agent registered with ID:", agentId || "<unknown, parse failed>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
