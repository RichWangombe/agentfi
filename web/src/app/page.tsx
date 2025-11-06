"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { parseEther, formatEther } from "viem";

const TARGET_CHAIN_ID = 11155111; // Sepolia
const MANAGER_ADDRESS = process.env.NEXT_PUBLIC_MANAGER_ADDRESS as `0x${string}`;

export default function Home() {
  // Wallet
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading: isConnecting, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();

  // Form
  const [agentIdStr, setAgentIdStr] = useState("1");
  const [ethStr, setEthStr] = useState("0.001");

  const agentId = useMemo(() => {
    const n = Number(agentIdStr);
    return Number.isFinite(n) && n > 0 ? BigInt(n) : undefined;
  }, [agentIdStr]);

  const valueWei = useMemo(() => {
    try { return parseEther(ethStr as `${number}`); } catch { return undefined; }
  }, [ethStr]);

  const ready = Boolean(MANAGER_ADDRESS && agentId !== undefined && valueWei !== undefined);

  // Write
  const { data: txData, write, isLoading: isSending, error: sendError } = useContractWrite({
    address: MANAGER_ADDRESS,
    abi: [
      {
        inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
        name: "invoke",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
    ] as const,
    functionName: "invoke",
    args: agentId !== undefined ? [agentId] : undefined,
    overrides: valueWei !== undefined ? { value: valueWei } : undefined,
    enabled: ready,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } =
    useWaitForTransaction({ hash: txData?.hash });

  // Actions
  const onConnect = () => {
    const injected = connectors.find(c => c.id === "injected") ?? connectors[0];
    connect({ connector: injected });
  };

  const onSwitch = () => {
    if (switchNetwork && chain?.id !== TARGET_CHAIN_ID) switchNetwork(TARGET_CHAIN_ID);
  };

  const onInvoke = () => {
    if (!isConnected) return;
    if (!ready) return;
    if (chain?.id !== TARGET_CHAIN_ID) return onSwitch();
    write?.();
  };

  // UI
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700 }}>AgentFi Dashboard</h1>
      <p>Network: {chain?.network ?? "unknown"} · Chain ID: {chain?.id ?? "?"}</p>

      <div style={{ margin: "12px 0" }}>
        {!isConnected ? (
          <button 
            onClick={onConnect} 
            disabled={isConnecting} 
            style={{ 
              padding: "8px 12px",
              backgroundColor: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {isConnecting ? `Connecting ${pendingConnector?.name ?? ""}…` : "Connect Wallet"}
          </button>
        ) : (
          <>
            <span style={{ marginRight: 8 }}>
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            {chain?.id !== TARGET_CHAIN_ID && (
              <button 
                onClick={onSwitch} 
                disabled={isSwitching} 
                style={{ 
                  padding: "8px 12px", 
                  marginRight: 8,
                  backgroundColor: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {isSwitching ? "Switching…" : "Switch to Sepolia"}
              </button>
            )}
            <button 
              onClick={() => disconnect()} 
              style={{ 
                padding: "8px 12px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      <h2>Invoke Agent</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Agent ID
          <input 
            value={agentIdStr} 
            onChange={(e) => setAgentIdStr(e.target.value)} 
            style={{ 
              padding: 6,
              border: "1px solid #ccc",
              borderRadius: "4px"
            }} 
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Payment (ETH)
          <input 
            value={ethStr} 
            onChange={(e) => setEthStr(e.target.value)} 
            style={{ 
              padding: 6,
              border: "1px solid #ccc",
              borderRadius: "4px"
            }} 
          />
        </label>
        <button
          onClick={onInvoke}
          disabled={!isConnected || chain?.id !== TARGET_CHAIN_ID || !ready || isSending || isConfirming}
          style={{ 
            padding: "8px 16px",
            backgroundColor: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            opacity: (!isConnected || chain?.id !== TARGET_CHAIN_ID || !ready || isSending || isConfirming) ? 0.5 : 1
          }}
        >
          {isSending ? "Sending…" : isConfirming ? "Confirming…" : "Invoke Agent"}
        </button>
      </div>

      <div style={{ marginTop: 10, color: "#b00" }}>
        {sendError && <div>Send error: {String(sendError.message ?? sendError)}</div>}
        {confirmError && <div>Confirm error: {String(confirmError.message ?? confirmError)}</div>}
      </div>

      <div style={{ marginTop: 10 }}>
        {valueWei !== undefined && <div>Wei: {valueWei.toString()} ({formatEther(valueWei)} ETH)</div>}
        {txData?.hash && <div>Tx: {txData.hash}</div>}
        {isConfirmed && <div style={{ color: "green" }}>Invocation confirmed ✅</div>}
      </div>

      <hr style={{ margin: "24px 0" }} />
      <h2>Events</h2>
      <p>Watch your router terminal for AgentInvoked → ResultConfirmed.</p>
    </div>
  );
}
