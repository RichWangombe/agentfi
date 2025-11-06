"use client";

import { useMemo, useState } from "react";
import { useContractEvent } from "wagmi";
import managerAbi from "@/abi/AgentCallManagerWithVerify.json";

type AgentFeedProps = {
  onCopy?: (text: string) => void;
  agentId?: bigint;
};

const MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_MANAGER_ADDRESS ?? "").trim() as `0x${string}`;

type Row = {
  kind: "AgentInvoked" | "ResultConfirmed";
  tx?: `0x${string}`;
  agentId?: bigint;
  invocationId?: `0x${string}`;
  paid?: bigint;
  success?: boolean;
  at: number;
};

export default function AgentFeed({ onCopy, agentId }: AgentFeedProps) {
  const [rows, setRows] = useState<Row[]>([]);
  
  const title = useMemo(
    () => (agentId !== undefined ? `Agent #${agentId} — ` : '') + `${rows.length} event${rows.length === 1 ? '' : 's'}`,
    [agentId, rows.length]
  );

  // Listen AgentInvoked(agentId, invocationId, caller, paid)
  useContractEvent({
    address: MANAGER_ADDRESS,
    abi: managerAbi as any,
    eventName: "AgentInvoked",
    listener: (logs) => {
      const now = Date.now();
      const next: Row[] = logs
        .filter((l: any) => agentId === undefined || l?.args?.agentId === agentId)
        .map((l: any) => ({
          kind: "AgentInvoked",
          tx: l?.transactionHash,
          agentId: l?.args?.agentId,
          invocationId: l?.args?.invocationId,
          paid: l?.args?.paid,
          at: now,
        }));
      setRows((prev) => [...next, ...prev].slice(0, 200));
    },
  });

  // Listen ResultConfirmed(invocationId, success, resultHash)
  useContractEvent({
    address: MANAGER_ADDRESS,
    abi: managerAbi as any,
    eventName: "ResultConfirmed",
    listener: (logs) => {
      const now = Date.now();
      const next: Row[] = logs
        .filter((l: any) => {
          // If agentId is provided, only show results for that agent
          if (agentId !== undefined) {
            return rows.some(
              (r) => 
                r.invocationId === l?.args?.invocationId && 
                r.agentId === agentId
            );
          }
          return true;
        })
        .map((l: any) => ({
          kind: "ResultConfirmed",
          tx: l?.transactionHash,
          invocationId: l?.args?.invocationId,
          success: !!l?.args?.success,
          at: now,
        }));
      setRows((prev) => [...next, ...prev].slice(0, 200));
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">{title}</h3>
        <button
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
          onClick={() => setRows([])}
        >
          Clear
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-auto">
        {rows.length === 0 ? (
          <p className="text-slate-300 text-sm">No events yet for this agent.</p>
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

      {rows.length === 0 && <div className="text-sm text-gray-500">No events yet.</div>}
    </div>
  );
}
