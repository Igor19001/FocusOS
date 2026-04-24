/* ═══════════════════════════════════════════════════════════════════════════
   FocusOS 2.0 — db.js
   IndexedDB abstraction layer via Dexie.js
   Zero backend. All data lives in the browser.
   ═══════════════════════════════════════════════════════════════════════════ */

const DB = (() => {

  // ── Schema ──────────────────────────────────────────────────────────────
  const dexie = new Dexie('FocusOS_v1');

  dexie.version(1).stores({
    tasks:    '++id, category, is_active, is_backfill, [start_time+category]',
    health:   '++id, type, date',
    settings: 'key',
  });

  // v2: adds sleep table
  dexie.version(2).stores({
    tasks:    '++id, category, is_active, is_backfill, [start_time+category]',
    health:   '++id, type, date',
    settings: 'key',
    sleep:    '++id, date',
  });

  // v3: anti-cheat water slot tracker (non-refundable daily slots)
  dexie.version(3).stores({
    tasks:    '++id, category, is_active, is_backfill, [start_time+category]',
    health:   '++id, type, date',
    settings: 'key',
    sleep:    '++id, date',
    waterSlots: 'date, usedSlots',
  });

  // ── Category constants ───────────────────────────────────────────────────
  const PRODUCTIVE   = new Set(['work','coding','learning','planning','reading','exercise']);
  const UNPRODUCTIVE = new Set(['social_media','entertainment','distraction','break']);

  const CAT_LABELS = {
    work:'Praca', coding:'Kodowanie', learning:'Nauka',
    planning:'Planowanie', reading:'Czytanie', exercise:'Sport',
    break:'Przerwa', entertainment:'Rozrywka', social_media:'Social Media',
    distraction:'Rozproszenie', other:'Inne',
  };

  const CAT_COLORS = {
    work:'#63ffb4', coding:'#7c6fff', learning:'#ffd166', planning:'#63c8ff',
    reading:'#ffa063', exercise:'#63ff96', break:'#aaaaaa',
    entertainment:'#ff6b6b', social_media:'#ff5096', distraction:'#ff3c3c',
    other:'#666688',
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toDateStr(d = new Date()) { return d.toISOString().slice(0, 10); }
  function toISO(d = new Date())     { return d.toISOString(); }
  function calcDuration(startISO, endISO) {
    return Math.round((new Date(endISO) - new Date(startISO)) / 1000);
  }

  // ── Task CRUD ────────────────────────────────────────────────────────────

  async function startTask(name, category) {
    await stopActiveTask();
    const id = await dexie.tasks.add({
      name:        name.trim(),
      category,
      start_time:  toISO(),
      end_time:    null,
      duration:    null,
      is_active:   1,
      is_backfill: 0,
      created_at:  toISO(),
    });
    return dexie.tasks.get(id);
  }

  async function stopActiveTask() {
    const active = await getActiveTask();
    if (!active) return null;
    const now = toISO();
    const duration = calcDuration(active.start_time, now);
    await dexie.tasks.update(active.id, { end_time: now, duration, is_active: 0 });
    return { ...active, end_time: now, duration, is_active: 0 };
  }

  async function getActiveTask() {
    return dexie.tasks.where('is_active').equals(1).first();
  }

  async function getTasks({ limit = 100, offset = 0 } = {}) {
    return dexie.tasks.orderBy('id').reverse().offset(offset).limit(limit).toArray();
  }

  async function deleteTask(id) { return dexie.tasks.delete(id); }

  // ── Backfill ─────────────────────────────────────────────────────────────

  async function addBackfill({ name, category, date, startHH, startMM, durationMinutes }) {
    const start = new Date(`${date}T${String(startHH).padStart(2,'0')}:${String(startMM).padStart(2,'0')}:00`);
    const durationSec = durationMinutes * 60;
    const end = new Date(start.getTime() + durationSec * 1000);
    return dexie.tasks.add({
      name: name.trim(), category,
      start_time:  start.toISOString(),
      end_time:    end.toISOString(),
      duration:    durationSec,
      is_active:   0, is_backfill: 1, created_at: toISO(),
    });
  }

  // ── Queries for analytics ─────────────────────────────────────────────────

  async function getTasksForDay(dateStr) {
    const start = new Date(dateStr + 'T00:00:00');
    const end   = new Date(dateStr + 'T23:59:59.999');
    return dexie.tasks
      .where('start_time')
      .between(start.toISOString(), end.toISOString(), true, true)
      .toArray();
  }

  async function getTasksForWeek(mondayDateStr) {
    const start = new Date(mondayDateStr + 'T00:00:00');
    const end   = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    return dexie.tasks
      .where('start_time')
      .between(start.toISOString(), end.toISOString(), true, false)
      .toArray();
  }

  async function getTasksLast30Days() {
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    return dexie.tasks.where('start_time').aboveOrEqual(start.toISOString()).toArray();
  }

  async function getAllCompletedTasks() {
    return dexie.tasks.where('is_active').equals(0).toArray();
  }

  // ── Health CRUD ───────────────────────────────────────────────────────────

  async function logHealth({ type, value, unit = '', note = '', calories = 0 }) {
    const now = new Date();
    return dexie.health.add({
      type, value, unit, note, calories,
      timestamp: now.toISOString(),
      date:      toDateStr(now),
    });
  }

  async function getHealthForDay(dateStr) {
    return dexie.health.where('date').equals(dateStr).toArray();
  }

  async function deleteHealthLog(id) { return dexie.health.delete(id); }

  async function getTodayWaterCount() {
    const logs = await getHealthForDay(toDateStr());
    return logs.filter(l => l.type === 'water').reduce((s, l) => s + (l.value || 1), 0);
  }

  async function undoLastWater() {
    const logs = await getHealthForDay(toDateStr());
    const waterLogs = logs.filter(l => l.type === 'water');
    if (!waterLogs.length) return false;
    await dexie.health.delete(waterLogs[waterLogs.length - 1].id);
    return true;
  }

  // ── Anti-cheat water slots (12/day, non-refundable) ─────────────────────

  async function getTodayWaterSlotsInfo() {
    const today = toDateStr();
    const row = await dexie.waterSlots.get(today);
    return { date: today, usedSlots: row?.usedSlots || 0, maxSlots: 12 };
  }

  async function consumeWaterSlot() {
    const { date, usedSlots, maxSlots } = await getTodayWaterSlotsInfo();
    if (usedSlots >= maxSlots) return { ok: false, usedSlots, maxSlots };
    const next = usedSlots + 1;
    await dexie.waterSlots.put({ date, usedSlots: next });
    return { ok: true, usedSlots: next, maxSlots };
  }

  // ── Sleep CRUD ────────────────────────────────────────────────────────────

  async function logSleep({ date, bedtime, wakeTime, durationMin, quality = 3 }) {
    return dexie.sleep.add({ date, bedtime, wakeTime, durationMin, quality, created_at: toISO() });
  }

  async function getSleepLogs(limit = 14) {
    return dexie.sleep.orderBy('id').reverse().limit(limit).toArray();
  }

  async function deleteSleepLog(id) { return dexie.sleep.delete(id); }

  // ── XP helpers ────────────────────────────────────────────────────────────
  //   XP is stored as a running total in settings['total_xp'].
  //   Awarded by app.js after task stop / water log / sleep log.

  async function addXP(amount) {
    const current = await getSetting('total_xp', 0);
    const next = current + Math.max(0, Math.round(amount));
    await setSetting('total_xp', next);
    return next;
  }

  async function getTotalXP() { return getSetting('total_xp', 0); }

  // ── First-run detection ───────────────────────────────────────────────────

  async function isEmpty() {
    const [t, h, s] = await Promise.all([
      dexie.tasks.count(), dexie.health.count(), dexie.settings.count(),
    ]);
    return t === 0 && h === 0 && s === 0;
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async function getSetting(key, defaultVal = null) {
    const row = await dexie.settings.get(key);
    return row ? row.value : defaultVal;
  }

  async function setSetting(key, value) {
    return dexie.settings.put({ key, value });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  async function exportCSV() {
    const tasks = await getAllCompletedTasks();
    const rows = [
      ['ID','Name','Category','Start','End','Duration(s)','Backfill'],
      ...tasks.map(t => [
        t.id, `"${(t.name||'').replace(/"/g,'""')}"`,
        t.category, t.start_time, t.end_time || '',
        t.duration || '', t.is_backfill,
      ])
    ];
    return rows.map(r => r.join(',')).join('\n');
  }

  // ── JSON Export / Import ──────────────────────────────────────────────────

  async function exportJSON() {
    const [tasks, health, sleepLogs, settings] = await Promise.all([
      dexie.tasks.toArray(),
      dexie.health.toArray(),
      dexie.sleep.toArray(),
      dexie.settings.toArray(),
    ]);
    return JSON.stringify({
      version: 2, exported_at: toISO(),
      tasks, health, sleep: sleepLogs, settings,
    }, null, 2);
  }

  async function importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.tasks || !Array.isArray(data.tasks)) throw new Error('Nieprawidłowy format pliku');
    await dexie.transaction('rw', dexie.tasks, dexie.health, dexie.sleep, dexie.settings, async () => {
      await Promise.all([
        dexie.tasks.clear(), dexie.health.clear(),
        dexie.sleep.clear(),  dexie.settings.clear(),
      ]);
      const strip = arr => (arr || []).map(({ id, ...rest }) => rest);
      await dexie.tasks.bulkAdd(strip(data.tasks));
      await dexie.health.bulkAdd(strip(data.health || []));
      await dexie.sleep.bulkAdd(strip(data.sleep || []));
      for (const s of (data.settings || [])) await dexie.settings.put(s);
    });
    return data.tasks.length;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // core
    startTask, stopActiveTask, getActiveTask, getTasks, deleteTask,
    // backfill
    addBackfill,
    // queries
    getTasksForDay, getTasksForWeek, getTasksLast30Days, getAllCompletedTasks,
    // health
    logHealth, getHealthForDay, deleteHealthLog, getTodayWaterCount, undoLastWater,
    getTodayWaterSlotsInfo, consumeWaterSlot,
    // sleep
    logSleep, getSleepLogs, deleteSleepLog,
    // xp
    addXP, getTotalXP,
    // settings
    getSetting, setSetting,
    // first-run
    isEmpty,
    // export
    exportCSV, exportJSON, importJSON,
    // constants
    PRODUCTIVE, UNPRODUCTIVE, CAT_LABELS, CAT_COLORS,
    // util
    toDateStr, toISO, calcDuration,
  };

})();
