import React, { createContext, useContext, useMemo, useState } from "react";
import { createWalletClient, custom, parseEther } from "viem";

type AppMode = "local" | "monad";
const ADMIN_WALLET = (import.meta.env.VITE_ADMIN_WALLET ?? "").trim();
const TREASURY_WALLET = (import.meta.env.VITE_TREASURY_WALLET ?? ADMIN_WALLET).trim();
const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL ?? "").trim();

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
    if (!(window as any).ethereum) return null;
    try {
      return createWalletClient({
        transport: custom((window as any).ethereum),
      });
    } catch (e) {
      console.error('Failed to create wallet client', e);
      return null;
    }
  };

  const setMode = async (nextMode: AppMode) => {
    try {
      setModeState(nextMode);
      if (nextMode === "monad" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAddress(accounts?.[0] ?? null);
      }
      if (nextMode === "local") setAddress(null);
    } catch (e) {
      console.error('Failed to set mode', e);
      setModeState(null);
      setAddress(null);
    }
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
        try {
          if (!TREASURY_WALLET) throw new Error("Missing VITE_TREASURY_WALLET configuration");
          if ((window as any).ethereum && address) {
            const walletClient = await getWalletClient();
            if (!walletClient) throw new Error("Wallet client not available");
            const [account] = await walletClient.getAddresses();
            await walletClient.sendTransaction({
              account,
              chain: null,
              to: TREASURY_WALLET as `0x${string}`,
              value: parseEther((0.0001 * amount).toString()),
            });
          }
          setFcsBalance((v) => v + amount);
        } catch (e) {
          console.error('Failed to buy FCS', e);
        }
      },
      sellFCS: async (amount) => {
        if (amount <= 0) return;
        setFcsBalance((v) => Math.max(0, v - amount));
      },
      adminMint: async (to, amount) => {
        try {
          if (!address) throw new Error("Wallet not connected");
          if (!ADMIN_API_BASE_URL) {
            throw new Error("Missing VITE_ADMIN_API_BASE_URL configuration");
          }
          if (!(window as any).ethereum) {
            throw new Error("Wallet provider not available");
          }
          const nonce = `${Date.now()}:${Math.random().toString(16).slice(2)}`;
          const message = `FocusOS admin mint authorization\nrequester:${address}\nto:${to}\namount:${Math.max(0, amount)}\nnonce:${nonce}`;
          const signature = await (window as any).ethereum.request({
            method: "personal_sign",
            params: [message, address],
          });
          const response = await fetch(`${ADMIN_API_BASE_URL}/admin/mint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requester: address,
              to,
              amount: Math.max(0, amount),
              nonce,
              message,
              signature,
            }),
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Admin mint rejected by backend");
          }
          setFcsBalance((v) => v + Math.max(0, amount));
        } catch (e) {
          console.error('Admin mint failed', e);
        }
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
