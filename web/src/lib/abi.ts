export const AGENT_REGISTRY_ABI = [
  'function agents(uint256) view returns (uint256 id, address owner, string memory name, string memory uri, uint256 fee, bool active, address signer)',
  'function agentSigner(uint256 agentId) view returns (address)',
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string uri, uint256 fee)',
  'event AgentSignerSet(uint256 indexed agentId, address indexed signer)',
] as const;

export const AGENT_CALL_MANAGER_ABI = [
  'function invokeAgent(uint256 agentId) payable returns (bytes32)',
  'function confirmResult(bytes32 invocationId, string calldata resultURI, bytes calldata signature) external',
  'event AgentInvoked(bytes32 indexed invocationId, uint256 indexed agentId, address indexed caller, uint256 value)',
  'event ResultConfirmed(bytes32 indexed invocationId, uint256 indexed agentId, string resultURI)',
] as const;
