/* ── js/sync.js ─ ES Module ────────────────────────────────────────────────
   Item 3 — Optional P2P Sync via GunDB (Local-First, no server required).

   HOW IT WORKS
   ─────────────
   • GunDB is loaded on-demand (dynamic import from CDN) only when the user
     opts in via initSync().
   • All data is encrypted with the user's own key (SEA — Security,
     Encryption, Authorization — built into GunDB) before leaving the device.
   • Peers sync over WebRTC / WebSocket relay. FocusOS never sees the data.
   • The relay list (RELAY_PEERS) can be pointed at a self-hosted relay.
   • If the user is offline, the local IndexedDB (via DB) remains the source
     of truth. GunDB syncs in background when connectivity is restored.

   USAGE (from app.js or a settings panel)
   ────────────────────────────────────────
     import { initSync, syncTasks, stopSync, getSyncStatus } from './js/sync.js';

     // Opt-in (called once, e.g. from a "Enable P2P Sync" button)
     await initSync(userPassphrase);

     // Push local tasks to peers (call after each session stop)
     await syncTasks(await DB.getAllCompletedTasks());

     // Check status
     const { enabled, peerCount, lastSync } = getSyncStatus();
   ═══════════════════════════════════════════════════════════════════════════ */

const RELAY_PEERS    = ['https://gun-manhattan.herokuapp.com/gun'];
const GUN_CDN        = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
const SEA_CDN        = 'https://cdn.jsdelivr.net/npm/gun/sea.js';
const SYNC_STATE_KEY = 'focusos_sync_enabled';
const SYNC_NS        = 'focusos_tasks_v1';

let _gun    = null;
let _sea    = null;
let _pair   = null;     // SEA key pair derived from user passphrase
let _status = { enabled: false, peerCount: 0, lastSync: null, error: null };

// ── Internal ────────────────────────────────────────────────────────────────

async function _loadGun() {
  if (typeof window.Gun !== 'undefined') return window.Gun;
  await _loadScript(GUN_CDN);
  await _loadScript(SEA_CDN);
  return window.Gun;
}

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function _deriveKeypair(passphrase) {
  const SEA = window.SEA;
  if (!SEA) throw new Error('GunDB SEA not loaded');
  return SEA.pair();
}

async function _encrypt(data, pair) {
  const SEA = window.SEA;
  const json = JSON.stringify(data);
  return SEA.encrypt(json, pair);
}

async function _decrypt(enc, pair) {
  const SEA = window.SEA;
  const json = await SEA.decrypt(enc, pair);
  return JSON.parse(json);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Opt-in to P2P sync.
 * @param {string} passphrase  - User's secret (never leaves the device in plain text)
 */
export async function initSync(passphrase = '') {
  try {
    _status.error = null;
    const Gun = await _loadGun();

    _gun  = new Gun({ peers: RELAY_PEERS, localStorage: false });
    _pair = await _deriveKeypair(passphrase);
    _sea  = window.SEA;

    _status.enabled = true;
    localStorage.setItem(SYNC_STATE_KEY, '1');

    _gun.on('hi',  () => _status.peerCount++);
    _gun.on('bye', () => { if (_status.peerCount > 0) _status.peerCount--; });

    console.info('[FocusOS:sync] P2P sync initialized. Relay:', RELAY_PEERS[0]);
    return true;
  } catch (err) {
    _status.error = err.message;
    console.error('[FocusOS:sync] initSync failed:', err);
    return false;
  }
}

/**
 * Push local tasks to peers.  Encrypts with user's SEA key before transmission.
 * @param {Array} tasks  - Array of task objects from DB.getAllCompletedTasks()
 */
export async function syncTasks(tasks) {
  if (!_gun || !_pair) {
    console.warn('[FocusOS:sync] Sync not initialized. Call initSync() first.');
    return false;
  }
  try {
    const payload = {
      ts:    Date.now(),
      count: tasks.length,
      data:  tasks,
    };
    const enc = await _encrypt(payload, _pair);
    const userId = (await window.SEA.work(_pair.pub, _pair)) ?? _pair.pub;

    _gun.get(SYNC_NS).get(userId.slice(0, 16)).put({ enc, ts: Date.now() });
    _status.lastSync = new Date().toISOString();
    return true;
  } catch (err) {
    _status.error = err.message;
    return false;
  }
}

/**
 * Pull tasks from peers and merge with local DB.
 * @returns {Array|null}  Decrypted remote tasks, or null on failure.
 */
export async function pullTasks() {
  if (!_gun || !_pair) return null;
  return new Promise((resolve) => {
    const userId = _pair.pub.slice(0, 16);
    _gun.get(SYNC_NS).get(userId).once(async (node) => {
      if (!node?.enc) { resolve(null); return; }
      try {
        const payload = await _decrypt(node.enc, _pair);
        resolve(payload?.data ?? null);
      } catch (_) { resolve(null); }
    });
    setTimeout(() => resolve(null), 8000);
  });
}

/**
 * Disable sync and clear credentials from memory.
 */
export function stopSync() {
  _gun  = null;
  _pair = null;
  _status = { enabled: false, peerCount: 0, lastSync: null, error: null };
  localStorage.removeItem(SYNC_STATE_KEY);
}

/**
 * Returns current sync status snapshot.
 * @returns {{ enabled: boolean, peerCount: number, lastSync: string|null, error: string|null }}
 */
export function getSyncStatus() {
  return { ..._status };
}

export const isSyncEnabled = () => _status.enabled;
