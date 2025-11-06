"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useContractEvent, usePublicClient } from "wagmi";
import managerAbi from "@/abi/AgentCallManagerWithVerify.json";
import { Address } from "viem";
import { txUrl, addressUrl } from "@/lib/explorer";
import { useToast } from "@/components/ToastProvider";

interface Row {
  key: string;
  agentId?: bigint;
  caller?: `0x${string}`;
  valueWei?: bigint;
  invocationId?: `0x${string}`;
  status?: number;
  confirmed?: boolean;
  txHash?: `0x${string}`;
  when: number;
  type: "invoked" | "confirmed";
  label?: string;
}

const MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_MANAGER_ADDRESS ?? "").trim() as `0x${string}`;
const MANAGER = process.env.NEXT_PUBLIC_MANAGER_ADDRESS as `0x${string}`;

export default function EventsPanel() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const { push } = useToast();
  const publicClient = usePublicClient();

  // Helper to update rows by invocationId
  const upsert = useCallback((next: Row) => {
    // Show toast for new events
    if (next.type === 'invoked') {
      push({
        kind: 'info',
        title: 'Agent Invoked',
        msg: `Agent #${next.agentId} invoked by ${next.caller?.slice(0, 6)}...${next.caller?.slice(-4)}`
      });
    } else if (next.type === 'confirmed') {
      const status = next.status === 1 ? 'succeeded' : 'failed';
      push({
        kind: status === 'succeeded' ? 'success' : 'warning',
        title: `Result ${status}`,
        msg: `Agent #${next.agentId} execution ${status}`
      });
    }

    return setRows((prev) => {
      const i = prev.findIndex((r) =>
        next.invocationId ? r.invocationId === next.invocationId : r.key === next.key
      );
      if (i === -1) return [next, ...prev].slice(0, 50);
      const merged: Row = { ...prev[i], ...next };
      const copy = [...prev];
      copy[i] = merged;
      const without = copy.filter((_, idx) => idx !== i);
      return [merged, ...without].slice(0, 50);
    });
  }, []);

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");

  // Listen for AgentInvoked events
  useContractEvent({
    address: MANAGER,
    abi: managerAbi.abi,
    eventName: 'AgentInvoked',
    listener: (logs) => {
      logs.forEach((log: any) => {
        upsert({
          key: `${log.transactionHash}-invoked`,
          agentId: log.args.agentId,
          caller: log.args.caller,
          valueWei: log.args.value,
          invocationId: log.args.invocationId,
          txHash: log.transactionHash,
          when: Date.now(),
          type: 'invoked',
        });
      });
    },
  });

  // Listen for ResultConfirmed events
  useContractEvent({
    address: MANAGER,
    abi: managerAbi.abi,
    eventName: 'ResultConfirmed',
    listener: (logs) => {
      logs.forEach((log: any) => {
        upsert({
          key: `${log.transactionHash}-confirmed`,
          agentId: log.args.agentId,
          invocationId: log.args.invocationId,
          status: log.args.success ? 1 : 0,
          confirmed: true,
          txHash: log.transactionHash,
          when: Date.now(),
          type: 'confirmed',
        });
      });
    },
  });

  const handleRetry = useCallback(async (invocationId: `0x${string}`) => {
    try {
      push({ kind: 'info', title: 'Retrying confirmation', msg: 'Sending confirmation transaction...' });
      
      // This is a placeholder - replace with your actual contract method
      const hash = await publicClient.request({
        method: 'eth_sendTransaction',
        params: [{
          to: MANAGER,
          data: '0x', // Add your contract method call data here
        }]
      });
      
      if (typeof hash === 'string') {
        push({ 
          kind: 'success', 
          title: 'Retry sent', 
          msg: `Transaction submitted: ${hash.slice(0, 10)}...` 
        });
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
          push({ kind: 'success', title: 'Retry confirmed', msg: 'Confirmation successful' });
        } else {
          push({ kind: 'warning', title: 'Retry reverted', msg: 'Transaction reverted' });
        }
        
        return receipt;
      }
    } catch (err) {
      console.error('Retry failed:', err);
      push({ 
        kind: 'error', 
        title: 'Retry failed', 
        msg: err instanceof Error ? err.message : 'Unknown error' 
      });
      throw err;
    }
  }, [push, publicClient]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      push({ kind: 'success', title: 'Copied!', ttlMs: 1000 });
    }).catch(err => {
      console.error('Failed to copy:', err);
      push({ kind: 'error', title: 'Copy failed', msg: err.message });
    });
  }, [push]);

  const prettyEth = (wei?: bigint) => {
    if (!wei) return "-";
    const s = wei.toString().padStart(19, "0");
    const whole = s.slice(0, -18) || "0";
    const frac = s.slice(-18).replace(/0+$/, "");
    return frac ? `${whole}.${frac} ETH` : `${whole} ETH`;
  };

  const Badge = ({ row }: { row: Row }) => (
    <span 
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        row.confirmed 
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-600/40"
          : "bg-yellow-500/15 text-yellow-200 border border-yellow-600/40"
      }`}
    >
      {row.confirmed ? "Confirmed" : "Pending"}
    </span>
  );

  return (
    <div className="rounded-2xl border border-neutral-800 mt-6">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Events</h2>
        <span className="text-xs text-neutral-400">{rows.length} shown</span>
      </div>

      <div className="divide-y divide-neutral-900 max-h-[500px] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-neutral-400">
            No events yet. Invoke an agent to see activity.
          </div>
        ) : (
          rows.map((r, idx) => {
            const color =
              r.kind === "AgentInvoked"
                ? "border-amber-500/40 bg-amber-500/10"
                : r.success
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-rose-500/40 bg-rose-500/10";

            return (
              <div
                key={idx}
                className={`rounded-lg border p-3 text-sm text-white flex items-center justify-between ${color}`}
              >
                <div className="space-y-1">
                  <div className="font-medium">{r.kind}</div>
                  <div className="text-slate-200">
                    {r.agentId !== undefined && <span>agentId: {r.agentId.toString()} · </span>}
                    {r.invocationId && (
                      <button
                        className="underline decoration-dotted"
                        onClick={() => onCopy?.(r.invocationId!)}
                        title="Copy invocationId"
                      >
                        invId: {r.invocationId.slice(0, 10)}…{r.invocationId.slice(-8)}
                      </button>
                    )}
                    {r.paid !== undefined && <span> · paid: {r.paid.toString()} wei</span>}
                    {r.success !== undefined && <span> · success: {String(r.success)}</span>}
                  </div>
                </div>

                {r.tx ? (
                  <button
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                    onClick={() => onCopy?.(r.tx!)}
                    title="Copy tx hash"
                  >
                    Copy Tx
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
