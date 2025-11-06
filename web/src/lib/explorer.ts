const DEFAULTS: Record<string, { base: string; label: string }> = {
  sepolia: { base: "https://sepolia.etherscan.io", label: "Sepolia" },
  somnia: { base: "https://shannon-explorer.somnia.network", label: "Somnia" },
};

export function getExplorer() {
  const envBase = process.env.NEXT_PUBLIC_EXPLORER_BASE?.trim();
  const envNet = (process.env.NEXT_PUBLIC_NETWORK || "sepolia").toLowerCase();

  if (envBase) return { 
    base: envBase.replace(/\/$/, ""), 
    label: envNet 
  };
  
  const fallback = DEFAULTS[envNet] || DEFAULTS.sepolia;
  return { 
    base: fallback.base, 
    label: fallback.label 
  };
}

export function getExplorerBase() {
  return getExplorer().base;
}

export const link = {
  addr: (a: string) => `${getExplorerBase()}/address/${a}`,
  tx: (t: string) => `${getExplorerBase()}/tx/${t}`,
};

export function txUrl(tx: string) {
  return link.tx(tx);
}

export function addressUrl(addr: string) {
  return link.addr(addr);
}

export function contractUrl(contract: string, method: string, params: string = '') {
  return `${getExplorerBase()}/address/${contract}#readContract#F${method}${params ? `?${params}` : ''}`;
}
