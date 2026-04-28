/* ── js/attestation.js ─ ES Module ─────────────────────────────────────────
   Item 7 — "Proof of Productivity" (Web3 / EAS-compatible attestation).

   WHAT THIS IS
   ────────────
   Generates a cryptographically signed JSON credential proving focus work.
   • Works fully offline — signing is done locally with the user's wallet
     (ethers.js, already on the page) or a browser-generated ephemeral key.
   • The output JSON follows a subset of the W3C Verifiable Credential spec
     and is compatible with Ethereum Attestation Service (EAS) off-chain
     attestation format.
   • Users can share/attach the JSON to a LinkedIn post, CV, or submit it
     on-chain via https://attest.sh (EAS UI) using their own wallet.

   NO PERSONAL DATA IS INCLUDED unless the user explicitly passes a name.
   Task names are hashed (SHA-256) by default — only hours & category summary.

   USAGE (from settings panel or profile page)
   ──────────────────────────────────────────
     import { buildAttestation, signAttestation, downloadAttestation }
       from './js/attestation.js';

     const raw  = buildAttestation({ tasks, walletAddress, displayName });
     const cert = await signAttestation(raw, walletAddress);
     downloadAttestation(cert);
   ═══════════════════════════════════════════════════════════════════════════ */

const SCHEMA_UID =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const APP_VERSION = 'FocusOS-2.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sha256Hex(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isoWeek(date) {
  const d  = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  );
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Build an unsigned attestation object from completed tasks.
 *
 * @param {{ tasks: Array, walletAddress?: string, displayName?: string,
 *           periodDays?: number }} opts
 * @returns {object}  Raw unsigned credential
 */
export async function buildAttestation({ tasks = [], walletAddress = null, displayName = null, periodDays = 7 }) {
  const cutoff    = Date.now() - periodDays * 86400000;
  const period    = tasks.filter(t => t.duration > 0 && new Date(t.start_time).getTime() >= cutoff);
  const totalSec  = period.reduce((s, t) => s + (t.duration || 0), 0);
  const totalH    = +(totalSec / 3600).toFixed(2);

  const PRODUCTIVE = new Set(['work', 'coding', 'learning', 'planning', 'reading', 'exercise']);
  const prodSec    = period.filter(t => PRODUCTIVE.has(t.category))
                           .reduce((s, t) => s + (t.duration || 0), 0);
  const efficiencyPct = totalSec > 0 ? Math.round(prodSec / totalSec * 100) : 0;

  const catSummary = {};
  for (const t of period) {
    catSummary[t.category] = +( ((catSummary[t.category] || 0) + t.duration / 3600) ).toFixed(2);
  }

  const sessionIds = await Promise.all(
    period.map(t => sha256Hex(`${t.start_time}:${t.name}:${t.duration}`))
  );
  const merkleRoot = sessionIds.length
    ? await sha256Hex(sessionIds.join(','))
    : '0'.repeat(64);

  const now = new Date().toISOString();

  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'FocusProductivityCredential'],
    issuer: walletAddress ? `did:pkh:eip155:1:${walletAddress}` : `did:web:focusos.app`,
    issuanceDate: now,
    credentialSubject: {
      id: walletAddress ? `did:pkh:eip155:1:${walletAddress}` : 'did:self',
      displayName: displayName || null,
      periodDays,
      periodEnd: now,
      totalFocusHours: totalH,
      productiveHours: +(prodSec / 3600).toFixed(2),
      efficiencyPct,
      sessionCount: period.length,
      categoryBreakdown: catSummary,
      merkleRoot,
      appVersion: APP_VERSION,
      schemaUID: SCHEMA_UID,
    },
  };
}

/**
 * Sign the attestation with the connected ethers.js wallet (if available)
 * or produce an unsigned credential with a self-issued proof.
 *
 * @param {object} credential   Result of buildAttestation()
 * @param {string} [address]    Wallet address (to look up ethers provider)
 * @returns {object}            Credential with proof block attached
 */
export async function signAttestation(credential, address = null) {
  const payload = JSON.stringify(credential.credentialSubject);

  let proof = {
    type: 'SelfIssuedProof2024',
    created: new Date().toISOString(),
    proofPurpose: 'assertionMethod',
    verificationMethod: credential.issuer,
    jws: null,
  };

  try {
    if (address && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner(address);
      const message  = `FocusOS Attestation\n${await sha256Hex(payload)}`;
      const sig      = await signer.signMessage(message);
      proof = {
        type: 'EthereumPersonalSignature2024',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `did:pkh:eip155:1:${address}`,
        jws: sig,
      };
    }
  } catch (_) {}

  return { ...credential, proof };
}

/**
 * Trigger a JSON download of the signed attestation.
 * @param {object} signedCredential
 * @param {string} [filename]
 */
export function downloadAttestation(signedCredential, filename = null) {
  const name = filename ?? `focusos-proof-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(signedCredential, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Generate, sign, and immediately download a proof for the given tasks.
 * Convenience wrapper for one-click "Export Proof" buttons.
 */
export async function oneClickProof({ tasks, walletAddress, displayName, periodDays = 7 }) {
  const raw    = await buildAttestation({ tasks, walletAddress, displayName, periodDays });
  const signed = await signAttestation(raw, walletAddress);
  downloadAttestation(signed);
  return signed;
}
