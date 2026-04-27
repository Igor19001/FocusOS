# FocusOS Web3 Backup Summary

This file documents the valuable Web3 components from the abandoned React experiment in `focusos-web3/`.

---

## 1. FocusToken.sol

**Location:** `focusos-web3/contracts/FocusToken.sol`

**Purpose:** ERC20-style smart contract for the Focus Coin (FCS) token, including staking functionality.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FocusToken {
    string public constant name = "Focus Coin";
    string public constant symbol = "FCS";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public staked;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FaucetClaim(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function faucetClaim() external {
        uint256 amount = 100 * 10 ** uint256(decimals);
        _mint(msg.sender, amount);
        emit FaucetClaim(msg.sender, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function stake(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(staked[msg.sender] >= amount, "insufficient stake");
        staked[msg.sender] -= amount;
        balanceOf[msg.sender] += amount;
        emit Unstaked(msg.sender, amount);
    }
}
```

**Key Features:**
- Standard ERC20 transfer/approval/transferFrom
- Owner-only mint function
- `faucetClaim()` - mints 100 FCS to caller (testnet faucet)
- `stake()` / `unstake()` - lock tokens for staking rewards
- Events for transfers, approvals, faucet claims, and staking

---

## 2. admin-api-example.mjs

**Location:** `focusos-web3/server/admin-api-example.mjs`

**Purpose:** Express.js API server that provides an admin mint endpoint with signature-based authorization. Uses nonce-based replay protection and supports multiple backend storage options (file, memory, Redis) for nonce tracking.

```javascript
import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  recoverMessageAddress,
  isAddressEqual,
  isAddress,
  parseUnits,
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toHex,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PORT = Number(process.env.PORT || 3001);
const ADMIN_ALLOWLIST = (process.env.ADMIN_ALLOWLIST || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const RPC_URL = (process.env.RPC_URL || "").trim();
const TOKEN_ADDRESS = (process.env.TOKEN_ADDRESS || "").trim();
const TOKEN_DECIMALS = Number(process.env.TOKEN_DECIMALS || "18");
const MINTER_PRIVATE_KEY = (process.env.MINTER_PRIVATE_KEY || "").trim();
const ADMIN_MESSAGE_TTL_MS = Number(process.env.ADMIN_MESSAGE_TTL_MS || 120_000);
const NONCE_RETENTION_MS = Number(process.env.NONCE_RETENTION_MS || 600_000);
const ADMIN_ROLE_CHECK_CONTRACT = (process.env.ADMIN_ROLE_CHECK_CONTRACT || TOKEN_ADDRESS).trim();
const ADMIN_ROLE_CHECK_MODE = (process.env.ADMIN_ROLE_CHECK_MODE || "hasRole").trim();
const ADMIN_ROLE_ID = (process.env.ADMIN_ROLE_ID || "").trim();
const ADMIN_ROLE_LABEL = (process.env.ADMIN_ROLE_LABEL || "MINTER_ROLE").trim();
const NONCE_STORE_BACKEND = (process.env.NONCE_STORE_BACKEND || "file").trim().toLowerCase();
const NONCE_STORE_FILE_PATH = (process.env.NONCE_STORE_FILE_PATH || "./server/.nonce-store.json").trim();
const REDIS_URL = (process.env.REDIS_URL || "").trim();
const REDIS_NONCE_PREFIX = (process.env.REDIS_NONCE_PREFIX || "focusos:nonce").trim();

const MINT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
];
const ROLE_CHECK_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isAdmin",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
];
let nonceStore = null;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  next();
});

app.options("*", (_, res) => {
  res.sendStatus(204);
});

function getMinterClients() {
  if (!RPC_URL || !TOKEN_ADDRESS || !MINTER_PRIVATE_KEY) {
    throw new Error("Missing RPC_URL, TOKEN_ADDRESS or MINTER_PRIVATE_KEY");
  }
  const account = privateKeyToAccount(MINTER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    transport: http(RPC_URL),
  });
  const publicClient = createPublicClient({
    transport: http(RPC_URL),
  });
  return { account, walletClient, publicClient };
}

function isAdminAllowed(requester) {
  if (!ADMIN_ALLOWLIST.length) return false;
  return ADMIN_ALLOWLIST.some((admin) => isAddressEqual(admin, requester));
}
function makeNonceKey(requester, nonce) {
  return `${requester.toLowerCase()}:${nonce}`;
}
function createMemoryNonceStore() {
  const usedNonces = new Map();
  return {
    async prune(now = Date.now()) {
      for (const [nonceKey, expiry] of usedNonces.entries()) {
        if (expiry <= now) usedNonces.delete(nonceKey);
      }
    },
    async getExpiry(key) {
      return usedNonces.get(key) ?? null;
    },
    async setExpiry(key, expiryTs) {
      usedNonces.set(key, expiryTs);
    },
  };
}
async function createFileNonceStore(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const dir = path.dirname(absolutePath);
  await mkdir(dir, { recursive: true });

  const state = new Map();
  try {
    const raw = await readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);
    for (const [key, expiry] of Object.entries(parsed || {})) {
      const exp = Number(expiry);
      if (Number.isFinite(exp)) state.set(key, exp);
    }
  } catch {
    // First run / invalid file: start empty.
  }

  let writeInFlight = Promise.resolve();
  const persist = async () => {
    const payload = Object.fromEntries(state.entries());
    const json = JSON.stringify(payload, null, 2);
    writeInFlight = writeInFlight.then(() => writeFile(absolutePath, json, "utf8"));
    await writeInFlight;
  };

  return {
    async prune(now = Date.now()) {
      let changed = false;
      for (const [nonceKey, expiry] of state.entries()) {
        if (expiry <= now) {
          state.delete(nonceKey);
          changed = true;
        }
      }
      if (changed) await persist();
    },
    async getExpiry(key) {
      return state.get(key) ?? null;
    },
    async setExpiry(key, expiryTs) {
      state.set(key, expiryTs);
      await persist();
    },
  };
}
async function createRedisNonceStore(redisUrl, prefix) {
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for NONCE_STORE_BACKEND=redis");
  }
  const { createClient } = await import("redis");
  const client = createClient({ url: redisUrl });
  client.on("error", (err) => {
    console.error("[FocusOS:nonce-store] redis client error", err);
  });
  await client.connect();

  return {
    async prune() {
      // Redis handles key expiry natively.
    },
    async getExpiry(key) {
      const val = await client.get(`${prefix}:${key}`);
      if (!val) return null;
      const exp = Number(val);
      return Number.isFinite(exp) ? exp : null;
    },
    async setExpiry(key, expiryTs) {
      const ttlSec = Math.max(1, Math.ceil((expiryTs - Date.now()) / 1000));
      await client.set(`${prefix}:${key}`, String(expiryTs), { EX: ttlSec });
    },
  };
}
async function initNonceStore() {
  if (NONCE_STORE_BACKEND === "redis") {
    return createRedisNonceStore(REDIS_URL, REDIS_NONCE_PREFIX);
  }
  if (NONCE_STORE_BACKEND === "memory") {
    return createMemoryNonceStore();
  }
  return createFileNonceStore(NONCE_STORE_FILE_PATH);
}
async function assertNonceFresh(requester, nonce) {
  if (!nonceStore) throw new Error("Nonce store is not initialized");
  const now = Date.now();
  await nonceStore.prune(now);
  const key = makeNonceKey(requester, nonce);
  const known = await nonceStore.getExpiry(key);
  if (known && known > now) {
    throw new Error("Nonce already used (possible replay)");
  }
  await nonceStore.setExpiry(key, now + Math.max(NONCE_RETENTION_MS, ADMIN_MESSAGE_TTL_MS));
}
function parseMessageFields(message) {
  const lines = String(message || "").split("\n");
  const fields = {};
  for (let i = 1; i < lines.length; i++) {
    const idx = lines[i].indexOf(":");
    if (idx <= 0) continue;
    const key = lines[i].slice(0, idx).trim();
    const value = lines[i].slice(idx + 1).trim();
    fields[key] = value;
  }
  return fields;
}
function resolveRoleId() {
  if (ADMIN_ROLE_ID) return ADMIN_ROLE_ID;
  return keccak256(toHex(stringToBytes(ADMIN_ROLE_LABEL)));
}
async function hasAdminRoleOnChain(publicClient, requester) {
  if (!isAddress(ADMIN_ROLE_CHECK_CONTRACT)) return false;
  const mode = ADMIN_ROLE_CHECK_MODE.toLowerCase();
  if (mode === "owner") {
    const owner = await publicClient.readContract({
      address: ADMIN_ROLE_CHECK_CONTRACT,
      abi: ROLE_CHECK_ABI,
      functionName: "owner",
      args: [],
    });
    return isAddressEqual(owner, requester);
  }
  if (mode === "isadmin") {
    const isAdmin = await publicClient.readContract({
      address: ADMIN_ROLE_CHECK_CONTRACT,
      abi: ROLE_CHECK_ABI,
      functionName: "isAdmin",
      args: [requester],
    });
    return Boolean(isAdmin);
  }
  const roleId = resolveRoleId();
  const hasRole = await publicClient.readContract({
    address: ADMIN_ROLE_CHECK_CONTRACT,
    abi: ROLE_CHECK_ABI,
    functionName: "hasRole",
    args: [roleId, requester],
  });
  return Boolean(hasRole);
}

app.post("/admin/mint", async (req, res) => {
  try {
    const { requester, to, amount, nonce, issuedAt, expiresAt, message, signature } = req.body ?? {};
    if (!requester || !to || amount === undefined || !nonce || !issuedAt || !expiresAt || !message || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!isAddress(requester) || !isAddress(to)) {
      return res.status(400).json({ error: "Invalid requester or destination address" });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    const issuedAtNum = Number(issuedAt);
    const expiresAtNum = Number(expiresAt);
    const now = Date.now();
    if (!Number.isFinite(issuedAtNum) || !Number.isFinite(expiresAtNum)) {
      return res.status(400).json({ error: "issuedAt/expiresAt must be numbers" });
    }
    if (expiresAtNum <= issuedAtNum) {
      return res.status(400).json({ error: "Invalid signature lifetime window" });
    }
    if (expiresAtNum - issuedAtNum > ADMIN_MESSAGE_TTL_MS) {
      return res.status(400).json({ error: "Signature lifetime exceeds allowed TTL" });
    }
    if (now < issuedAtNum - 10_000) {
      return res.status(400).json({ error: "Signature timestamp is in the future" });
    }
    if (now > expiresAtNum) {
      return res.status(401).json({ error: "Signature expired" });
    }

    const normalizedAmount = Math.max(0, amountNum);
    const fields = parseMessageFields(message);
    const expectedMessage = [
      "FocusOS admin mint authorization",
      `requester:${requester}`,
      `to:${to}`,
      `amount:${normalizedAmount}`,
      `nonce:${nonce}`,
      `issuedAt:${issuedAtNum}`,
      `expiresAt:${expiresAtNum}`,
    ].join("\n");
    if (
      message !== expectedMessage ||
      fields.requester !== requester ||
      fields.to !== to ||
      fields.amount !== String(normalizedAmount) ||
      fields.nonce !== String(nonce) ||
      fields.issuedAt !== String(issuedAtNum) ||
      fields.expiresAt !== String(expiresAtNum)
    ) {
      return res.status(400).json({ error: "Invalid signed payload" });
    }

    const recovered = await recoverMessageAddress({ message, signature });
    if (!isAddressEqual(recovered, requester)) {
      return res.status(403).json({ error: "Signature does not match requester" });
    }
    await assertNonceFresh(requester, nonce);
    const { account, walletClient, publicClient } = getMinterClients();
    const hasRole = await hasAdminRoleOnChain(publicClient, requester);
    if (!hasRole && !isAdminAllowed(requester)) {
      return res.status(403).json({ error: "Requester is not authorized by role check or allowlist" });
    }

    const mintAmountWei = parseUnits(normalizedAmount.toString(), TOKEN_DECIMALS);
    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: MINT_ABI,
      functionName: "mint",
      args: [to, mintAmountWei],
      account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return res.status(200).json({
      ok: true,
      message: "Mint authorized and executed on-chain",
      requester,
      to,
      amount: normalizedAmount,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

nonceStore = await initNonceStore();
app.listen(PORT, () => {
  console.log(`FocusOS admin API listening on http://localhost:${PORT}`);
  console.log(`[FocusOS:nonce-store] backend=${NONCE_STORE_BACKEND}`);
});
```

**Key Features:**
- `POST /admin/mint` endpoint for authorized token minting
- Signature-based authorization using EIP-191 `personal_sign`
- Nonce-based replay protection (file/memory/Redis backends)
- On-chain role verification (hasRole/owner/isAdmin)
- Environment-based allowlist fallback
- Time-windowed signatures (configurable TTL)
- CORS-enabled for frontend integration

**Environment Variables Required:**
- `PORT` - server port (default 3001)
- `RPC_URL` - blockchain RPC endpoint
- `TOKEN_ADDRESS` - deployed token contract address
- `TOKEN_DECIMALS` - token decimals (default 18)
- `MINTER_PRIVATE_KEY` - private key for minting
- `ADMIN_API_BASE_URL` - base URL for API
- `ADMIN_ALLOWLIST` - comma-separated admin addresses
- `ADMIN_MESSAGE_TTL_MS` - signature validity window (default 120s)
- `NONCE_RETENTION_MS` - how long nonces are stored (default 600s)
- `ADMIN_ROLE_CHECK_CONTRACT` - contract for role verification
- `ADMIN_ROLE_CHECK_MODE` - "hasRole" | "owner" | "isadmin"
- `ADMIN_ROLE_ID` - optional explicit role bytes32
- `ADMIN_ROLE_LABEL` - role label for keccak256 (default "MINTER_ROLE")
- `NONCE_STORE_BACKEND` - "file" | "memory" | "redis"
- `NONCE_STORE_FILE_PATH` - path for file-based nonce store
- `REDIS_URL` - Redis connection string
- `REDIS_NONCE_PREFIX` - key prefix for Redis

---

## 3. Web3Provider.tsx

**Location:** `focusos-web3/src/Web3Provider.tsx`

**Purpose:** React Context provider for Web3 wallet connection and FCS token operations. Handles MetaMask connection, balance tracking, and token transactions.

```typescript
import React, { createContext, useContext, useMemo, useState } from "react";
import { createWalletClient, custom, parseEther } from "viem";

type AppMode = "local" | "gmail" | "monad";
const ADMIN_WALLET = (import.meta.env.VITE_ADMIN_WALLET ?? "").trim();
const TREASURY_WALLET = (import.meta.env.VITE_TREASURY_WALLET ?? ADMIN_WALLET).trim();
const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL ?? "").trim();

type Web3ContextState = {
  mode: AppMode | null;
  address: string | null;
  gmailAddress: string | null;
  fcsBalance: number;
  adminWallet: string;
  activateDemoMode: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connectGmail: (email: string) => Promise<void>;
  disconnectGmail: () => void;
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
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);
  const [fcsBalance, setFcsBalance] = useState(0);

  const getWalletClient = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet provider not available");
    return createWalletClient({
      transport: custom((window as any).ethereum),
    });
  };

  const activateDemoMode = async () => {
    setModeState("local");
  };

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      throw new Error("No wallet detected. Install MetaMask or another EVM wallet.");
    }
    const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    const nextAddress = accounts?.[0] ?? null;
    if (!nextAddress) {
      throw new Error("Wallet connection was cancelled.");
    }
    setAddress(nextAddress);
    setModeState("monad");
  };

  const disconnectWallet = () => {
    setAddress(null);
    setModeState(gmailAddress ? "gmail" : "local");
  };

  const connectGmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/.test(normalizedEmail);
    if (!isGmail) {
      throw new Error("Enter a valid Gmail address.");
    }
    setGmailAddress(normalizedEmail);
    setModeState("gmail");
  };

  const disconnectGmail = () => {
    setGmailAddress(null);
    setModeState(address ? "monad" : "local");
  };

  const value = useMemo<Web3ContextState>(
    () => ({
      mode,
      address,
      gmailAddress,
      fcsBalance,
      adminWallet: ADMIN_WALLET,
      activateDemoMode,
      connectWallet,
      disconnectWallet,
      connectGmail,
      disconnectGmail,
      claimTestFCS: async () => setFcsBalance((v) => v + 100),
      stakeTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      burnTokens: async (amount) => setFcsBalance((v) => Math.max(0, v - amount)),
      buyFCS: async (amount) => {
        if (amount <= 0) return;
        if (!TREASURY_WALLET) throw new Error("Missing VITE_TREASURY_WALLET configuration");
        if ((window as any).ethereum && address) {
          const walletClient = await getWalletClient();
          const [account] = await walletClient.getAddresses();
          await walletClient.sendTransaction({
            account,
            chain: null,
            to: TREASURY_WALLET as `0x${string}`,
            value: parseEther((0.0001 * amount).toString()),
          });
        }
        setFcsBalance((v) => v + amount);
      },
      sellFCS: async (amount) => {
        if (amount <= 0) return;
        setFcsBalance((v) => Math.max(0, v - amount));
      },
      adminMint: async (to, amount) => {
        if (!address) throw new Error("Wallet not connected");
        if (!ADMIN_API_BASE_URL) {
          throw new Error("Missing VITE_ADMIN_API_BASE_URL configuration");
        }
        if (!(window as any).ethereum) {
          throw new Error("Wallet provider not available");
        }
        const amountSafe = Math.max(0, amount);
        const issuedAt = Date.now();
        const ttlMs = 2 * 60 * 1000;
        const expiresAt = issuedAt + ttlMs;
        const nonce = `${Date.now()}:${Math.random().toString(16).slice(2)}`;
        const message = [
          "FocusOS admin mint authorization",
          `requester:${address}`,
          `to:${to}`,
          `amount:${amountSafe}`,
          `nonce:${nonce}`,
          `issuedAt:${issuedAt}`,
          `expiresAt:${expiresAt}`,
        ].join("\n");
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
            amount: amountSafe,
            nonce,
            issuedAt,
            expiresAt,
            message,
            signature,
          }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Admin mint rejected by backend");
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
    [mode, address, gmailAddress, fcsBalance]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used in Web3Provider");
  return ctx;
};
```

**Key Features:**
- `connectWallet()` - Connects MetaMask via `window.ethereum.request({ method: "eth_requestAccounts" })`
- `disconnectWallet()` - Clears address, reverts to local/gmail mode
- `claimTestFCS()` - Adds 100 FCS to local balance (demo)
- `buyFCS(amount)` - Sends ETH transaction to treasury (0.0001 ETH per FCS)
- `adminMint(to, amount)` - Calls admin API with signature authorization
- `saveProgressToChain(payload)` - Signs progress data with wallet
- Gmail integration mode (alternative to wallet)

**Environment Variables (Vite):**
- `VITE_ADMIN_WALLET` - admin wallet address
- `VITE_TREASURY_WALLET` - treasury address for buyFCS
- `VITE_ADMIN_API_BASE_URL` - admin API endpoint

---

## Notes for Porting to Vanilla JS

The React code uses `viem` library. For vanilla JS, use `ethers.js` (v6) instead:

- `window.ethereum.request({ method: "eth_requestAccounts" })` works the same
- `personal_sign` is available via `window.ethereum.request({ method: "personal_sign", params: [message, address] })`
- For sending transactions in vanilla JS with ethers, use `ethers.parseEther()` and `signer.sendTransaction()`
- The admin API integration logic can be ported directly using `fetch()`
