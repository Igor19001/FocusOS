import React, { createContext, useContext, useMemo, useState } from "react";
import { createWalletClient, custom, parseEther } from "viem";

type AppMode = "local" | "monad";
const ADMIN_WALLET = "TWÓJ_ADRES_PORTFELA";

type Web3ContextState = {
  mode: AppMode | null;
  address: string | null;
  fcsBalance: number;
  adminWallet: string;
  setMode: (mode: AppMode) => Promise<void>;
  claimTestFCS: () => Promise<void>;
  stakeTokens: (amount: number) => Promise<void>;
  burnTokens: (amount: number) => Promise<void>;
  buyFCS: (amount: number) => Promise<void>;
  sellFCS: (amount: number) => Promise<void>;
  adminMint: (to: string, amount: number) => Promise<void>;
  saveProgressToChain: (payload: unknown) => Promise<void>;
};

const Web3Context = createContext<Web3ContextState | null>(null);

export const Web3Provider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [fcsBalance, setFcsBalance] = useState(0);

  const getWalletClient = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet provider not available");
    return createWalletClient({
      transport: custom((window as any).ethereum),
    });
  };

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
      adminWallet: ADMIN_WALLET,
      setMode,
      claimTestFCS: async () => setFcsBalance((v) => v + 100),
      stakeTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      burnTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      buyFCS: async (amount) => {
        if (amount <= 0) return;
        if ((window as any).ethereum && address) {
          const walletClient = await getWalletClient();
          const [account] = await walletClient.getAddresses();
          await walletClient.sendTransaction({
            account,
            chain: null,
            to: ADMIN_WALLET as `0x${string}`,
            value: parseEther((0.0001 * amount).toString()),
          });
        }
        setFcsBalance((v) => v + amount);
      },
      sellFCS: async (amount) => {
        if (amount <= 0) return;
        setFcsBalance((v) => Math.max(0, v - amount));
      },
      adminMint: async (_to, amount) => {
        if (!address || address.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
          throw new Error("Only admin can mint");
        }
        setFcsBalance((v) => v + Math.max(0, amount));
      },
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
