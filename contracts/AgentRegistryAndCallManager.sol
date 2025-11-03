// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/*
  AgentRegistryAndCallManager.sol

  - AgentRegistry: register agents, set per-agent signer address for off-chain router verification
  - AgentCallManagerWithVerify: simple invoke -> escrow -> confirmResult(signed) -> payout flow

  NOTE: This is a demonstration-level contract for hackathon/testnet use.
  Do NOT use in production without full audits, tests, timelocks, and additional access control.
*/

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract AgentRegistry {
    using ECDSA for bytes32;

    address public owner;
    uint256 public nextAgentId;

    struct Agent {
        uint256 id;
        address owner;
        string name;
        string metadataURI; // e.g., ipfs://...
        uint256 fee; // invocation fee in wei
        bool active;
        address signer; // off-chain signer address allowed to confirm results
    }

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name);
    event AgentUpdated(uint256 indexed agentId);
    event AgentSignerSet(uint256 indexed agentId, address indexed signer);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(agents[agentId].owner == msg.sender, "not agent owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextAgentId = 1; // start ids at 1 for readability
    }

    function registerAgent(string calldata name, string calldata metadataURI, uint256 fee, address signer) external returns (uint256) {
        uint256 agentId = nextAgentId;
        nextAgentId += 1;

        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            name: name,
            metadataURI: metadataURI,
            fee: fee,
            active: true,
            signer: signer
        });

        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, name);
        emit AgentSignerSet(agentId, signer);
        return agentId;
    }

    function setMetadata(uint256 agentId, string calldata metadataURI) external onlyAgentOwner(agentId) {
        agents[agentId].metadataURI = metadataURI;
        emit AgentUpdated(agentId);
    }

    function setFee(uint256 agentId, uint256 fee) external onlyAgentOwner(agentId) {
        agents[agentId].fee = fee;
        emit AgentUpdated(agentId);
    }

    function setActive(uint256 agentId, bool active) external onlyAgentOwner(agentId) {
        agents[agentId].active = active;
        emit AgentUpdated(agentId);
    }

    function setSigner(uint256 agentId, address signer) external onlyAgentOwner(agentId) {
        agents[agentId].signer = signer;
        emit AgentSignerSet(agentId, signer);
    }

    // Admin function — emergency or platform-level changes
    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}

/*
  AgentCallManagerWithVerify

  Flow:
   - invokeAgent: caller pays >= agent.fee, funds go into pendingPayouts[agentId], emits AgentInvoked with invocationId
   - off-chain router watches AgentInvoked, runs LLM, stores result (resultURI/resultHash), signs (agentId, invocationId, resultHash, nonce, chainId)
   - router calls confirmResult(...) passing signature; contract verifies signature matches agent.signer
   - on success, contract marks result consumed, pays out pending funds to agent owner (can extend to revenue split)
*/

contract AgentCallManagerWithVerify {
    using ECDSA for bytes32;

    AgentRegistry public registry;
    address public admin; // platform admin (for small ops)
    uint256 public chainIdCached;

    mapping(uint256 => uint256) public pendingPayouts; // agentId => wei
    mapping(bytes32 => bool) public resultConsumed; // keyed by keccak(agentId, invocationId, resultHash, nonce)

    // Track invocation existence if you want to persist invocations mapping
    mapping(bytes32 => bool) public invocationExists; // keyed by invocationId

    event AgentInvoked(uint256 indexed agentId, address indexed caller, uint256 paid, bytes32 indexed invocationId);
    event ResultConfirmed(uint256 indexed agentId, bytes32 indexed invocationId, bytes32 resultHash, address indexed signer);
    event PayoutReleased(uint256 indexed agentId, address indexed to, uint256 amount);

    constructor(address registryAddress) {
        registry = AgentRegistry(registryAddress);
        admin = msg.sender;
        chainIdCached = block.chainid;
    }

    receive() external payable {}

    // For demo simplicity: invoke creates an invocationId and escrow the funds.
    // In production you'd pass structured input, store invocation metadata off-chain, and/or use more strict invocations.
    function invokeAgent(uint256 agentId) external payable returns (bytes32) {
        AgentRegistry.Agent memory a = registry.agents(agentId);
        require(a.active, "agent inactive");
        require(msg.value >= a.fee, "insufficient fee");

        // create a unique invocationId
        bytes32 invocationId = keccak256(abi.encodePacked(agentId, msg.sender, block.timestamp, block.number));
        invocationExists[invocationId] = true;

        pendingPayouts[agentId] += msg.value;

        emit AgentInvoked(agentId, msg.sender, msg.value, invocationId);
        return invocationId;
    }

    // Caller: off-chain router that has signed result
    // Parameters must match what off-chain signer signs:
    //   message = keccak256(agentId, invocationId, resultHash, nonce, chainId)
    function confirmResult(
        uint256 agentId,
        bytes32 invocationId,
        bytes32 resultHash,
        uint256 nonce,
        bytes memory signature
    ) external {
        // check invocation exists
        require(invocationExists[invocationId], "invocation unknown");

        // prevent replay by keying with these items
        bytes32 consumedKey = keccak256(abi.encodePacked(agentId, invocationId, resultHash, nonce));
        require(!resultConsumed[consumedKey], "result consumed");

        // recover signer
        bytes32 message = keccak256(abi.encodePacked(agentId, invocationId, resultHash, nonce, block.chainid));
        bytes32 ethSignedMessageHash = message.toEthSignedMessageHash();
        address recovered = ethSignedMessageHash.recover(signature);

        // get expected signer from registry
        AgentRegistry.Agent memory a = registry.agents(agentId);
        require(a.signer != address(0), "agent signer not set");
        require(recovered == a.signer, "invalid signature");

        // mark consumed
        resultConsumed[consumedKey] = true;

        // release full pending payout to agent owner (simple model)
        uint256 amount = pendingPayouts[agentId];
        require(amount > 0, "no funds");
        pendingPayouts[agentId] = 0;

        address payable recipient = payable(a.owner);
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "transfer failed");

        emit ResultConfirmed(agentId, invocationId, resultHash, recovered);
        emit PayoutReleased(agentId, recipient, amount);
    }

    // Basic admin functions for maintenance (not production hardened)
    function setAdmin(address newAdmin) external {
        require(msg.sender == admin, "not admin");
        admin = newAdmin;
    }

    // in case funds are stuck, admin can withdraw (for demo only)
    function adminWithdraw(address payable to, uint256 amount) external {
        require(msg.sender == admin, "not admin");
        to.transfer(amount);
    }
}
