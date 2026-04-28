/* ── js/TaskController.js ─ ES Module ───────────────────────────────────────
   Item 1 — ES Module Architecture (migration target).

   This module is the extraction target for task CRUD and analytics wiring
   currently inside the App IIFE in app.js.

   MIGRATION STATUS: stub — exported functions mirror app.js internals.
   Import in app.js once App IIFE is progressively unwound:
     import { createTask, completeTask, getStats } from './js/TaskController.js';
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Start a new focus task — wraps DB.startTask.
 * @param {string} name
 * @param {string} category
 * @returns {Promise<object>}  The created task record
 */
export async function createTask(name, category) {
  if (!name?.trim()) throw new Error('Task name is required');
  return DB.startTask(name.trim(), category);
}

/**
 * Complete the active task — wraps DB.stopActiveTask.
 * @returns {Promise<object|null>}  The stopped task or null if none active
 */
export async function completeTask() {
  return DB.stopActiveTask();
}

/**
 * Analyse today's tasks and return a stats snapshot.
 * @returns {Promise<object>}  { totalSec, prodSec, efficiencyPct, taskCount }
 */
export async function getTodayStats() {
  const tasks = await DB.getTasksForDay(DB.toDateStr());
  return MATH.analyzeDay(tasks);
}

/**
 * Analyse all completed tasks and return full analysis.
 * @returns {Promise<object>}  Full MATH.analyzeAll result
 */
export async function getFullAnalysis() {
  const tasks = await DB.getAllCompletedTasks();
  return MATH.analyzeAll(tasks);
}

/**
 * Recommend next break duration using the Bayesian MAB.
 * Call after stopping a session and before starting a break.
 * @returns {number}  Recommended break duration in minutes
 */
export function recommendBreak() {
  return MATH.createBreakOptimizer().recommend();
}

/**
 * Record outcome of a break for MAB learning.
 * @param {number} breakMin       Actual break taken (minutes)
 * @param {number} efficiencyPct  Post-break session efficiency %
 */
export function recordBreakOutcome(breakMin, efficiencyPct) {
  MATH.createBreakOptimizer().update(breakMin, efficiencyPct);
}

/**
 * Delete a task by id.
 * @param {number} id
 */
export async function deleteTask(id) {
  return DB.deleteTask(id);
}
