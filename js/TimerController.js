/* ── js/TimerController.js ─ ES Module ──────────────────────────────────────
   Item 1 — ES Module Architecture (migration target).

   This module is the extraction target for all timer-related logic currently
   living inside the App IIFE in app.js.

   MIGRATION STATUS: stub — functions documented, not yet wired to DOM.
   Import in app.js once App IIFE is progressively unwound:
     import { startTimer, stopTimer, getElapsed, getFatigue } from './js/TimerController.js';
   ═══════════════════════════════════════════════════════════════════════════ */

import { playSessionStart, playSessionComplete, vibrateClick, vibrateSuccess } from './audio.js';

let _intervalId   = null;
let _startTs      = null;
let _onTick       = null;
let _onComplete   = null;

/**
 * Start a new timer session.
 * @param {string}   startISO   ISO string from DB task.start_time
 * @param {Function} onTick     Called every second with { elapsed, fatigue }
 * @param {Function} onComplete Called on manual stop with final elapsed seconds
 */
export function startTimer(startISO, onTick, onComplete) {
  stopTimer();
  _startTs    = new Date(startISO).getTime();
  _onTick     = onTick;
  _onComplete = onComplete;

  playSessionStart();
  vibrateClick();

  _intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - _startTs) / 1000);
    if (typeof _onTick === 'function') _onTick({ elapsed });
  }, 1000);
}

/**
 * Stop the running timer and fire onComplete.
 * @returns {number} Total elapsed seconds
 */
export function stopTimer() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  const elapsed = _startTs ? Math.floor((Date.now() - _startTs) / 1000) : 0;
  if (elapsed > 0 && typeof _onComplete === 'function') {
    _onComplete(elapsed);
    playSessionComplete();
    vibrateSuccess();
  }
  _startTs = null;
  return elapsed;
}

/** Returns elapsed seconds without stopping the timer. */
export function getElapsed() {
  if (!_startTs) return 0;
  return Math.floor((Date.now() - _startTs) / 1000);
}

/** Returns true if timer is currently running. */
export const isRunning = () => _intervalId !== null;

/**
 * Format elapsed seconds to HH:MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
