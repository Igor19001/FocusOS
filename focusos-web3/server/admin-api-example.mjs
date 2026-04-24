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
