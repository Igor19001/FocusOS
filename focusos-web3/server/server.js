import express from 'express';
import { ethers } from 'ethers';
import { recoverMessageAddress, isAddressEqual } from 'viem';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const ADMIN_ALLOWLIST = (process.env.ADMIN_ALLOWLIST || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

// Setup ethers provider and signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error('PRIVATE_KEY not set in environment');
}
const signer = new ethers.Wallet(privateKey, provider);

// Contract ABI (minimal for mint)
const contractABI = [
  "function mint(address to, uint256 amount) external"
];
const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS not set in environment');
}
const contract = new ethers.Contract(contractAddress, contractABI, signer);

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function isAdminAllowed(requester) {
  if (!ADMIN_ALLOWLIST.length) return false;
  return ADMIN_ALLOWLIST.some((admin) => isAddressEqual(admin, requester));
}

app.post('/admin/mint', async (req, res) => {
  try {
    const { requester, to, amount, nonce, message, signature } = req.body;
    if (!requester || !to || !amount || !nonce || !message || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expectedPrefix = `FocusOS admin mint authorization\nrequester:${requester}\nto:${to}\namount:${Math.max(0, Number(amount))}\nnonce:${nonce}`;
    if (message !== expectedPrefix) {
      return res.status(400).json({ error: "Invalid signed payload" });
    }

    const recovered = (await recoverMessageAddress({ message, signature })).toLowerCase();
    if (!isAddressEqual(recovered, requester)) {
      return res.status(403).json({ error: "Signature does not match requester" });
    }

    if (!isAdminAllowed(requester)) {
      return res.status(403).json({ error: "Requester is not on admin allowlist" });
    }

    // Call the mint function on the contract
    const tx = await contract.mint(to, ethers.parseEther(amount.toString()));
    await tx.wait();

    return res.json({
      ok: true,
      message: "Mint successful",
      requester,
      to,
      amount: Number(amount),
      txHash: tx.hash
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`FocusOS backend listening on http://localhost:${PORT}`);
});