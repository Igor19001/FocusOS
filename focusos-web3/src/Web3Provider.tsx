import React, { createContext, useContext, useMemo, useState } from "react";

type AppMode = "local" | "monad";

type Web3ContextState = {
  mode: AppMode | null;
  address: string | null;
  fcsBalance: number;
  setMode: (mode: AppMode) => Promise<void>;
  claimTestFCS: () => Promise<void>;
  stakeTokens: (amount: number) => Promise<void>;
  burnTokens: (amount: number) => Promise<void>;
  saveProgressToChain: (payload: unknown) => Promise<void>;
};

const Web3Context = createContext<Web3ContextState | null>(null);

export const Web3Provider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [fcsBalance, setFcsBalance] = useState(0);

  const setMode = async (nextMode: AppMode) => {
    setModeState(nextMode);
    if (nextMode === "monad" && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts?.[0] ?? null);
    }
    if (nextMode === "local") setAddress(null);
  };

  const value = useMemo<Web3ContextState>(
    () => ({
      mode,
      address,
      fcsBalance,
      setMode,
      claimTestFCS: async () => setFcsBalance((v) => v + 100),
      stakeTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      burnTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      saveProgressToChain: async (payload) => {
        if ((window as any).ethereum && address) {
          await (window as any).ethereum.request({
            method: "personal_sign",
            params: [JSON.stringify(payload), address],
          });
        }
      },
    }),
    [mode, address, fcsBalance]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used in Web3Provider");
  return ctx;
};
