import http from "node:http";
import { recoverMessageAddress, isAddressEqual } from "viem";

const PORT = Number(process.env.PORT || 3001);
const ADMIN_ALLOWLIST = (process.env.ADMIN_ALLOWLIST || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function isAdminAllowed(requester) {
  if (!ADMIN_ALLOWLIST.length) return false;
  return ADMIN_ALLOWLIST.some((admin) => isAddressEqual(admin, requester));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.url !== "/admin/mint" || req.method !== "POST") {
    return sendJson(res, 404, { error: "Not Found" });
  }

  try {
    const { requester, to, amount, nonce, message, signature } = await parseBody(req);
    if (!requester || !to || !amount || !nonce || !message || !signature) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const expectedPrefix = `FocusOS admin mint authorization\nrequester:${requester}\nto:${to}\namount:${Math.max(0, Number(amount))}\nnonce:${nonce}`;
    if (message !== expectedPrefix) {
      return sendJson(res, 400, { error: "Invalid signed payload" });
    }

    const recovered = (await recoverMessageAddress({ message, signature })).toLowerCase();
    if (!isAddressEqual(recovered, requester)) {
      return sendJson(res, 403, { error: "Signature does not match requester" });
    }

    if (!isAdminAllowed(requester)) {
      return sendJson(res, 403, { error: "Requester is not on admin allowlist" });
    }

    // TODO: replace with real on-chain mint call from backend signer.
    return sendJson(res, 200, {
      ok: true,
      message: "Mint authorized by backend",
      requester,
      to,
      amount: Math.max(0, Number(amount)),
    });
  } catch (err) {
    return sendJson(res, 500, { error: err?.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`FocusOS admin API listening on http://localhost:${PORT}`);
});
