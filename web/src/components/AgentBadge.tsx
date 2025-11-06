"use client";

import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { formatEther } from "viem";
import registryAbi from "@/abi/AgentRegistry.json";

type Props = {
  agentId: number;
  className?: string;
};

export default function AgentBadge({ agentId, className = "" }: Props) {
  const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined;

  const { data, isLoading, isError } = useContractRead({
    address: registryAddress,
    abi: registryAbi.abi,
    functionName: "agents",
    args: [BigInt(agentId || 0)],
    enabled: Boolean(registryAddress && agentId > 0),
    watch: true,
  });

  const parsed = useMemo(() => {
    // Agent tuple: [id, signer, name, metadata, feeWei, active, owner]
    if (!data || !Array.isArray(data)) return null;
    const [id, signer, name, metadata, feeWei, active] = data as any[];
    return {
      id: Number(id ?? 0),
      signer: String(signer ?? ""),
      name: String(name ?? ""),
      metadata: String(metadata ?? ""),
      feeWei: (feeWei ?? BigInt(0)) as bigint,
      feeEth: formatEther((feeWei ?? BigInt(0)) as bigint),
      active: Boolean(active),
    };
  }, [data]);

  return (
    <div
      className={
        "rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-3 " +
        "backdrop-blur supports-[backdrop-filter]:bg-slate-900/40 " +
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_24px_-10px_rgba(0,0,0,0.6)] " +
        "transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_28px_-10px_rgba(0,0,0,0.7)] " +
        className
      }
      title={
        parsed
          ? `Signer: ${parsed.signer}\nMetadata: ${parsed.metadata || "—"}\nActive: ${parsed.active}`
          : ""
      }
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <div className="flex flex-col">
          <div className="text-sm text-slate-300">
            Agent <span className="font-mono font-semibold">#{agentId}</span>
          </div>
          <div className="text-base font-semibold">
            {isLoading ? "Loading…" : isError ? "Unavailable" : parsed?.name || "Unnamed"}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-400">Fee</div>
          <div className="font-mono">
            {parsed ? `${parsed.feeEth} ETH` : isLoading ? "…" : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
