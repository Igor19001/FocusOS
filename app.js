/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FocusOS 2.0 — app.js
   Main UI controller. Orchestrates DB ↔ MATH ↔ DOM.
   Phase 1-5: Onboarding, XP, Level Locks, Sleep, Idle/Toxic alerts,
              Water cap, Calories, JSON export/import, Leaderboard.
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  playClick, playSessionStart, playSessionComplete,
  vibrateSuccess, vibrateClick,
  startAmbient, stopAmbient, setAmbientVolume,
} from './js/audio.js';

const App = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  const S = {
    activeTask:        null,
    timerInterval:     null,
    alertInterval:     null,
    sessionStart:      null,
    charts:            {},
    currentView:       'tracker',
    dailyDate:         DB.toDateStr(),
    weekStart:         getMonday(new Date()),
    notif: {
      waterEnabled:    true,
      waterIntervalH:  2,
      breakEnabled:    true,
      breakThresholdM: 90,
    },
    lastWaterLog:      null,
    lastActivity:      Date.now(),    // for idle detection
    toxicSnoozedUntil: 0,             // timestamp ms
    totalXP:           0,
    userLevel:         1,
    tutorialStep:      0,
    appMode:           null,
    walletAddress:     null,
    googleConnected:   false,
    googleAccessToken: null,
    googleRequestMode: 'connect',
    stakedFCS:         0,
    fcsBalance:        0,
    resetConfirmStep:  0,
    alarm: {
      time: null,
      intervalId: null,
      triggeredForDate: null,
    },
    deferredInstallPrompt: null,
    installAvailable: false,
    language: 'pl',
    theme: 'olympus',
    uxMode: 'zen',
    preferredExperience: 'zen',
    googleTokenClient: null,
    listFilter: 'today',
    pomodoro: {
      focusMin: 25,
      breakMin: 5,
      remainingSec: 1500,
      phase: 'focus',
      interval: null,
      running: false,
      sound: true,
    },
    hardcoreMode: false,
    zeusStyle: 'balanced',
    missionRewarded: new Set(),
    guidedEntryStarted: false,
    zeusTTSEnabled: false,
    userProgress: null,
    welcomeGoalMode: 'zen',
    saveStatusTimer: null,
  };
  const LS_KEYS = {
    sleepNotes: 'focusos_sleep_notes',
    dayPlan: 'focusos_day_plan',
    socials: 'focusos_socials',
    wallet: 'focusos_wallet_address',
    fcsBalance: 'focusos_fcs_balance',
    stakedFCS: 'focusos_staked_fcs',
    google: 'focusos_google_connected',
    routines: 'focusos_routines',
    streakMeta: 'focusos_streak_meta',
    missions: 'focusos_daily_missions',
    achievements: 'focusos_achievements',
    zeusStyle: 'focusos_zeus_style',
    userProgress: 'focusos_user_progress',
  };
  const ONBOARDING_KEY = 'hasCompletedOnboarding';
  const TUTORIAL_COMPLETED_KEY = 'tutorialCompleted';
  const APP_SETTINGS_KEY = 'focusos_app_settings';
  const USER_PROGRESS_KEY = 'focusos_user_progress';
  const GOOGLE_CLIENT_ID = '236650961782-14eb0ahioado9bedd7mq8frs8heuao1m.apps.googleusercontent.com';
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
  const FALLBACK_WALLET_ADDRESS = 'YOUR_MONAD_WALLET_ADDRESS_HERE';
  const HARDCORE_ACTIVE_KEY = 'focusos_hardcore_active_session';
  const SKILL_TREE = {
    discipline: [
      { id: 'consistency_1', name: 'Consistency I', desc: '+5% streak bonus', tier: 1, levelReq: 5 },
      { id: 'consistency_2', name: 'Consistency II', desc: '+10% streak bonus', tier: 2, levelReq: 10, requires: 'consistency_1' },
      { id: 'unbreakable', name: 'Unbreakable', desc: 'First missed day does not reset streak', tier: 3, levelReq: 15, requires: 'consistency_2' },
      { id: 'iron_routine', name: 'Iron Routine', desc: '+20 XP for completed routine', tier: 3, levelReq: 15, requires: 'consistency_2' },
    ],
    focus: [
      { id: 'deep_focus_1', name: 'Deep Focus I', desc: '+10% XP for sessions >30 min', tier: 1, levelReq: 5 },
      { id: 'deep_focus_2', name: 'Deep Focus II', desc: '+20% XP for sessions >45 min', tier: 2, levelReq: 10, requires: 'deep_focus_1' },
      { id: 'flow_state', name: 'Flow State', desc: 'Removes anti-grind penalty', tier: 3, levelReq: 15, requires: 'deep_focus_2' },
      { id: 'ultra_focus', name: 'Ultra Focus', desc: '+15% XP in Deep Work mode', tier: 3, levelReq: 15, requires: 'deep_focus_2' },
    ],
    power: [
      { id: 'risk_taker', name: 'Risk Taker', desc: '+20% XP in hardcore mode', tier: 1, levelReq: 5 },
      { id: 'no_mercy', name: 'No Mercy', desc: 'Cannot cancel sessions', tier: 2, levelReq: 10, requires: 'risk_taker' },
      { id: 'comeback', name: 'Comeback', desc: 'Next session after fail gets +30% XP', tier: 3, levelReq: 15, requires: 'no_mercy' },
      { id: 'wrath_of_zeus', name: 'Wrath of Zeus', desc: 'Hardcore success = 2x XP, fail = stronger penalty', tier: 3, levelReq: 15, requires: 'no_mercy' },
    ],
  };
  const THEME_ALIASES = {
    cyberpunk: 'olympus',
    light: 'marble',
    retro: 'ember',
  };
  const THEME_IDS = ['olympus', 'marble', 'ember', 'tide', 'poseidon', 'hephaestus'];
  const MODULE_UNLOCK_RULES = {
    health: { sessions: 1, views: ['health'], panels: ['.panel--quick-actions'] },
    sleep: { sessions: 3, views: ['sleep'], panels: [] },
    advancedStats: { sessions: 5, views: ['weekly'], panels: ['.panel--advstats', '.panel--markov', '.panel--bayes'] },
    web3: { sessions: 5, views: [], panels: ['#web3Panel'] },
  };
  const MODULE_LABELS = {
    pl: {
      health: 'Zdrowie',
      sleep: 'Sen',
      advancedStats: 'Zaawansowane statystyki',
      web3: 'Web3',
    },
    en: {
      health: 'Health',
      sleep: 'Sleep',
      advancedStats: 'Advanced stats',
      web3: 'Web3',
    },
  };
  const LOCALIZED_TITLES = {
    pl: {
      Initiate: 'Inicjowany',
      Acolyte: 'Akolita',
      Questbound: 'Łowca zadań',
      'Voice of Olympus': 'Głos Olimpu',
      'Storm Focus': 'Burzowe skupienie',
      'Disciple of Olympus': 'Uczeń Olimpu',
      'Champion of Zeus': 'Czempion Zeusa',
    },
    en: {},
  };
  const CATEGORY_LABELS = {
    pl: {
      work: 'Praca',
      coding: 'Kodowanie',
      learning: 'Nauka',
      planning: 'Planowanie',
      reading: 'Czytanie',
      exercise: 'Ruch',
      break: 'Przerwa',
      entertainment: 'Rozrywka',
      social_media: 'Social media',
      distraction: 'Rozproszenie',
      other: 'Inne',
    },
    en: {
      work: 'Work',
      coding: 'Coding',
      learning: 'Learning',
      planning: 'Planning',
      reading: 'Reading',
      exercise: 'Exercise',
      break: 'Break',
      entertainment: 'Entertainment',
      social_media: 'Social media',
      distraction: 'Distraction',
      other: 'Other',
    },
  };
  const ZEUS_MOOD_LABELS = {
    pl: {
      Observing: 'Czuwa',
      Demanding: 'Wymaga',
      Judging: 'Ocena',
      Warning: 'Ostrzega',
      Approving: 'Docenia',
      Triumphant: 'Triumfuje',
      Disappointed: 'Zawiedziony',
      Neutral: 'Spokojny',
      Proud: 'Dumny',
      'Fired Up': 'Naładowany',
      Tired: 'Regeneracja',
    },
    en: {},
  };
  const LOCALIZED_SKILLS = {
    pl: {
      consistency_1: { name: 'Regularność I', desc: '+5% bonusu do streaka' },
      consistency_2: { name: 'Regularność II', desc: '+10% bonusu do streaka' },
      unbreakable: { name: 'Niezłomny', desc: 'Pierwszy opuszczony dzień nie resetuje streaka' },
      iron_routine: { name: 'Żelazna rutyna', desc: '+20 XP za ukończony rytuał' },
      deep_focus_1: { name: 'Głębokie skupienie I', desc: '+10% XP za sesje powyżej 30 min' },
      deep_focus_2: { name: 'Głębokie skupienie II', desc: '+20% XP za sesje powyżej 45 min' },
      flow_state: { name: 'Stan flow', desc: 'Usuwa karę anty-grind' },
      ultra_focus: { name: 'Ultra skupienie', desc: '+15% XP w trybie głębokiego skupienia' },
      risk_taker: { name: 'Ryzykant', desc: '+20% XP w trybie hardcore' },
      no_mercy: { name: 'Bez litości', desc: 'Nie możesz anulować sesji' },
      comeback: { name: 'Powrót', desc: 'Kolejna sesja po porażce daje +30% XP' },
      wrath_of_zeus: { name: 'Gniew Zeusa', desc: 'Sukces hardcore = 2x XP, porażka = mocniejsza kara' },
    },
  };
  const MISSION_LABELS = {
    sessions3: { pl: 'Ukończ 3 sesje', en: 'Complete 3 sessions' },
    focus2h: { pl: 'Zrób 2 godziny skupienia', en: 'Reach 2 hours focus' },
    noFail: { pl: 'Nie spal żadnej sesji', en: 'Do not fail any session' },
  };
  const ACHIEVEMENT_LABELS = {
    first_session: { pl: 'Pierwsza ukończona sesja', en: 'First Session Completed' },
    streak_7: { pl: '7 dni streaka', en: '7 Day Streak' },
    focused_1000m: { pl: '1000 minut skupienia', en: '1000 Focus Minutes' },
  };

  // ── Utilities ─────────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);
  const fmtSec = s => {
    if (!s || s < 0) return '—';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };
  const fmtTime     = iso => iso ? new Date(iso).toLocaleTimeString('pl-PL', { hour:'2-digit', minute:'2-digit' }) : '—';
  const fmtDateShort = iso => iso ? new Date(iso).toLocaleDateString('pl-PL', { day:'2-digit', month:'2-digit' }) : '—';
  const escH        = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const localized = value => {
    if (value && typeof value === 'object' && !Array.isArray(value) && ('pl' in value || 'en' in value)) {
      return value[S.language] || value.pl || value.en || '';
    }
    return value;
  };
  const catLabel    = cat => CATEGORY_LABELS[S.language]?.[cat] || DB.CAT_LABELS[cat] || cat;
  const catColor    = cat => DB.CAT_COLORS[cat] || '#888';
  const FATIGUE_ZERO_XP_THRESHOLD = 40;

  function resolveThemeId(themeName) {
    return THEME_ALIASES[themeName] || (THEME_IDS.includes(themeName) ? themeName : 'olympus');
  }

  function localizeTitle(title) {
    return LOCALIZED_TITLES[S.language]?.[title] || title;
  }

  function localizeSkill(skill) {
    if (!skill) return skill;
    const localizedSkill = LOCALIZED_SKILLS[S.language]?.[skill.id];
    return localizedSkill ? { ...skill, ...localizedSkill } : skill;
  }

  function localizeZeusMood(mood) {
    return ZEUS_MOOD_LABELS[S.language]?.[mood] || mood;
  }

  function missionLabel(key) {
    return localized(MISSION_LABELS[key] || { pl: key, en: key });
  }

  function achievementLabel(key) {
    return localized(ACHIEVEMENT_LABELS[key] || { pl: key, en: key });
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = localized(value);
  }

  function setHTML(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = localized(value);
  }

  function setPlaceholder(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.placeholder = localized(value);
  }

  function getMonday(d) {
    const day = d.getDay(), diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(d); mon.setDate(d.getDate() + diff);
    return DB.toDateStr(mon);
  }

  function showToast(msg, type = 'info', dur = 4000) {
    const el = $('toast');
    el.textContent = msg;
    el.className = `toast show toast--${type}`;
    clearTimeout(el._tid);
    el._tid = setTimeout(() => el.classList.remove('show'), dur);
  }

  function destroyChart(id) {
    if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; }
  }

  // ── XP & Level System ─────────────────────────────────────────────────────
  //
  //  Levels:  1=0 XP | 2=1000 | 3=5000 | 4=12000 | 5=25000
  //  Titles:  Novice → Apprentice → Analyst → Architect → Master
  //
  //  XP earning:
  //    • Task stop: productive_minutes × efficiency_weight × fatigue_factor
  //    • Water: +20 XP per glass
  //    • Sleep log: +50 XP

  const LEVEL_REWARDS = {
    2:  { feature: 'basic_stats', title: 'Acolyte', text: 'Basic stats unlocked.' },
    5:  { feature: 'daily_goals', title: 'Planner', text: 'Daily goals unlocked.' },
    6:  { feature: 'missions', title: 'Questbound', text: 'Daily missions unlocked.' },
    10: { feature: 'hardcore_mode', title: 'Steel Mind', text: 'Hardcore mode unlocked.' },
    12: { feature: 'zeus_style', title: 'Voice of Olympus', text: 'Zeus personality settings unlocked.' },
    15: { feature: 'achievements', title: 'Relic Hunter', text: 'Olympus achievements unlocked.' },
    17: { feature: 'deep_work', title: 'Storm Focus', text: 'Deep Work mode unlocked.' },
    20: { feature: 'title_disciple', title: 'Disciple of Olympus', text: 'New title unlocked: Disciple of Olympus.' },
    30: { feature: 'title_champion', title: 'Champion of Zeus', text: 'Champion of Zeus unlocked + special aura.' },
  };

  function xpRequiredForLevel(level) {
    return Math.round(100 * Math.pow(level, 1.5));
  }

  function getLevelInfo(totalXP) {
    const xp = Math.max(0, Number(totalXP) || 0);
    let level = 1;
    while (xp >= xpRequiredForLevel(level + 1)) level += 1;
    const curMin = xpRequiredForLevel(level);
    const nextMin = xpRequiredForLevel(level + 1);
    const pct = Math.max(0, Math.min(100, Math.round(((xp - curMin) / Math.max(1, nextMin - curMin)) * 100)));
    let title = 'Initiate';
    if (level >= 30) title = 'Champion of Zeus';
    else if (level >= 20) title = 'Disciple of Olympus';
    else if (level >= 17) title = 'Storm Focus';
    else if (level >= 12) title = 'Voice of Olympus';
    else if (level >= 6) title = 'Questbound';
    else if (level >= 2) title = 'Acolyte';
    return { level, min: curMin, nextMin, pct, title, totalXP: xp };
  }

  function computeStreakFromTasks(tasks) {
    const days = new Set((tasks || []).map(t => (t.start_time || '').slice(0, 10)).filter(Boolean));
    let streak = 0;
    const d = new Date();
    while (days.has(DB.toDateStr(d))) { streak++; d.setDate(d.getDate() - 1); }
    let bestStreak = 0;
    if (days.size) {
      const sorted = [...days].sort();
      let run = 1;
      bestStreak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
        if (run > bestStreak) bestStreak = run;
      }
    }
    return { streak, bestStreak };
  }

  async function getSleepXPModifier() {
    const logs = await DB.getSleepLogs(1);
    if (!logs.length) return 1.0;
    const h = (logs[0].durationMin || 0) / 60;
    if (h < 6) return 0.9;
    if (h >= 8) return 1.1;
    return 1.0;
  }

  async function calcTaskXP(task, { interrupted = false, hardcoreFail = false } = {}) {
    if (!task || task.is_backfill === 1 || task.is_backfill === true) return 0;
    if (!task.duration || !DB.PRODUCTIVE.has(task.category)) return 0;
    const sessionMin = Math.max(0, Math.round(task.duration / 60));
    if (!sessionMin) return 0;
    if (hardcoreFail) return 0;

    const skillState = await getSkillState();
    const allCompleted = await DB.getAllCompletedTasks();
    const { streak } = computeStreakFromTasks(allCompleted);
    let streakBonus = Math.min(2.0, 1 + streak * 0.05);
    if (hasSkill(skillState, 'consistency_1')) streakBonus *= 1.05;
    if (hasSkill(skillState, 'consistency_2')) streakBonus *= 1.10;
    streakBonus = Math.min(2.0, streakBonus);
    const sleepModifier = await getSleepXPModifier();
    const todayTasks = await DB.getTasksForDay(DB.toDateStr());
    const todaySec = todayTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const antiGrind = hasSkill(skillState, 'flow_state') ? 1.0 : (todaySec > 4 * 3600 ? 0.7 : 1.0);

    let multiplier = S.hardcoreMode ? 1.5 : 1.2;
    if (interrupted) multiplier = 1.0;
    if (S.hardcoreMode && hasSkill(skillState, 'risk_taker')) multiplier *= 1.2;
    let xp = sessionMin * multiplier;

    if (sessionMin > 30 && hasSkill(skillState, 'deep_focus_1')) xp *= 1.1;
    if (sessionMin > 45 && hasSkill(skillState, 'deep_focus_2')) xp *= 1.2;
    else if (sessionMin > 45) xp *= 1.2;
    const startHour = new Date(task.start_time).getHours();
    if (startHour >= 5 && startHour < 11) xp += 10; // morning bonus
    if (document.body.classList.contains('deep-work') && hasSkill(skillState, 'ultra_focus')) xp *= 1.15;
    if (S.hardcoreMode && hasSkill(skillState, 'wrath_of_zeus') && !interrupted) xp *= 2;
    if (skillState.comebackReady && hasSkill(skillState, 'comeback')) {
      xp *= 1.3;
      skillState.comebackReady = false;
      await setSkillState(skillState);
    }
    xp *= streakBonus;
    xp *= sleepModifier;
    xp *= antiGrind;
    if (interrupted) xp *= 0.5;

    return Math.max(0, Math.round(xp));
  }

  async function applyXPPenalty(amount) {
    const total = await DB.getTotalXP();
    const next = Math.max(0, total - Math.max(0, Math.round(amount)));
    await DB.setSetting('total_xp', next);
    await refreshXPBar();
    return next;
  }

  async function refreshXPBar() {
    S.totalXP = await DB.getTotalXP();
    const prevLevel = S.userLevel || 1;
    const info = getLevelInfo(S.totalXP);
    const localizedTitle = localizeTitle(info.title);
    S.userLevel = info.level;
    if ($('xpLevel')) $('xpLevel').textContent  = `Lv.${info.level}`;
    if ($('xpTitle')) $('xpTitle').textContent  = localizedTitle;
    if ($('xpLabel')) $('xpLabel').textContent  = `${info.totalXP.toLocaleString()} / ${info.nextMin.toLocaleString()} XP`;
    if ($('xpFill'))  $('xpFill').style.width   = info.pct + '%';
    if ($('playerTitle')) $('playerTitle').textContent = t('titlePrefix', { title: localizedTitle });
    await applyLevelRewards(prevLevel, info.level);
    applyUnlockVisibility();
    await renderSkillTree();
    applyLevelLocks();
  }

  async function getUnlockedFeatures() {
    return await DB.getSetting('unlocked_features', ['basic_stats']);
  }

  async function setUnlockedFeatures(features) {
    const uniq = [...new Set(features)];
    await DB.setSetting('unlocked_features', uniq);
    return uniq;
  }

  function showLevelUpAnimation(level, titleStr) {
    const overlay = $('levelUpOverlay');
    if (!overlay) return;
    if ($('levelUpNumber')) $('levelUpNumber').textContent = `Lv.${level}`;
    if ($('levelUpTitle')) $('levelUpTitle').textContent = titleStr || '';
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }, 3400);
  }

  async function showLevelRewardPopup(level, reward) {
    const modal = $('levelRewardModal');
    const text = $('levelRewardText');
    const closeBtn = $('btnCloseLevelReward');
    if (!modal || !text || !closeBtn) return;
    text.textContent = `Level ${level}: ${reward.text}`;
    modal.classList.add('open');
    closeBtn.onclick = () => modal.classList.remove('open');
  }

  async function applyLevelRewards(prevLevel, newLevel) {
    if (newLevel <= prevLevel) return;
    let unlocked = await getUnlockedFeatures();
    for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
      const reward = LEVEL_REWARDS[lvl];
      if (!reward) continue;
      if (!unlocked.includes(reward.feature)) {
        unlocked.push(reward.feature);
        await showLevelRewardPopup(lvl, reward);
      }
      if (lvl === 30) document.body.classList.add('olympus-champion');
    }
    await setUnlockedFeatures(unlocked);
  }

  async function applyUnlockVisibility() {
    const unlocked = await getUnlockedFeatures();
    const has = key => unlocked.includes(key);
    if ($('goalWrap')) $('goalWrap').classList.toggle('hidden', !has('daily_goals'));
    document.querySelector('.panel--missions')?.classList.toggle('hidden', !has('missions'));
    if ($('hardcoreModeToggle')) $('hardcoreModeToggle').disabled = false;
    if ($('zeusStyleSelect')) $('zeusStyleSelect').disabled = false;
    document.querySelector('.panel--achievements')?.classList.toggle('hidden', !has('achievements'));
    if ($('btnDeepWorkMode')) $('btnDeepWorkMode').disabled = false;
    // Skill tree: locked until Level 3
    const treeLock = $('skillTreeLock');
    const treeUnlocked = $('skillTreeUnlocked');
    const lvl = S.userLevel || 1;
    if (treeLock && treeUnlocked) {
      const locked = lvl < 3;
      treeLock.style.display = locked ? '' : 'none';
      treeUnlocked.style.display = locked ? 'none' : '';
      if (locked) {
        const pct = Math.min(100, Math.round((lvl - 1) / 2 * 100));
        if ($('skillTreeLockFill')) $('skillTreeLockFill').style.width = pct + '%';
        if ($('skillTreeLockLabel')) $('skillTreeLockLabel').textContent = `Lv.${lvl} / Lv.3`;
      }
    }
  }

  async function initLevelProgression() {
    const unlocked = await DB.getSetting('unlocked_features', null);
    if (!Array.isArray(unlocked)) {
      await setUnlockedFeatures(['basic_stats']);
    }
    const current = getLevelInfo(await DB.getTotalXP());
    const rewardsToApply = Object.entries(LEVEL_REWARDS)
      .filter(([lvl]) => current.level >= Number(lvl))
      .map(([, reward]) => reward.feature);
    await setUnlockedFeatures([...(await getUnlockedFeatures()), ...rewardsToApply]);
    if (current.level >= 30) document.body.classList.add('olympus-champion');
    if ($('playerTitle')) $('playerTitle').textContent = t('titlePrefix', { title: localizeTitle(current.title) });
    await applyUnlockVisibility();
    await renderSkillTree();
  }

  function applyLevelLocks() {
    const locked = !isModuleUnlocked('advancedStats') || S.uxMode === 'zen';
    document.querySelectorAll('.panel--markov, .panel--bayes').forEach(panel => {
      panel.classList.toggle('hidden', S.uxMode === 'zen');
      applyModuleLockState(panel, 'advancedStats', locked);
    });
  }

  // ── Welcome Modal (Phase 1) ───────────────────────────────────────────────

  async function maybeShowWelcome() {
    const modal = $('welcomeModal');
    if (!modal) return;
    setWelcomeGoalMode(S.preferredExperience || 'zen');
    modal.classList.add('open');
  }

  // ── Tutorial (Phase 1) ────────────────────────────────────────────────────

  const TUTORIAL_STEPS = [
    {
      targetId: 'taskName',
      arrow: 'down',
      text: {
        pl: 'Zacznij tutaj. Nazwij jedną rzecz, którą naprawdę chcesz domknąć w tej sesji.',
        en: 'Start here. Name the one thing you want to finish in this session.',
      },
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'btnStart',
      arrow: 'down',
      text: {
        pl: 'To jest dominujący przycisk. Uruchom sesję i pozwól aplikacji podporządkować interfejs bieżącej pracy.',
        en: 'This is the dominant action. Start the session and let the app reorganize around the current work.',
      },
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'btnStop',
      arrow: 'up',
      text: {
        pl: 'Kiedy praca jest zrobiona, domknij sesję tutaj. Zbyt wczesne zatrzymanie liczy się jako zerwana próba.',
        en: 'When the work is done, close the session here. Stopping too early counts as a broken run.',
      },
      before: () => switchTab('tracker'),
    },
  ];

  async function startTutorial() {
    if (document.body.classList.contains('app-locked')) return;
    if (localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true') return;
    S.tutorialStep = 0;
    showTutorialStep();
  }

  function resolveTutorialTarget(step) {
    if (step.targetId) return document.getElementById(step.targetId);
    if (step.targetSelector) return document.querySelector(step.targetSelector);
    if (step.target) return document.getElementById(step.target) || document.querySelector('.' + step.target);
    return null;
  }

  function showTutorialStep() {
    const steps = TUTORIAL_STEPS;
    if (S.tutorialStep >= steps.length) {
      $('tutorialOverlay').style.display = 'none';
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      showToast(t('tutorialDone'), 'success');
      return;
    }
    const step = steps[S.tutorialStep];
    if (typeof step.before === 'function') step.before();
    const targetEl = resolveTutorialTarget(step);
    $('tutorialOverlay').style.display = 'block';

    $('tutText').innerHTML = localized(step.text);
    $('tutStep').textContent = `${S.tutorialStep + 1} / ${steps.length}`;
    const isLast = S.tutorialStep === steps.length - 1;
    $('tutNext').textContent = isLast ? t('tutorialFinish') : t('tutorialNext');

    const arrow = $('tutArrow');
    arrow.className = `tut-arrow tut-arrow--${step.arrow}`;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const bubble = $('tutBubble');
      const bw = bubble?.offsetWidth || 288;
      const bh = bubble?.offsetHeight || 180;
      let top, left;
      if (step.arrow === 'down') {
        top  = rect.top - 130;
        left = Math.min(rect.left, window.innerWidth - bw - 12);
        arrow.style.left = (rect.left - Math.min(rect.left, window.innerWidth - bw - 12) + 16) + 'px';
        arrow.style.top  = '';
      } else if (step.arrow === 'up') {
        top  = rect.bottom + 16;
        left = Math.min(rect.left, window.innerWidth - bw - 12);
        arrow.style.left = (rect.left - Math.min(rect.left, window.innerWidth - bw - 12) + 16) + 'px';
        arrow.style.top  = '';
      } else {
        top  = rect.top;
        left = rect.right + 16;
        arrow.style.top  = '14px';
        arrow.style.left = '';
      }
      const clampedTop = Math.min(Math.max(8, top), window.innerHeight - bh - 8);
      const clampedLeft = Math.min(Math.max(8, left), window.innerWidth - bw - 8);
      bubble.style.top  = clampedTop + 'px';
      bubble.style.left = clampedLeft + 'px';
    } else {
      const bubble = $('tutBubble');
      bubble.style.top = '18vh';
      bubble.style.left = 'max(8px, calc(50vw - 144px))';
    }

    $('tutNext').onclick = () => { S.tutorialStep++; showTutorialStep(); };
    $('tutSkip').onclick = () => {
      $('tutorialOverlay').style.display = 'none';
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    };
  }

  // ── Clock ─────────────────────────────────────────────────────────────────

  function startClock() {
    const el = $('clock');
    const tick = () => { el.textContent = new Date().toLocaleTimeString('pl-PL'); };
    tick(); setInterval(tick, 1000);
  }

  function initMatrixRain() {
    const canvas = $('matrixRain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Theme particle configs ────────────────────────────────────────────
    const RAIN = {
      olympus: {
        make(w, h, rY) {
          const size = 16 + Math.random() * 22;
          return { x: Math.random()*w, y: rY ? Math.random()*h : -(size*3+Math.random()*h*0.6),
            speed: 1.4+Math.random()*3.2, size, alpha: 0.14+Math.random()*0.34,
            glow: Math.random()>0.62, blue: Math.random()>0.78 };
        },
        draw(b) {
          ctx.save(); ctx.globalAlpha = b.alpha; ctx.translate(b.x, b.y);
          const w = b.size*0.5, h = b.size;
          if (b.glow) { ctx.shadowColor = b.blue?'rgba(122,179,255,0.9)':'rgba(244,196,106,0.9)'; ctx.shadowBlur=16; }
          ctx.beginPath();
          ctx.moveTo(w*0.58,0); ctx.lineTo(0,h*0.46); ctx.lineTo(w*0.36,h*0.46);
          ctx.lineTo(-w*0.22,h); ctx.lineTo(w*0.04,h*0.56); ctx.lineTo(-w*0.3,h*0.56);
          ctx.lineTo(w*0.58,0); ctx.closePath();
          ctx.fillStyle = b.blue?(b.glow?'#7ab3ff':'rgba(122,179,255,0.65)'):(b.glow?'#f4c46a':'rgba(244,196,106,0.65)');
          ctx.fill(); ctx.restore();
        },
      },
      marble: {
        // Apollo / Athena — rotating laurel leaves
        make(w, h, rY) {
          const size = 14+Math.random()*20;
          return { x: Math.random()*w, y: rY?Math.random()*h:-(size*2+Math.random()*h*0.5),
            speed: 0.7+Math.random()*1.8, size, alpha: 0.16+Math.random()*0.36,
            glow: Math.random()>0.68, rot: Math.random()*Math.PI*2,
            rotSpeed: (Math.random()-0.5)*0.045, wobble: Math.random()*Math.PI*2 };
        },
        draw(b) {
          b.rot += b.rotSpeed; b.wobble += 0.022;
          ctx.save(); ctx.globalAlpha = b.alpha;
          ctx.translate(b.x + Math.sin(b.wobble)*1.4, b.y); ctx.rotate(b.rot);
          if (b.glow) { ctx.shadowColor='rgba(201,168,76,0.75)'; ctx.shadowBlur=10; }
          ctx.beginPath(); ctx.ellipse(0,0,b.size*0.21,b.size*0.52,0,0,Math.PI*2);
          ctx.fillStyle = b.glow?'#c9a84c':'rgba(189,166,80,0.62)'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0,-b.size*0.52); ctx.lineTo(0,b.size*0.52);
          ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.stroke();
          ctx.restore();
        },
      },
      ember: {
        // Helios / solar — fire embers with comet tails
        make(w, h, rY) {
          const size = 8+Math.random()*14;
          const cols = ['#ff6b35','#f4a31a','#ffcc00','#ff4500','#ffd700'];
          return { x: Math.random()*w, y: rY?Math.random()*h:-(size*3+Math.random()*h*0.6),
            speed: 2.2+Math.random()*4.2, size, alpha: 0.2+Math.random()*0.45,
            glow: Math.random()>0.5, color: cols[Math.floor(Math.random()*cols.length)],
            wobble: Math.random()*Math.PI*2 };
        },
        draw(b) {
          b.wobble += 0.05;
          ctx.save(); ctx.globalAlpha = b.alpha;
          ctx.translate(b.x + Math.sin(b.wobble)*1.6, b.y);
          if (b.glow) { ctx.shadowColor=b.color; ctx.shadowBlur=14; }
          const grad = ctx.createLinearGradient(0,-b.size*2.8,0,0);
          grad.addColorStop(0,'transparent'); grad.addColorStop(1,b.color);
          ctx.beginPath();
          ctx.moveTo(-b.size*0.11,-b.size*2.8); ctx.lineTo(b.size*0.11,-b.size*2.8);
          ctx.lineTo(b.size*0.06,0); ctx.lineTo(-b.size*0.06,0); ctx.closePath();
          ctx.fillStyle = grad; ctx.fill();
          ctx.beginPath(); ctx.arc(0,0,b.size*0.32,0,Math.PI*2);
          ctx.fillStyle = b.color; ctx.fill();
          ctx.restore();
        },
      },
      tide: {
        // Calm tide — raindrops (82%) + tridents (18%)
        make(w, h, rY) {
          const size = 12+Math.random()*20;
          return { x: Math.random()*w, y: rY?Math.random()*h:-(size*2+Math.random()*h*0.5),
            speed: 1.4+Math.random()*2.6, size, alpha: 0.16+Math.random()*0.36,
            glow: Math.random()>0.65, isTrident: Math.random()>0.82,
            wobble: Math.random()*Math.PI*2 };
        },
        draw(b) {
          b.wobble += 0.026;
          ctx.save(); ctx.globalAlpha = b.alpha;
          ctx.translate(b.x + Math.sin(b.wobble)*2, b.y);
          const col = b.glow?'#5ef5ff':'rgba(94,245,255,0.58)';
          if (b.glow) { ctx.shadowColor='rgba(94,245,255,0.85)'; ctx.shadowBlur=14; }
          if (b.isTrident) {
            ctx.strokeStyle=col; ctx.lineWidth=2; ctx.lineCap='round';
            const s=b.size;
            ctx.beginPath(); ctx.moveTo(0,s*0.3); ctx.lineTo(0,s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-s*0.38,0); ctx.lineTo(s*0.38,0); ctx.stroke();
            [-s*0.38,0,s*0.38].forEach(px=>{
              ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,-s*0.46); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(px,-s*0.46); ctx.lineTo(px-s*0.1,-s*0.22); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(px,-s*0.46); ctx.lineTo(px+s*0.1,-s*0.22); ctx.stroke();
            });
          } else {
            ctx.beginPath();
            ctx.moveTo(0,-b.size*0.55);
            ctx.bezierCurveTo(b.size*0.44,-b.size*0.1, b.size*0.44,b.size*0.32, 0,b.size*0.46);
            ctx.bezierCurveTo(-b.size*0.44,b.size*0.32,-b.size*0.44,-b.size*0.1, 0,-b.size*0.55);
            ctx.fillStyle=col; ctx.fill();
          }
          ctx.restore();
        },
      },
      poseidon: {
        // Posejdon — large glowing tridents + bioluminescent bubbles
        make(w, h, rY) {
          const size = 18+Math.random()*28;
          return { x: Math.random()*w, y: rY?Math.random()*h:-(size*2+Math.random()*h*0.5),
            speed: 0.9+Math.random()*2.0, size, alpha: 0.18+Math.random()*0.42,
            glow: Math.random()>0.45, isTrident: Math.random()>0.55,
            wobble: Math.random()*Math.PI*2 };
        },
        draw(b) {
          b.wobble += 0.018;
          ctx.save(); ctx.globalAlpha = b.alpha;
          ctx.translate(b.x + Math.sin(b.wobble)*3, b.y);
          const col = b.glow?'#00d4ff':'rgba(0,200,255,0.55)';
          if (b.glow) { ctx.shadowColor='rgba(0,212,255,0.9)'; ctx.shadowBlur=18; }
          if (b.isTrident) {
            ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.lineCap='round';
            const s=b.size;
            ctx.beginPath(); ctx.moveTo(0,s*0.35); ctx.lineTo(0,s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-s*0.42,0); ctx.lineTo(s*0.42,0); ctx.stroke();
            [-s*0.42,0,s*0.42].forEach(px=>{
              ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,-s*0.52); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(px,-s*0.52); ctx.lineTo(px-s*0.12,-s*0.28); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(px,-s*0.52); ctx.lineTo(px+s*0.12,-s*0.28); ctx.stroke();
            });
          } else {
            ctx.beginPath(); ctx.arc(0,0,b.size*0.28,0,Math.PI*2);
            ctx.fillStyle=col; ctx.fill();
            const inner = ctx.createRadialGradient(0,0,0,0,0,b.size*0.28);
            inner.addColorStop(0,'rgba(180,255,255,0.6)'); inner.addColorStop(1,'transparent');
            ctx.fillStyle=inner; ctx.fill();
          }
          ctx.restore();
        },
      },
      hephaestus: {
        // Hefajstos — falling molten sparks + small hammer shapes
        make(w, h, rY) {
          const size = 6+Math.random()*16;
          const cols = ['#ff7830','#ffb040','#ffd070','#ff4422','#ffcc60'];
          return { x: Math.random()*w, y: rY?Math.random()*h:-(size*3+Math.random()*h*0.6),
            speed: 2.8+Math.random()*5.0, size, alpha: 0.22+Math.random()*0.50,
            glow: Math.random()>0.48, color: cols[Math.floor(Math.random()*cols.length)],
            isHammer: Math.random()>0.76, wobble: Math.random()*Math.PI*2, rot: Math.random()*Math.PI*2 };
        },
        draw(b) {
          b.wobble += 0.06; b.rot += 0.04;
          ctx.save(); ctx.globalAlpha = b.alpha;
          ctx.translate(b.x + Math.sin(b.wobble)*1.8, b.y);
          if (b.glow) { ctx.shadowColor=b.color; ctx.shadowBlur=16; }
          if (b.isHammer) {
            ctx.strokeStyle=b.color; ctx.lineWidth=2; ctx.lineCap='round';
            ctx.rotate(b.rot);
            const s=b.size;
            ctx.beginPath(); ctx.moveTo(0,-s*0.6); ctx.lineTo(0,s*0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-s*0.4,-s*0.6); ctx.lineTo(s*0.4,-s*0.6); ctx.stroke();
            ctx.beginPath(); ctx.rect(-s*0.4,-s*0.9,s*0.8,s*0.36);
            ctx.fillStyle=b.color; ctx.fill();
          } else {
            const grad = ctx.createRadialGradient(0,0,0,0,b.size*0.36,b.size*0.36);
            grad.addColorStop(0,'rgba(255,255,200,0.9)'); grad.addColorStop(0.5,b.color); grad.addColorStop(1,'transparent');
            ctx.beginPath(); ctx.arc(0,0,b.size*0.36,0,Math.PI*2);
            ctx.fillStyle=grad; ctx.fill();
            const trail = ctx.createLinearGradient(0,-b.size*2.4,0,0);
            trail.addColorStop(0,'transparent'); trail.addColorStop(1,b.color);
            ctx.beginPath();
            ctx.moveTo(-b.size*0.09,-b.size*2.4); ctx.lineTo(b.size*0.09,-b.size*2.4);
            ctx.lineTo(b.size*0.05,0); ctx.lineTo(-b.size*0.05,0); ctx.closePath();
            ctx.fillStyle=trail; ctx.fill();
          }
          ctx.restore();
        },
      },
    };

    const particles = [];
    let prevTheme = null;

    function cfg() { return RAIN[S.theme] || RAIN.olympus; }
    function makeP(w, h, rY) { return cfg().make(w, h, rY); }

    const rebuild = () => {
      const count = Math.max(14, Math.floor(canvas.width / 72));
      particles.length = 0;
      for (let i=0; i<count; i++) particles.push(makeP(canvas.width, canvas.height, true));
      prevTheme = S.theme;
    };

    const resize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      rebuild();
    };

    const draw = () => {
      if (S.theme !== prevTheme) rebuild();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = cfg();
      particles.forEach(b => {
        c.draw(b);
        b.y += b.speed;
        if (b.y > canvas.height + b.size*3) Object.assign(b, makeP(canvas.width, canvas.height, false));
      });
      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  function isCompactHeaderViewport() {
    return window.innerWidth <= 980;
  }

  function setResponsiveHeaderOpen(isOpen) {
    const headerInner = document.querySelector('.header-inner');
    const toggleBtn = $('btnNavToggle');
    if (!headerInner || !toggleBtn) return;
    const nextState = Boolean(isOpen) && isCompactHeaderViewport();
    headerInner.classList.toggle('nav-open', nextState);
    toggleBtn.setAttribute('aria-expanded', String(nextState));
  }

  function closeResponsiveHeader() {
    setResponsiveHeaderOpen(false);
  }

  function initTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        closeResponsiveHeader();
      });
    });
  }

  function initResponsiveHeader() {
    const toggleBtn = $('btnNavToggle');
    const headerInner = document.querySelector('.header-inner');
    if (!toggleBtn || !headerInner) return;
    toggleBtn.addEventListener('click', event => {
      event.stopPropagation();
      setResponsiveHeaderOpen(!headerInner.classList.contains('nav-open'));
    });
    document.addEventListener('click', event => {
      if (!isCompactHeaderViewport() || !headerInner.classList.contains('nav-open')) return;
      if (headerInner.contains(event.target)) return;
      closeResponsiveHeader();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeResponsiveHeader();
    });
    window.addEventListener('resize', () => {
      if (!isCompactHeaderViewport()) closeResponsiveHeader();
    });
  }

  function switchTab(view) {
    if (view === 'health' && !isModuleUnlocked('health')) {
      showToast(S.language === 'en' ? 'Health unlocks after your first focus session.' : 'Zdrowie odblokuje się po pierwszej sesji skupienia.', 'info');
      return;
    }
    if (view === 'sleep' && !isModuleUnlocked('sleep')) {
      showToast(S.language === 'en' ? 'Sleep tracking unlocks after 3 focus sessions.' : 'Sen odblokuje się po 3 sesjach skupienia.', 'info');
      return;
    }
    if (view !== 'tracker' && document.body.classList.contains('deep-work')) {
      setDeepWorkMode(false);
    }
    const doSwitch = () => {
      S.currentView = view;
      document.body.dataset.currentView = view;
      document.querySelectorAll('[data-tab]').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === view)
      );
      document.querySelectorAll('[data-view]').forEach(v =>
        v.classList.toggle('hidden', v.dataset.view !== view)
      );
      if (view === 'daily')    loadDailyView();
      if (view === 'weekly')   loadWeeklyView();
      if (view === 'health')   loadHealthView();
      if (view === 'tracker')  loadTrackerView();
      if (view === 'sleep')    { initSleepView(); loadSleepHistory(); loadSleepNotes(); }
      if (view === 'settings') loadSettingsView();
      if (view === 'profile')  loadProfileView();
    };
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(doSwitch);
    } else {
      doSwitch();
    }
  }
  window.switchTab = switchTab;

  function getLS(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }
  function setLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    queueLocalSaveStatus();
  }

  function getDefaultUserProgress() {
    return {
      xp: 0,
      focusSessions: 0,
      unlockedModules: ['focus_timer', 'basic_tasks'],
      preferredExperience: 'zen',
      uxMode: 'zen',
      lastSyncedAt: null,
    };
  }

  function normalizeUserProgress(progress) {
    const base = getDefaultUserProgress();
    const merged = { ...base, ...(progress || {}) };
    merged.focusSessions = Math.max(0, Number(merged.focusSessions) || 0);
    merged.xp = Math.max(0, Number(merged.xp) || 0);
    merged.preferredExperience = merged.preferredExperience === 'pro' ? 'pro' : 'zen';
    merged.uxMode = merged.uxMode === 'pro' ? 'pro' : 'zen';
    merged.unlockedModules = [...new Set(Array.isArray(merged.unlockedModules) ? merged.unlockedModules : base.unlockedModules)];
    return merged;
  }

  function formatModuleLabel(moduleId) {
    return MODULE_LABELS[S.language]?.[moduleId] || MODULE_LABELS.pl[moduleId] || moduleId;
  }

  function formatModuleRequirement(moduleId) {
    const rule = MODULE_UNLOCK_RULES[moduleId];
    if (!rule) return '';
    const sessionWord = S.language === 'en' ? 'focus sessions' : 'sesji skupienia';
    return S.language === 'en'
      ? `${rule.sessions} ${sessionWord}`
      : `${rule.sessions} ${sessionWord}`;
  }

  function isFocusSession(task) {
    return !!task?.duration && task.duration > 0 && DB.PRODUCTIVE.has(task.category);
  }

  function computeUnlockedModules(focusSessions) {
    const unlocked = ['focus_timer', 'basic_tasks'];
    Object.entries(MODULE_UNLOCK_RULES).forEach(([moduleId, rule]) => {
      if (focusSessions >= rule.sessions) unlocked.push(moduleId);
    });
    return unlocked;
  }

  async function syncUserProgress() {
    const current = normalizeUserProgress(getLS(USER_PROGRESS_KEY, getDefaultUserProgress()));
    const [xp, allTasks] = await Promise.all([
      DB.getTotalXP(),
      DB.getAllCompletedTasks(),
    ]);
    const focusSessions = allTasks.filter(isFocusSession).length;
    const unlockedModules = computeUnlockedModules(focusSessions);
    S.userProgress = normalizeUserProgress({
      ...current,
      xp,
      focusSessions,
      unlockedModules,
      preferredExperience: S.preferredExperience || current.preferredExperience,
      uxMode: S.uxMode || current.uxMode,
      lastSyncedAt: new Date().toISOString(),
    });
    localStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(S.userProgress));
    return S.userProgress;
  }

  function isModuleUnlocked(moduleId) {
    const progress = S.userProgress || normalizeUserProgress(getLS(USER_PROGRESS_KEY, getDefaultUserProgress()));
    return progress.unlockedModules.includes(moduleId);
  }

  function getModuleProgress(moduleId) {
    const progress = S.userProgress || normalizeUserProgress(getLS(USER_PROGRESS_KEY, getDefaultUserProgress()));
    const rule = MODULE_UNLOCK_RULES[moduleId];
    return {
      current: progress.focusSessions || 0,
      required: rule?.sessions || 0,
      unlocked: !rule || progress.unlockedModules.includes(moduleId),
    };
  }

  function setSaveStatus(status = 'saved', customText = '') {
    const el = $('saveStatus');
    if (!el) return;
    clearTimeout(S.saveStatusTimer);
    el.dataset.state = status;
    if (status === 'saving') {
      el.textContent = S.language === 'en' ? 'Saving locally...' : 'Zapisywanie lokalnie...';
      return;
    }
    el.textContent = customText || (S.language === 'en' ? 'Saved locally' : 'Dane zapisane lokalnie');
    S.saveStatusTimer = setTimeout(() => {
      if (el.dataset.state === 'saved') {
        el.textContent = S.language === 'en' ? 'Saved locally' : 'Dane zapisane lokalnie';
      }
    }, 2200);
  }

  function queueLocalSaveStatus() {
    setSaveStatus('saving');
    clearTimeout(S.saveStatusTimer);
    S.saveStatusTimer = setTimeout(() => setSaveStatus('saved'), 240);
  }

  function installLocalSaveHooks() {
    if (window.__focusosSaveHooksInstalled) return;
    window.__focusosSaveHooksInstalled = true;
    [
      'startTask',
      'stopActiveTask',
      'logHealth',
      'deleteHealthLog',
      'logSleep',
      'deleteSleepLog',
      'addXP',
      'setSetting',
      'addBackfill',
    ].forEach(method => {
      if (typeof DB[method] !== 'function' || DB[method].__focusWrapped) return;
      const original = DB[method].bind(DB);
      const wrapped = async (...args) => {
        setSaveStatus('saving');
        const result = await original(...args);
        queueLocalSaveStatus();
        return result;
      };
      wrapped.__focusWrapped = true;
      DB[method] = wrapped;
    });
  }

  function applyUxModeButtons() {
    document.querySelectorAll('[data-ux-mode-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.uxModeBtn === S.uxMode);
    });
  }

  function setWelcomeGoalMode(mode) {
    S.welcomeGoalMode = mode === 'pro' ? 'pro' : 'zen';
    document.querySelectorAll('[data-goal-mode]').forEach(card => {
      card.classList.toggle('active', card.dataset.goalMode === S.welcomeGoalMode);
    });
  }

  function applyModuleLockState(panel, moduleId, forceLocked = false) {
    if (!panel) return;
    const progress = getModuleProgress(moduleId);
    const locked = forceLocked || !progress.unlocked;
    panel.classList.toggle('module-panel--locked', locked);
    let overlay = panel.querySelector('.module-lock-overlay');
    if (!locked) {
      overlay?.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'module-lock-overlay';
      panel.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="lock-icon">🔒</div>
      <div class="lock-title">${escH(formatModuleLabel(moduleId))}</div>
      <div class="lock-sub">${S.language === 'en'
        ? `Unlock after ${formatModuleRequirement(moduleId)}.`
        : `Odblokuje się po ${formatModuleRequirement(moduleId)}.`}</div>
      <div class="lock-progress">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent4)">${progress.current} / ${progress.required}</div>
        <div class="lock-progress-track"><div class="lock-progress-fill" style="width:${progress.required ? Math.min(100, Math.round(progress.current / progress.required * 100)) : 100}%"></div></div>
      </div>
    `;
  }

  function renderProgressiveNavigation() {
    document.querySelectorAll('[data-progressive-module]').forEach(btn => {
      const moduleId = btn.dataset.progressiveModule;
      const progress = getModuleProgress(moduleId);
      const locked = !progress.unlocked;
      const hiddenInZen = S.uxMode === 'zen' && (moduleId === 'health' || moduleId === 'sleep');
      btn.classList.toggle('tab-btn--locked', locked);
      btn.disabled = locked;
      btn.title = locked
        ? (S.language === 'en'
          ? `Unlock after ${formatModuleRequirement(moduleId)}`
          : `Odblokuj po ${formatModuleRequirement(moduleId)}`)
        : '';
      btn.classList.toggle('hidden', hiddenInZen || (locked && S.uxMode === 'zen'));
    });
  }

  function renderBackupSafetyNet() {
    const prompt = $('backupPrompt');
    if (!prompt || !S.userProgress) return;
    const shouldShow = S.userProgress.focusSessions > 10 && !S.googleConnected && !S.walletAddress;
    prompt.classList.toggle('hidden', !shouldShow || S.uxMode === 'zen');
  }

  function applyProgressiveDisclosure() {
    document.body.dataset.uxMode = S.uxMode;
    document.body.dataset.experience = S.preferredExperience;
    applyUxModeButtons();
    renderProgressiveNavigation();
    renderBackupSafetyNet();

    const zenOnlyHidden = [
      '.panel--routines',
      '.panel--missions',
      '.panel--advstats',
      '.panel--achievements',
      '.panel--quick-actions',
    ];
    zenOnlyHidden.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        node.classList.toggle('hidden', S.uxMode === 'zen');
      });
    });

    const web3Panel = $('web3Panel');
    if (web3Panel) {
      const shouldHideWeb3 = S.uxMode === 'zen';
      web3Panel.classList.toggle('hidden', shouldHideWeb3);
      if (!shouldHideWeb3) applyModuleLockState(web3Panel, 'web3');
    }

    document.querySelectorAll('.panel--advstats, .panel--markov, .panel--bayes').forEach(panel => {
      if (S.uxMode === 'zen') {
        panel.classList.add('hidden');
        return;
      }
      panel.classList.remove('hidden');
      applyModuleLockState(panel, 'advancedStats');
    });

    document.querySelectorAll('.view--daily .panel--daily-donut, .view--daily .panel--daily-hours, .view--daily .panel--golden, .view--weekly .panel--week-bars, .view--weekly .panel--ema, .view--weekly .panel--markov, .view--weekly .panel--bayes').forEach(panel => {
      panel.classList.toggle('zen-collapsed', S.uxMode === 'zen');
    });

    const quickActions = document.querySelector('.panel--quick-actions');
    if (quickActions) {
      const showQuickHealth = S.uxMode === 'pro' && isModuleUnlocked('health');
      quickActions.classList.toggle('hidden', !showQuickHealth);
    }
  }

  function setUxMode(mode, { persist = true } = {}) {
    S.uxMode = mode === 'pro' ? 'pro' : 'zen';
    if (persist) {
      saveAppSettings({
        uxMode: S.uxMode,
        preferredExperience: S.preferredExperience,
      });
      const progress = normalizeUserProgress(getLS(USER_PROGRESS_KEY, getDefaultUserProgress()));
      setLS(USER_PROGRESS_KEY, { ...progress, uxMode: S.uxMode, preferredExperience: S.preferredExperience });
    }
    if (S.uxMode === 'zen' && (S.currentView === 'health' || S.currentView === 'sleep')) {
      switchTab('tracker');
    }
    applyProgressiveDisclosure();
  }

  function openDetailedReport() {
    setUxMode('pro');
    switchTab(isModuleUnlocked('advancedStats') ? 'weekly' : 'daily');
    showToast(S.language === 'en' ? 'Detailed report opened.' : 'Otworzono szczegółowy raport.', 'info');
  }

  function getLatestSleepPrompt(logs) {
    const hour = new Date().getHours();
    if (hour < 5 || hour > 11) return '';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = DB.toDateStr(yesterday);
    const latest = logs?.[0];
    if (latest?.date === yesterdayKey || latest?.date === DB.toDateStr()) return '';
    return S.language === 'en'
      ? 'I do not see last night\'s sleep yet. Log it once so I can tune today\'s suggestions.'
      : 'Nie widzę jeszcze ostatniego snu. Zaloguj go raz, a dopasuję dzisiejsze wskazówki.';
  }

  function buildHumanAdvice(analysis) {
    if (!analysis || !analysis.totalTasks) {
      return {
        coach: S.language === 'en'
          ? 'Start one clean session and I will turn the data into simple guidance.'
          : 'Zacznij jedną porządną sesję, a zamienię dane w proste wskazówki.',
        nudge: S.language === 'en'
          ? 'We keep the heavy analytics in the detailed report so the main screen stays calm.'
          : 'Cięższą analitykę chowamy do szczegółowego raportu, żeby główny ekran był spokojny.',
      };
    }

    const tips = [];
    if (analysis.bestHour?.hour >= 0) {
      tips.push(S.language === 'en'
        ? `Your strongest focus window is around ${String(analysis.bestHour.hour).padStart(2, '0')}:00. Put the hardest task there.`
        : `Najmocniej pracujesz około ${String(analysis.bestHour.hour).padStart(2, '0')}:00. Wstaw tam najtrudniejsze zadanie.`);
    }
    if (analysis.emaData?.trend === 'declining') {
      const shadowHour = analysis.kmeans?.shadowHours?.[0];
      tips.push(S.language === 'en'
        ? `Your rhythm has been dipping lately${shadowHour != null ? ` around ${String(shadowHour).padStart(2, '0')}:00` : ''}. Plan a short reset there.`
        : `Twój rytm ostatnio lekko spada${shadowHour != null ? ` około ${String(shadowHour).padStart(2, '0')}:00` : ''}. Zaplanuj tam krótką przerwę.`);
    } else if (analysis.kmeans?.goldenHours?.length) {
      const golden = analysis.kmeans.goldenHours.slice(0, 2).map(h => `${String(h).padStart(2, '0')}:00`).join(' i ');
      tips.push(S.language === 'en'
        ? `Your golden hours look like ${golden}. That is prime time for deep work.`
        : `Twoje złote godziny wyglądają jak ${golden}. To najlepszy moment na głęboką pracę.`);
    }
    if (analysis.wasteBycat?.length) {
      const topWaste = analysis.wasteBycat[0];
      tips.push(S.language === 'en'
        ? `The biggest leak right now is ${catLabel(topWaste.category)}. Cutting even 20 minutes there will help.`
        : `Najwięcej czasu wycieka teraz na ${catLabel(topWaste.category)}. Ucięcie choć 20 minut dużo da.`);
    }

    return {
      coach: tips[0] || (S.language === 'en' ? 'You are building a rhythm that likes clarity and short feedback loops.' : 'Budujesz rytm, który lubi prostotę i krótki feedback.'),
      nudge: tips[1] || (S.language === 'en' ? 'When you want the raw math, open the detailed report and I will unpack it with you.' : 'Gdy zechcesz surowej matematyki, otwórz szczegółowy raport, a rozpakuję ją razem z Tobą.'),
    };
  }

  function renderZeusGuidance(analysis = null, latestSleepLogs = []) {
    const coach = $('zeusCoachline');
    const nudge = $('zeusNudge');
    if (!coach || !nudge) return;
    const state = S.activeTask ? 'active' : 'idle';
    const payload = getZeusStatePayload(state);
    coach.textContent = payload.coach;
    const sleepPrompt = getLatestSleepPrompt(latestSleepLogs);
    if (sleepPrompt && !S.activeTask) {
      nudge.textContent = S.language === 'en'
        ? 'Recovery first. Then lock in.'
        : 'Najpierw regeneracja. Potem sprint.';
      return;
    }
    if (analysis && !S.activeTask) {
      if ((analysis.efficiencyPct || 0) >= 80) {
        nudge.textContent = S.language === 'en'
          ? 'Rhythm looks clean today.'
          : 'Rytm wygląda dziś czysto.';
        return;
      }
      if ((analysis.efficiencyPct || 0) > 0) {
        nudge.textContent = S.language === 'en'
          ? 'Shorter, tighter sessions win.'
          : 'Krótsze, ciaśniejsze sesje wygrają.';
        return;
      }
    }
    nudge.textContent = payload.nudge;
  }

  function getZeusVisualState(mood = 'Observing', intensity = 'normal', message = '') {
    const moodKey = String(mood || '').toLowerCase();
    const text = String(message || '').toLowerCase();
    if (/disappointed|judging|warning/.test(moodKey) || /failure|skipped|penalty|broke|fled/.test(text)) return 'failure';
    if (/approving|triumphant|proud/.test(moodKey) || /completed|ascended|success|clean/.test(text)) return 'success';
    if (S.activeTask || intensity === 'high' || /demanding|fired up|focus/.test(moodKey) || /discipline|lock in|begins/.test(text)) return 'active';
    return 'idle';
  }

  function getZeusStatePayload(state = 'idle') {
    const states = {
      idle: {
        label: t('zeusStateIdle'),
        line: t('zeusLineIdle'),
        coach: t('zeusCoachIdle'),
        nudge: t('zeusNudgeIdle'),
      },
      active: {
        label: t('zeusStateActive'),
        line: t('zeusLineActive'),
        coach: t('zeusCoachActive'),
        nudge: t('zeusNudgeActive'),
      },
      success: {
        label: t('zeusStateSuccess'),
        line: t('zeusLineSuccess'),
        coach: t('zeusCoachSuccess'),
        nudge: t('zeusNudgeSuccess'),
      },
      failure: {
        label: t('zeusStateFailure'),
        line: t('zeusLineFail'),
        coach: t('zeusCoachFail'),
        nudge: t('zeusNudgeFail'),
      },
    };
    return states[state] || states.idle;
  }

  function applyZeusVisualState(state) {
    const card = $('zeusCard');
    if (!card) return;
    card.dataset.zeusState = state;
    const states = {
      idle: { browLeft: 'M98 112 Q126 102 154 112', browRight: 'M166 112 Q194 102 222 112', mouth: 'M132 190 Q160 198 188 190', eyeOpacity: 0.62, eyeCy: 138, eyeRy: 13, sparkCy: 133 },
      active: { browLeft: 'M98 118 Q126 94 154 104', browRight: 'M166 104 Q194 94 222 118', mouth: 'M132 188 Q160 184 188 188', eyeOpacity: 1, eyeCy: 138, eyeRy: 12, sparkCy: 132 },
      success: { browLeft: 'M98 108 Q126 100 154 108', browRight: 'M166 108 Q194 100 222 108', mouth: 'M128 184 Q160 214 192 184', eyeOpacity: 0.92, eyeCy: 138, eyeRy: 13, sparkCy: 132 },
      failure: { browLeft: 'M98 116 Q126 126 154 118', browRight: 'M166 118 Q194 126 222 116', mouth: 'M128 198 Q160 180 192 198', eyeOpacity: 0.28, eyeCy: 140, eyeRy: 11, sparkCy: 136 },
    };
    const cfg = states[state] || states.idle;
    $('zeusBrowLeft')?.setAttribute('d', cfg.browLeft);
    $('zeusBrowRight')?.setAttribute('d', cfg.browRight);
    $('zeusMouth')?.setAttribute('d', cfg.mouth);
    [['zeusEyeLeftBg', 26], ['zeusEyeRightBg', 26]].forEach(([id, rx]) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.eyeCy));
      el.setAttribute('ry', String(cfg.eyeRy + 9));
      el.setAttribute('rx', String(rx));
    });
    ['zeusEyeLeft', 'zeusEyeRight'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.eyeCy));
      el.setAttribute('ry', String(cfg.eyeRy));
      el.setAttribute('fill', `rgba(244,196,106,${cfg.eyeOpacity})`);
    });
    ['zeusEyeLeftSpark', 'zeusEyeRightSpark'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.sparkCy));
      el.setAttribute('opacity', String(Math.min(1, cfg.eyeOpacity + 0.15)));
    });
  }

  function zeusSpeak(message, mood = 'Observing', intensity = 'normal') {
    const msgEl = $('zeusMessage');
    const moodEl = $('zeusMood');
    const card = $('zeusCard');
    if (!msgEl || !moodEl || !card) return;
    const visualState = getZeusVisualState(mood, intensity, message);
    const payload = getZeusStatePayload(visualState);
    msgEl.textContent = payload.line;
    msgEl.dataset.dynamic = '1';
    moodEl.textContent = payload.label;
    $('zeusCoachline') && ($('zeusCoachline').textContent = payload.coach);
    $('zeusNudge') && ($('zeusNudge').textContent = payload.nudge);
    applyZeusVisualState(visualState);
    card.classList.remove('zeus-anim');
    void card.offsetWidth;
    card.classList.add('zeus-anim');
    if (intensity === 'high') {
      const flash = $('zeusLightning');
      flash?.classList.remove('active');
      void flash?.offsetWidth;
      flash?.classList.add('active');
    }
    // Notify floating hologram of message change
    const emojiMap = { 'Approving': '👍', 'Triumphant': '🏆', 'Demanding': '🔥', 'Judging': '⚠️', 'Warning': '⚡', 'Disappointed': '😞', 'Observing': '👁️', 'Neutral': '➖', 'Proud': '😊', 'Fired Up': '🔥', 'Tired': '😴' };
    const emoji = emojiMap[mood] || '⚡';
    window.dispatchEvent(new CustomEvent('zeusMessageUpdate', { detail: { message: payload.line, emoji, mood, intensity } }));
    const moodSoundMap = { Triumphant: 'levelup', Demanding: 'start', Approving: 'complete', 'Fired Up': 'start', Judging: 'warn', Warning: 'warn', Disappointed: 'warn' };
    if (intensity === 'high') { const snd = moodSoundMap[mood]; if (snd) zeusPlaySound(snd); }
    zeusTTS(payload.line);
  }

  function zeusTTS(text) {
    if (!S.zeusTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85; u.pitch = 0.72; u.volume = 0.85;
    u.lang = /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c]/i.test(text) ? 'pl-PL' : 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const lang = u.lang.slice(0, 2);
    const v = voices.find(v => v.lang.startsWith(lang) && /male|man/i.test(v.name))
      || voices.find(v => v.lang.startsWith(lang)) || null;
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  function zeusPlaySound(type) {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const seqs = {
        start:    [[523,0,0.12],[659,0.14,0.16],[784,0.3,0.22]],
        complete: [[523,0,0.14],[659,0.1,0.14],[784,0.22,0.14],[1047,0.36,0.28]],
        levelup:  [[523,0,0.1],[659,0.1,0.1],[784,0.2,0.1],[1047,0.3,0.1],[1319,0.42,0.32]],
        warn:     [[220,0,0.16],[196,0.2,0.22]],
      };
      (seqs[type] || seqs.start).forEach(([freq, delay, dur]) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ac.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.25, ac.currentTime + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
        osc.start(ac.currentTime + delay);
        osc.stop(ac.currentTime + delay + dur + 0.02);
      });
    } catch (_) {}
  }

  const ZEUS_CHAT = [
    { k: ['skupienie','focus','skupić','skupic'], r: 'Skupienie to miecz wojownika. Jedno zadanie, jeden cel, zero rozproszeń.' },
    { k: ['motywacja','motivat','chce mi','nie chce','leniw'], r: 'Motywacja przychodzi po działaniu, nie przed nim. Zacznij — reszta przyjdzie sama.' },
    { k: ['streak','seria','z rzędu'], r: 'Seria to dowód charakteru. Każdy dzień to wybór: olimpijczyk albo widz.' },
    { k: ['xp','poziom','level','doświadczenie'], r: 'XP to skrystalizowane skupienie. Im więcej sesji, tym wyższy poziom olimpijskiej doskonałości.' },
    { k: ['web3','monad','blockchain','portfel','wallet','token'], r: 'Monad Testnet to arena. Twoje postępy zapisane w niezmiennym rejestrze bogów.' },
    { k: ['timer','pomodoro','czas','minuty','jak długo'], r: 'Klasyczny sprint: 25 minut czystej koncentracji. Potem 5 minut oddechu. Olympus akceptuje ten rytm.' },
    { k: ['sen','sleep','zmęczen','spać','odpocząć'], r: 'Nawet bogowie Olympu potrzebują odnowy. Bez snu skupienie zanika jak ogień bez tlenu.' },
    { k: ['zdrowie','health','woda','jedzenie','nawodnien'], r: 'Ciało jest świątynią umysłu. Nawodnij je, odżyw — a umysł odpłaci uwagą.' },
    { k: ['misja','mission','cel','zadanie','priorytet'], r: 'Jeden priorytet na dziś. Jeden sprint. Jedno ukończone zadanie zmienia jutro.' },
    { k: ['stres','stress','trudno','ciężko','przytłoczen'], r: 'Presja to uczucie, że coś ma znaczenie. Zamiast uciekać — użyj jej jako paliwa.' },
    { k: ['deep focus','deep work','głęboki'], r: 'Deep Focus to sala treningowa bogów. Drzwi się zamykają, świat odpada. Liczy się tylko cel.' },
    { k: ['przerwa','break','odpoczyn','regeneracja'], r: 'Regeneracja to część treningu, nie ucieczka od niego. Olympijczycy wiedzą, kiedy odpocząć.' },
    { k: ['cześć','hej','siema','hello','hi','witaj'], r: 'Witaj, wojowniku skupienia. Olympus czeka na twoje dokonania. Co możesz teraz zrobić?' },
    { k: ['dzięki','dziękuję','thx','thanks'], r: 'Podziękowania przyjęte. Teraz wróć do działania — Olympus obserwuje.' },
    { k: ['kim','kto','jesteś','co to','who are'], r: 'Jestem Zeus — strażnik twojego skupienia. Olympus patrzy przez moje złote oczy.' },
    { k: ['telefon','social media','rozprosz','distract','facebook','tiktok'], r: 'Odłóż telefon. Uruchom sesję. Zamknij portal. Olympus nie akceptuje wymówek.' },
    { k: ['nie umiem','nie mogę','trudne','za trudno','nie dam'], r: 'Trudność sygnalizuje, że robisz coś wartościowego. Bogowie twardnieją na trudnych ścieżkach.' },
    { k: ['plan','zaplanow','harmono'], r: 'Trzy priorytety. Jeden projekt, jeden krok, jeden sprint. To wystarczy na dziś.' },
    { k: ['skill','umiejętno','drzewo'], r: 'Drzewo umiejętności to twoja olimpijska mapa. Każdy węzeł — nowa broń skupienia.' },
    { k: ['pomocy','help','nie wiem','jak'], r: 'Kliknij ⚡ Sprint żeby zacząć. Kliknij ikonę Pomodoro żeby ustawić timer. Reszta sama się ułoży.' },
  ];

  function zeusGetChatResponse(q) {
    const lq = q.toLowerCase();
    for (const item of ZEUS_CHAT) {
      if (item.k.some(k => lq.includes(k))) return item.r;
    }
    const fallback = [
      'Olympus obserwuje każdy twój ruch. Działaj jak olimpijczyk.',
      'Zamiast szukać odpowiedzi — zacznij sesję i ją znajdziesz.',
      'Zeus milczy, gdy słowa są zbędne. Uruchom timer i zacznij.',
      'Jedno skupione działanie warte jest tysiąca pytań.',
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function initZeusChat() {
    const input = $('zeusChatInput');
    const sendBtn = $('zeusChatSend');
    const ttsBtn = $('zeusToggleTTS');
    const history = $('zeusChatHistory');

    function addMsg(text, isUser) {
      if (!history) return;
      const d = document.createElement('div');
      d.className = 'zeus-chat-msg ' + (isUser ? 'zeus-chat-msg--user' : 'zeus-chat-msg--zeus');
      d.textContent = text;
      history.appendChild(d);
      history.scrollTop = history.scrollHeight;
    }

    function send() {
      const q = input?.value?.trim();
      if (!q) return;
      addMsg(q, true);
      input.value = '';
      const r = zeusGetChatResponse(q);
      setTimeout(() => { addMsg(r, false); zeusSpeak(r, 'Observing'); }, 380);
    }

    sendBtn?.addEventListener('click', send);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    ttsBtn?.addEventListener('click', () => {
      S.zeusTTSEnabled = !S.zeusTTSEnabled;
      if (ttsBtn) {
        ttsBtn.textContent = S.zeusTTSEnabled ? '🔊' : '🔇';
        ttsBtn.title = S.zeusTTSEnabled ? 'Wyłącz mowę Zeusa' : 'Włącz mowę Zeusa';
      }
      if (S.zeusTTSEnabled) zeusTTS('Zeus przemawia.');
      else window.speechSynthesis?.cancel();
    });
  }

  function localizeZeusBaseMessage(base) {
    const text = String(base || '');
    const exactMap = {
      'You fled the trial. Olympus marks this as failure.': {
        pl: 'Uciekłeś z próby. Olimp zapisuje to jako porażkę.',
        en: 'You fled the trial. Olympus marks it as a failure.',
      },
      'Discipline initiated. Olympus expects consistency.': {
        pl: 'Dyscyplina uruchomiona. Teraz liczy się regularność.',
        en: 'Discipline initiated. Consistency matters now.',
      },
      'Another session completed. Olympus is watching.': {
        pl: 'Kolejna sesja domknięta. To buduje prawdziwy rytm.',
        en: 'Another session completed. The rhythm is building.',
      },
      'You stopped early? Even mortals show more discipline.': {
        pl: 'Zatrzymanie przed czasem osłabia rytm. Wróć mocniej.',
        en: 'Stopping early weakens the rhythm. Return stronger.',
      },
      'Session closed. Return stronger.': {
        pl: 'Sesja zamknięta. Wróć silniejszy.',
        en: 'Session closed. Return stronger.',
      },
      'Unbreakable absorbed your first missed day. Do not waste this mercy.': {
        pl: 'Unbreakable uratowało pierwszy opuszczony dzień. Nie marnuj tej szansy.',
        en: 'Unbreakable absorbed your first missed day. Do not waste that mercy.',
      },
      'A day was skipped. Olympus does not reward broken oaths.': {
        pl: 'Dzień został pominięty. Złamane obietnice kosztują.',
        en: 'A day was skipped. Broken vows have a cost.',
      },
      'Zeus voice adjusted to your preference.': {
        pl: 'Ustawiłem nowy ton głosu Zeusa.',
        en: 'Zeus voice updated to your preference.',
      },
      'Hardcore law: no skipping phases.': {
        pl: 'Prawo hardcore: nie pomijasz faz.',
        en: 'Hardcore law: no phase skipping.',
      },
      'Now you work. No excuses.': {
        pl: 'Teraz pracujesz. Bez wymówek.',
        en: 'Now you work. No excuses.',
      },
      'Daily plan task aligned with your focus session.': {
        pl: 'Punkt planu dnia został spięty z Twoją sesją.',
        en: 'The day-plan task is aligned with your focus session.',
      },
      'Ritual completed. Discipline is forged in repetition.': {
        pl: 'Rytuał ukończony. Dyscyplina rośnie przez powtarzalność.',
        en: 'Ritual completed. Discipline is forged through repetition.',
      },
      'A focused sprint begins with one clear target.': {
        pl: 'Dobry sprint zaczyna się od jednego jasnego celu.',
        en: 'A strong sprint begins with one clear target.',
      },
      'Protect the streak with one completed session before the day ends.': {
        pl: 'Uratuj streak jedną domkniętą sesją przed końcem dnia.',
        en: 'Protect the streak with one completed session before the day ends.',
      },
      'Recovery is part of discipline, not a break from it.': {
        pl: 'Regeneracja jest częścią dyscypliny, nie ucieczką od niej.',
        en: 'Recovery is part of discipline, not a break from it.',
      },
    };
    if (exactMap[text]) return localized(exactMap[text]);

    const patterns = [
      {
        regex: /^You ascended to level (\d+)\. Olympus acknowledges your rise\.$/,
        pl: match => `Wskoczyłeś na poziom ${match[1]}. Olimp zauważa Twój wzrost.`,
        en: match => `You ascended to level ${match[1]}. Olympus acknowledges your rise.`,
      },
      {
        regex: /^Streak (\d+) days\. Keep climbing toward Olympus\.$/,
        pl: match => `Streak trwa ${match[1]} dni. Wspinaj się dalej.`,
        en: match => `Your streak is ${match[1]} days. Keep climbing.`,
      },
      {
        regex: /^You slept ([\d.]+) hours\. Even gods require more\.$/,
        pl: match => `Spałeś ${match[1]} h. Nawet bogowie potrzebują więcej regeneracji.`,
        en: match => `You slept ${match[1]} hours. Even gods need more recovery.`,
      },
      {
        regex: /^Recovery logged: ([\d.]+)h\. A sharper mind returns\.$/,
        pl: match => `Regeneracja zapisana: ${match[1]} h. Ostrzejsza głowa wraca do gry.`,
        en: match => `Recovery logged: ${match[1]}h. A sharper mind returns.`,
      },
      {
        regex: /^Path chosen: (.+)\. Your style is being forged\.$/,
        pl: match => `Wybrano ścieżkę: ${match[1]}. Twój styl właśnie się kuje.`,
        en: match => `Path chosen: ${match[1]}. Your style is being forged.`,
      },
      {
        regex: /^Mission completed: (.+)\. Olympus grants (\d+) XP\.$/,
        pl: match => `Misja ukończona: ${match[1]}. Olimp przyznaje ${match[2]} XP.`,
        en: match => `Mission completed: ${match[1]}. Olympus grants ${match[2]} XP.`,
      },
      {
        regex: /^Achievement unlocked: (.+)\.$/,
        pl: match => `Odblokowano osiągnięcie: ${match[1]}.`,
        en: match => `Achievement unlocked: ${match[1]}.`,
      },
      {
        regex: /^Last sleep: ([\d.]+)h\. Low recovery weakens focus\.$/,
        pl: match => `Ostatni sen: ${match[1]} h. Słaba regeneracja obniża skupienie.`,
        en: match => `Last sleep: ${match[1]}h. Low recovery weakens focus.`,
      },
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) return S.language === 'en' ? pattern.en(match) : pattern.pl(match);
    }
    return text;
  }

  function adaptZeusMessage(base, context = 'neutral') {
    const localizedBase = localizeZeusBaseMessage(base);
    const style = S.zeusStyle || 'balanced';
    if (style === 'supportive') {
      if (context === 'negative') {
        return S.language === 'en'
          ? `Steady now. ${localizedBase}`
          : `Spokojnie, wracamy do rytmu. ${localizedBase}`;
      }
      return S.language === 'en'
        ? `Good momentum. ${localizedBase}`
        : `Dobry kierunek. ${localizedBase}`;
    }
    if (style === 'strict') {
      if (context === 'negative') {
        return S.language === 'en'
          ? `Weak discipline. ${localizedBase}`
          : `Za mało dyscypliny. ${localizedBase}`;
      }
      return S.language === 'en'
        ? `Stay sharp. ${localizedBase}`
        : `Trzymaj ostrość. ${localizedBase}`;
    }
    if (context === 'negative') {
      return S.language === 'en'
        ? `Reset the rhythm. ${localizedBase}`
        : `Zresetuj rytm. ${localizedBase}`;
    }
    return S.language === 'en'
      ? `Keep building. ${localizedBase}`
      : `Buduj dalej. ${localizedBase}`;
  }


  function calculateSleepDurationHours(bedtime, wakeTime) {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    let bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin <= bedMin) wakeMin += 1440;
    return (wakeMin - bedMin) / 60;
  }

  async function getSkillState() {
    return await DB.getSetting('skill_state', { unlocked: [], spentPoints: 0, unbreakableUsed: false, comebackReady: false });
  }

  async function setSkillState(state) {
    await DB.setSetting('skill_state', state);
  }

  function hasSkill(state, skillId) {
    return (state?.unlocked || []).includes(skillId);
  }

  function allSkillsFlat() {
    return Object.values(SKILL_TREE).flat();
  }

  function getAppSettings() {
    const saved = getLS(APP_SETTINGS_KEY, {});
    return {
      language: saved.language || 'pl',
      theme: resolveThemeId(saved.theme || 'olympus'),
      uxMode: saved.uxMode === 'pro' ? 'pro' : 'zen',
      preferredExperience: saved.preferredExperience === 'pro' ? 'pro' : 'zen',
    };
  }

  function saveAppSettings(partial) {
    const merged = { ...getAppSettings(), ...partial };
    setLS(APP_SETTINGS_KEY, merged);
    return merged;
  }

  function setGoogleConnectionState(connected, accessToken = null) {
    S.googleConnected = !!connected;
    S.googleAccessToken = accessToken || null;
    if (S.googleConnected) localStorage.setItem(LS_KEYS.google, '1');
    else localStorage.removeItem(LS_KEYS.google);
    updateModeIndicator();
    refreshConnectionViews();
  }

  function refreshConnectionViews() {
    const walletText = S.walletAddress
      ? t('walletStatusConnected', { address: S.walletAddress })
      : t('walletStatusNone');
    const googleText = S.googleConnected
      ? t('googleStatusConnected')
      : t('googleStatusNone');

    if ($('walletAddressView')) $('walletAddressView').textContent = S.walletAddress || t('notConnected');
    if ($('settingsWalletStatus')) $('settingsWalletStatus').textContent = walletText;
    if ($('walletProfileInfo')) $('walletProfileInfo').textContent = walletText;
    if ($('settingsGoogleStatus')) $('settingsGoogleStatus').textContent = googleText;
    if ($('modeSplashStatus')) {
      if (!S.appMode) {
        $('modeSplashStatus').textContent = t('splashStatusIdle');
      } else {
        $('modeSplashStatus').textContent = S.appMode === 'monad'
          ? walletText
          : S.appMode === 'google'
            ? googleText
            : t('splashFootnote');
      }
    }
    if ($('btnDisconnectWallet')) $('btnDisconnectWallet').disabled = !S.walletAddress;
    if ($('btnDisconnectWalletSettings')) $('btnDisconnectWalletSettings').disabled = !S.walletAddress;
    if ($('btnGoogleDisconnect')) $('btnGoogleDisconnect').disabled = !S.googleConnected;
    updateDashboardCounters();
    renderBackupSafetyNet();
  }

  function openModeSplash(message = t('splashSub')) {
    document.body.classList.add('app-locked');
    $('modeSplash')?.classList.remove('hidden');
    if ($('modeSplashStatus')) $('modeSplashStatus').textContent = message;
    if ($('tutorialOverlay')) $('tutorialOverlay').style.display = 'none';
    if ($('onboardingOverlay')) $('onboardingOverlay').style.display = 'none';
    $('welcomeModal')?.classList.remove('open');
    closeResponsiveHeader();
  }

  const GOD_AVATARS = {
    poseidon:   { icon: '🔱', name: 'POSEJDON', tag: 'Władca mórz' },
    hephaestus: { icon: '🔨', name: 'HEFAJSTOS', tag: 'Kowal bogów' },
  };

  function applyTheme(themeName) {
    const resolvedTheme = resolveThemeId(themeName);
    S.theme = resolvedTheme;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    const god = GOD_AVATARS[resolvedTheme];
    const orbEl  = document.getElementById('zeusGodOrb');
    const nameEl = document.getElementById('zeusGodName');
    const tagEl  = document.getElementById('zeusGodTag');
    if (orbEl)  orbEl.textContent  = god ? god.icon : '⚡';
    if (nameEl) nameEl.textContent = god ? god.name : 'ZEUS';
    if (tagEl)  tagEl.textContent  = god ? god.tag  : 'Stróż skupienia';
  }

  const I18N = {
    pl: {
      splashSub: 'Wybierz, jak chcesz wejść do aplikacji.',
      splashLocal: 'Tryb lokalny',
      splashWallet: 'Połącz portfel',
      splashGoogle: 'Połącz Google',
      splashFootnote: 'Tryb lokalny trzyma wszystko na urządzeniu. Portfel odblokowuje akcje web3. Google dodaje kopię zapasową na Dysku.',
      splashStatusIdle: 'Nie wybrano jeszcze trybu połączenia.',
      logoSub: 'Lokalnie · Bez backendu · Bez chmury',
      uxModeZen: 'Zen',
      uxModePro: 'Pro',
      saveStatusLocal: 'Dane zapisane lokalnie',
      web3Panel: 'Panel Web3',
      web3Wallet: 'Portfel',
      web3Network: 'Sieć',
      web3Staked: 'Stakowane',
      web3Stake: 'Stakuj tokeny',
      web3Burn: 'Spal tokeny',
      web3Save: 'Zapisz postęp on-chain',
      trackerPanel: 'Aktywna sesja',
      focusHeroKicker: 'Focus flow',
      trackerHeroTitle: 'Buduj prawdziwe tempo skupienia, jedna porządna sesja na raz.',
      trackerHeroSub: 'Śledź pracę, chroń streak i utrzymuj cały system czytelny na każdym ekranie.',
      quickStartTitle: 'Szybki start',
      quickStartSummary: '3 kroki do pierwszej czystej sesji.',
      quickStartSummaryDone: 'Masz już pierwszy pełny cykl za sobą.',
      quickStartBadge: 'Onboarding',
      quickStart1: 'Dodaj zadanie',
      quickStart2: 'Uruchom sesję',
      quickStart3: 'Zamknij pierwszą sesję',
      focusTaskTitle: 'Dodaj jedno konkretne zadanie',
      focusTaskCopy: 'Nazwij najbliższy blok pracy tak, żeby od razu było jasne, co domykasz.',
      focusStartTitle: 'Uruchom jedną dominującą sesję',
      focusStartCopy: 'Najpierw włącz sesję. Reszta interfejsu dopasuje się do bieżącej pracy.',
      focusCompleteTitle: 'Zamknij sesję czysto',
      focusCompleteCopy: 'Gdy praca jest zrobiona, zakończ sesję i zapisz postęp, streak oraz XP.',
      statusIdle: 'Bezczynny',
      statusTracking: 'Trwa sesja',
      streakLabel: 'Streak: {value} dni',
      bestLabel: 'Best: {value} dni',
      trackerHelper: 'Jedna ukończona sesja dziennie podtrzymuje streak. Narzędzia poniżej pomagają utrzymać rytm bez zgadywania.',
      focusCyclePanel: 'Cykl skupienia',
      focusCycleCopy: 'Użyj prowadzonego sprintu skupienia z przerwą na regenerację. To uruchamia realną sesję i trzyma fazy cały czas na widoku.',
      focusFieldFocus: 'Skupienie',
      focusFieldRecovery: 'Regeneracja',
      focusCycleStart: 'Start cyklu',
      focusCycleRestart: 'Restart cyklu',
      focusCycleSkip: 'Następna faza',
      focusCycleToBreak: 'Przejdź do przerwy',
      focusCycleToFocus: 'Wróć do skupienia',
      focusCycleReady: 'Cykl gotowy',
      focusCycleFocus: 'Sprint skupienia',
      focusCycleBreak: 'Przerwa regeneracyjna',
      deepWork: 'Głębokie skupienie',
      exitDeepWork: 'Wyjdź z głębokiego skupienia',
      deepFocusLabel: 'Deep Focus',
      deepFocusCopy: 'Tylko bieżące zadanie, licznik i czyste domknięcie sesji.',
      deepFocusNeedsSession: 'Najpierw uruchom sesję, potem wchodź w Deep Focus.',
      soundOn: 'Dźwięk włączony',
      soundOff: 'Dźwięk wyłączony',
      taskPlaceholder: 'Nad czym teraz pracujesz?',
      fatigueHint: 'Zmęczenie rośnie',
      refreshData: 'Odśwież dane',
      startSessionPrimary: 'Uruchom sesję skupienia',
      completeSession: 'Zakończ sesję',
      stopEarly: 'Zatrzymaj za wcześnie',
      focusHintIdle: 'Dodaj zadanie, a potem od razu wciśnij główny przycisk startu.',
      focusHintReady: 'Zadanie jest gotowe. Teraz odpal sesję i odetnij resztę szumu.',
      focusHintActive: 'Sesja trwa. Chroń rytm i nie rozdrabniaj uwagi.',
      focusHintNoSession: 'Najpierw wystartuj sesję, żeby mieć co domknąć.',
      focusHintCompleteReady: 'Masz już pełną sesję. Domknij ją czysto i odbierz XP.',
      focusHintCompleteWait: 'Daj sobie chwilę więcej. Zbyt krótka sesja liczy się jako zerwana próba.',
      zeusPanel: 'Asystent Zeus',
      zeusTagline: 'Przewodnik skupienia',
      zeusDefaultMessage: 'Twój ruch.',
      zeusLineIdle: 'Twój ruch.',
      zeusLineActive: 'Wchodź.',
      zeusLineSuccess: 'Czysta sesja.',
      zeusLineFail: 'Zerwałeś to.',
      zeusCoachIdle: 'Jedno zadanie. Jeden start.',
      zeusCoachActive: 'Trzymaj jeden cel aż do końca.',
      zeusCoachSuccess: 'XP, streak i rytm są zapisane.',
      zeusCoachFail: 'Wróć szybko, zanim rytm siądzie.',
      zeusNudgeIdle: 'Gdy sesja ruszy, wejdź w Deep Focus.',
      zeusNudgeActive: 'Zero przełączania. Jedna rzecz na raz.',
      zeusNudgeSuccess: 'Złap kolejną sesję, zanim energia spadnie.',
      zeusNudgeFail: 'Nazwij task krócej i zacznij od nowa.',
      zeusStateIdle: 'Idle',
      zeusStateActive: 'Focus active',
      zeusStateSuccess: 'Success',
      zeusStateFailure: 'Failure',
      zeusActionFocus: 'Sprint',
      zeusActionStreak: 'Chroń streak',
      zeusActionRecover: 'Regeneracja',
      routinesPanel: 'Codzienne rytuały',
      routineMorning: 'Poranek',
      routineEvening: 'Wieczór',
      routinePlaceholder: 'Dodaj krok rytuału...',
      add: 'Dodaj',
      noMorningRoutine: 'Brak porannego rytuału.',
      noEveningRoutine: 'Brak wieczornego rytuału.',
      routineSectionMorning: 'Poranek',
      routineSectionEvening: 'Wieczór',
      missionsPanel: 'Misje dnia',
      advStatsPanel: 'Zaawansowane statystyki',
      achievementsPanel: 'Osiągnięcia Olimpu',
      glancePanel: 'Dzisiejszy przegląd',
      statFocusTime: 'Czas skupienia',
      statEfficiency: 'Efektywność',
      statSessions: 'Sesje',
      statStreak: 'Streak',
      statTrend: 'Trend',
      statBenchmark: 'Ty vs średnia',
      detailedReport: 'Szczegółowy raport',
      quickActionsPanel: 'Jednym kliknięciem',
      quickWaterTitle: 'Wypiłem wodę',
      quickWaterSub: '+250 ml i szybki wpis zdrowia',
      quickMealTitle: 'Zjadłem posiłek',
      quickMealSub: 'Dodaj log bez wchodzenia do zakładki Health',
      quickMoveTitle: 'Krótki ruch',
      quickMoveSub: '+5 min resetu dla ciała i głowy',
      quickActionNote: 'FocusOS zapisuje te akcje lokalnie i od razu aktualizuje wskaźniki.',
      recentSessions: 'Ostatnie sesje',
      filterToday: 'Dziś',
      filterAll: 'Całość',
      saveGoal: 'Zapisz cel',
      noGoalSet: 'Brak ustawionego celu.',
      goalCompleted: 'Cel ukończony ({done} / {goal} min)',
      goalProgress: 'Postęp: {done} / {goal} min',
      settingsLanguagePanel: 'Język',
      settingsLanguageLabel: 'Język interfejsu',
      settingsThemePanel: 'Motyw',
      settingsThemeLabel: 'Wybierz styl aplikacji',
      hardcoreLabel: 'Hardcore Mode',
      hardcoreHelp: 'Przycisk Stop jest blokowany podczas aktywnej sesji.',
      zeusStyleLabel: 'Głos Zeusa',
      zeusStyleHelp: 'Wybierz, jak Zeus ma do Ciebie mówić.',
      skillTreePanel: 'Drzewko umiejętności',
      skillPointsLabel: 'Punkty umiejętności: {value}',
      skillStateUnlocked: 'Unlocked',
      skillStateReady: 'Ready',
      skillStateLocked: 'Locked',
      connectionsPanel: 'Połączenia i kopie zapasowe',
      connectionsCopy: 'Tutaj zarządzasz instalacją aplikacji, backupem Google Drive i dostępem do portfela.',
      wallet: 'Portfel',
      google: 'Google',
      connectWallet: 'Połącz portfel',
      disconnectWallet: 'Rozłącz portfel',
      connectGoogle: 'Połącz Google',
      disconnectGoogle: 'Rozłącz Google',
      installButton: 'Zainstaluj FocusOS',
      backupGoogle: 'Backup na Google Drive',
      accessScreen: 'Ekran dostępu',
      retro: 'Retro wpis',
      alerts: 'Alerty',
      exportCSV: 'Eksport CSV',
      exportJSON: 'Eksport JSON',
      importJSON: 'Import JSON',
      installHint: 'Przycisk instalacji pojawia się automatycznie, gdy przeglądarka zgłosi obsługę PWA.',
      walletStatusNone: 'Brak podłączonego portfela.',
      walletStatusConnected: 'Połączony portfel: {address}',
      googleStatusNone: 'Backup Google Drive nie jest podłączony.',
      googleStatusConnected: 'Backup Google Drive jest podłączony.',
      notConnected: 'Niepołączono',
      aboutPanel: 'FocusOS - lokalna inteligencja produktywności',
      aboutTitle: 'FocusOS - lokalna inteligencja produktywności',
      aboutCopy1: 'FocusOS to narzędzie produktywności zbudowane w filozofii <strong>Local-First</strong>: bez backendu, bez zewnętrznej chmury i z pełną kontrolą nad danymi.',
      aboutCopy2: 'Dane zostają na urządzeniu (IndexedDB i localStorage), a eksport lub backup uruchamiasz tylko wtedy, kiedy sam chcesz.',
      welcomeKicker: 'FocusOS 2.0',
      welcomeTitleMain: 'Jak chcesz zacząć?',
      welcomeSubtitle: 'Najpierw pokażemy Ci tylko to, co potrzebne, a reszta odblokuje się z czasem albo na Twoje życzenie.',
      welcomeModeZenTag: 'Tryb Zen',
      welcomeModeZenTitle: 'Tylko skupienie',
      welcomeModeZenCopy: 'Minimalny timer, zadanie, delikatny Zeus i zero przeładowania.',
      welcomeModeProTag: 'Tryb Pro',
      welcomeModeProTitle: 'Pełny biohacking',
      welcomeModeProCopy: 'Pokaż podgląd wszystkich modułów, a blokady zdejmuj wraz z postępem.',
      welcomeTourTitle: 'Samouczek One-Click',
      welcomeTourStep1: 'Start uruchamia pierwszą sesję.',
      welcomeTourStep2: 'Kategorie uczą FocusOS, jak pracujesz.',
      welcomeTourStep3: 'Statystyki pokazują wnioski dopiero wtedy, gdy ich potrzebujesz.',
      welcomeFooter: 'Dane zapisują się lokalnie: IndexedDB · localStorage · bez własnej chmury',
      welcomeSkip: 'Pomiń teraz',
      welcomeEnter: 'Wejdź do aplikacji',
      backupPromptText: 'Masz już sporo cennych danych. Zrób kopię zapasową, aby ich nie stracić.',
      backupOpenSettings: 'Otwórz kopie zapasowe',
      profileDayplan: 'Plan dnia',
      profileNotes: 'Notatki snu',
      profileSocials: 'Sociale',
      profileWallet: 'Portfel',
      profileSaveSocials: 'Zapisz linki',
      profileRestartGuide: 'Uruchom samouczek ponownie',
      profileNoLinks: 'Brak zapisanych linków.',
      profileNoWallet: 'Brak podłączonego portfela.',
      profileTwitterLabel: 'Link do X / Twittera',
      profileDiscordLabel: 'Link do Discorda',
      profileTwitterPlaceholder: 'https://x.com/...',
      profileDiscordPlaceholder: 'https://discord.gg/...',
      start: 'Start',
      stop: 'Stop',
      titlePrefix: 'Tytuł: {title}',
      modeWallet: 'Tryb: portfel {address}',
      modeGoogle: 'Tryb: lokalny + Google',
      modeLocal: 'Tryb: lokalny offline',
      installUnavailable: 'Instalacja nie jest teraz dostępna. Otwórz aplikację przez HTTPS lub już jest zainstalowana.',
      installReady: 'Możesz teraz zainstalować aplikację.',
      installDone: 'Instalacja uruchomiona.',
      installDismissed: 'Instalacja anulowana.',
      alarmSet: 'Budzik ustawiony na',
      alarmCancelled: 'Budzik anulowany.',
      alarmIdle: 'Budzik nieaktywny.',
      backupMissingClient: 'Wklej swój Google Client ID w GOOGLE_CLIENT_ID.',
      backupDone: 'Backup wysłany na Google Drive jako FocusOS_Backup.json',
      backupFailed: 'Błąd backupu Google: ',
      tutorialDone: 'Samouczek zakończony',
      tutorialSkip: 'Pomiń',
      tutorialNext: 'Dalej →',
      tutorialFinish: 'Rozumiem ✓',
      onboardingSkip: 'Pomiń',
      onboardingNext: 'Dalej',
      onboardingFinish: 'Zamknij',
      rewardContinue: 'Dalej',
      levelRewardTitle: 'Nagroda poziomu odblokowana',
      levelRewardDefault: 'Odblokowano nową nagrodę.',
      resetCancel: 'Anuluj',
      languageSwitched: 'Język interfejsu zaktualizowany.',
      hardcoreConfirm: 'Tryb Hardcore V2: bez pauzy i bez anulowania. Sesja musi zostać ukończona albo zaliczona jako porażka. Kontynuować?',
      hardcoreEnabled: 'Tryb hardcore włączony.',
      hardcoreDisabled: 'Tryb hardcore wyłączony.',
      walletConnected: 'Portfel połączony.',
      walletDisconnected: 'Portfel rozłączony.',
      noActiveWallet: 'Brak aktywnego portfela.',
      accessScreenReopened: 'Ekran dostępu został ponownie otwarty.',
      dailyGoalSet: 'Ustawiono cel dzienny: {value} min.',
      dailyGoalCleared: 'Wyczyszczono cel dzienny.',
      focusSprintStarted: 'Sprint skupienia rozpoczęty.',
      recoveryBreakStarted: 'Przerwa regeneracyjna rozpoczęta.',
      focusCycleStarted: 'Cykl skupienia rozpoczęty.',
      focusSoundEnabled: 'Dźwięk cyklu skupienia włączony.',
      focusSoundMuted: 'Dźwięk cyklu skupienia wyciszony.',
      noSkillPoints: 'Brak dostępnych punktów umiejętności.',
      skillRequiresLevel: 'Wymagany poziom: {level}.',
      skillRequiresPrevious: 'Najpierw odblokuj poprzednią umiejętność.',
      googleServicesMissing: 'Usługi Google Identity Services nie zostały załadowane.',
      missingAccessToken: 'Brak tokenu dostępu.',
      googleConnectedToast: 'Google połączone.',
      googleNotConnected: 'Google nie jest połączone.',
      googleDisconnected: 'Google rozłączone.',
      connectionAttemptFailed: 'Nie udało się połączyć. Przechodzę do trybu lokalnego.',
      monadOnlyStake: 'Stakowanie działa tylko w trybie Monad.',
      stakeSuccess: 'Zastakowano 25 FCS. Łącznie: {total} FCS.',
      monadOnlyBurn: 'Spalanie działa tylko w trybie Monad.',
      burnSuccess: 'Symulacja spalania zakończona. Hook omijający karę zmęczenia można podpiąć on-chain.',
      monadOnlyChainSave: 'Zapis on-chain działa tylko w trybie Monad.',
      chainSaveSuccess: 'Postęp podpisany i wysłany w symulacji.',
      chainSaveCanceled: 'Podpis anulowany: {message}',
      noWalletChainSave: 'Nie wykryto portfela. Zakończono lokalną symulację zapisu on-chain.',
      socialsSaved: 'Linki społecznościowe zapisane.',
      recoveryBreakPrepared: 'Przerwa regeneracyjna gotowa. Zapisz sen albo zrób porządny reset.',
      dayPlanEmpty: 'Brak punktów planu na dziś.',
      sleepNotesEmpty: 'Brak notatek snu.',
      hardcoreRefreshFail: 'Sesja hardcore przerwana po odświeżeniu. XP -{value}.',
      taskNameRequired: 'Wpisz nazwę zadania.',
      taskStartToast: 'Start: "{name}"',
      genericError: 'Błąd: {message}',
      hardcoreWaitPhase: 'Tryb hardcore: poczekaj na zakończenie fazy.',
      levelUpToast: 'Awans! Wszedłeś na poziom {level} - {title}.',
      sessionCompletedToast: 'Sesja zakończona: "{name}" (+{xp} XP)',
      sessionStoppedToast: 'Sesja zatrzymana: "{name}"',
      xpPenaltyToast: 'Kara XP: -{value}',
      notificationsEnabled: 'Powiadomienia włączone.',
      settingsSaved: 'Ustawienia zapisane.',
      focusSprintFallbackName: 'Sesja sprintu skupienia',
      themeNames: {
        olympus: 'Krystaliczny fokus',
        marble: 'Jasny poranek',
        ember: 'Ciepły zmierzch',
        tide: 'Spokojny przypływ',
        poseidon: 'Głębia Posejdona',
        hephaestus: 'Kuźnia Hefajstosa',
      },
      zeusVoices: {
        strict: 'Dowódca',
        balanced: 'Mentor',
        supportive: 'Iskra',
      },
      tabs: {
        tracker: 'Skupienie',
        daily: 'Statystyki',
        weekly: 'Raport',
        health: 'Zdrowie',
        sleep: 'Sen',
        settings: 'Ustawienia',
        about: 'O aplikacji',
        profile: 'Profil',
      },
    },
    en: {
      splashSub: 'Choose how you want to enter the app.',
      splashLocal: 'Local mode',
      splashWallet: 'Connect wallet',
      splashGoogle: 'Connect Google',
      splashFootnote: 'Local mode keeps everything on-device. Wallet mode unlocks web3 actions. Google mode adds Drive backup.',
      splashStatusIdle: 'No connection selected yet.',
      logoSub: 'Local-first · No backend · No cloud',
      uxModeZen: 'Zen',
      uxModePro: 'Pro',
      saveStatusLocal: 'Saved locally',
      web3Panel: 'Web3 dashboard',
      web3Wallet: 'Wallet',
      web3Network: 'Network',
      web3Staked: 'Staked',
      web3Stake: 'Stake tokens',
      web3Burn: 'Burn tokens',
      web3Save: 'Save progress on-chain',
      trackerPanel: 'Active session',
      focusHeroKicker: 'Focus flow',
      trackerHeroTitle: 'Build real focus momentum, one clean session at a time.',
      trackerHeroSub: 'Track work, protect your streak, and keep the whole system readable on every screen.',
      quickStartTitle: 'Quick start',
      quickStartSummary: '3 steps to your first clean session.',
      quickStartSummaryDone: 'Your first full focus loop is done.',
      quickStartBadge: 'Onboarding',
      quickStart1: 'Add a task',
      quickStart2: 'Start a session',
      quickStart3: 'Finish your first session',
      focusTaskTitle: 'Add one concrete task',
      focusTaskCopy: 'Name the next work block clearly enough that the finish line is obvious.',
      focusStartTitle: 'Start one dominant session',
      focusStartCopy: 'Launch the session first. The rest of the interface should orbit the work in front of you.',
      focusCompleteTitle: 'Finish the session clean',
      focusCompleteCopy: 'When the work is done, close the session and bank the progress, streak, and XP.',
      statusIdle: 'Idle',
      statusTracking: 'Tracking',
      streakLabel: 'Streak: {value} days',
      bestLabel: 'Best: {value} days',
      trackerHelper: 'One completed focus session per day keeps the streak alive. The tools below help you stay consistent without guesswork.',
      focusCyclePanel: 'Focus cycle',
      focusCycleCopy: 'Use a guided focus sprint plus a recovery break. It starts a real session and keeps the current phase visible the whole time.',
      focusFieldFocus: 'Focus',
      focusFieldRecovery: 'Recovery',
      focusCycleStart: 'Start cycle',
      focusCycleRestart: 'Restart cycle',
      focusCycleSkip: 'Next phase',
      focusCycleToBreak: 'Start break',
      focusCycleToFocus: 'Back to focus',
      focusCycleReady: 'Cycle ready',
      focusCycleFocus: 'Focus sprint',
      focusCycleBreak: 'Recovery break',
      deepWork: 'Deep Focus',
      exitDeepWork: 'Exit Deep Focus',
      deepFocusLabel: 'Deep Focus',
      deepFocusCopy: 'Only the current task, the timer, and a clean way to finish.',
      deepFocusNeedsSession: 'Start a session before entering Deep Focus.',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      taskPlaceholder: 'What are you working on?',
      fatigueHint: 'Fatigue is rising',
      refreshData: 'Refresh data',
      startSessionPrimary: 'Start focus session',
      completeSession: 'Complete session',
      stopEarly: 'Stop early',
      focusHintIdle: 'Add a task, then hit the main start button immediately.',
      focusHintReady: 'The task is ready. Start the session and cut the extra noise.',
      focusHintActive: 'The session is live. Protect the rhythm and keep your attention narrow.',
      focusHintNoSession: 'Start a session first so there is something real to finish.',
      focusHintCompleteReady: 'You have a full session. Close it clean and bank the XP.',
      focusHintCompleteWait: 'Give it a little longer. A short stop still counts as a broken run.',
      zeusPanel: 'Zeus assistant',
      zeusTagline: 'Focus guide',
      zeusDefaultMessage: 'Your move.',
      zeusLineIdle: 'Your move.',
      zeusLineActive: 'Lock in.',
      zeusLineSuccess: 'Clean session.',
      zeusLineFail: 'You broke it.',
      zeusCoachIdle: 'One task. One start.',
      zeusCoachActive: 'Hold one target to the end.',
      zeusCoachSuccess: 'XP, streak, and rhythm are stored.',
      zeusCoachFail: 'Get back in before the rhythm slips.',
      zeusNudgeIdle: 'Once the session starts, go Deep Focus.',
      zeusNudgeActive: 'No tab-hopping. One thing at a time.',
      zeusNudgeSuccess: 'Catch the next session before the energy drops.',
      zeusNudgeFail: 'Name the task tighter and restart.',
      zeusStateIdle: 'Idle',
      zeusStateActive: 'Focus active',
      zeusStateSuccess: 'Success',
      zeusStateFailure: 'Failure',
      zeusActionFocus: 'Sprint',
      zeusActionStreak: 'Protect streak',
      zeusActionRecover: 'Recover',
      routinesPanel: 'Daily routines',
      routineMorning: 'Morning',
      routineEvening: 'Evening',
      routinePlaceholder: 'Add a routine step...',
      add: 'Add',
      noMorningRoutine: 'No morning routine yet.',
      noEveningRoutine: 'No evening routine yet.',
      routineSectionMorning: 'Morning',
      routineSectionEvening: 'Evening',
      missionsPanel: 'Daily missions',
      advStatsPanel: 'Advanced stats',
      achievementsPanel: 'Olympus achievements',
      glancePanel: 'Today at a glance',
      statFocusTime: 'Focus time',
      statEfficiency: 'Efficiency',
      statSessions: 'Sessions',
      statStreak: 'Streak',
      statTrend: 'Trend',
      statBenchmark: 'You vs average',
      detailedReport: 'Detailed report',
      quickActionsPanel: 'One-tap logging',
      quickWaterTitle: 'Drank water',
      quickWaterSub: '+250 ml and a fast health log',
      quickMealTitle: 'Ate a meal',
      quickMealSub: 'Add a log without opening Health',
      quickMoveTitle: 'Quick movement',
      quickMoveSub: '+5 min reset for body and mind',
      quickActionNote: 'FocusOS saves these actions locally and refreshes the indicators right away.',
      recentSessions: 'Recent sessions',
      filterToday: 'Today',
      filterAll: 'All time',
      saveGoal: 'Save goal',
      noGoalSet: 'No goal set.',
      goalCompleted: 'Goal completed ({done} / {goal} min)',
      goalProgress: 'Progress: {done} / {goal} min',
      settingsLanguagePanel: 'Language',
      settingsLanguageLabel: 'Interface language',
      settingsThemePanel: 'Theme',
      settingsThemeLabel: 'Choose the app style',
      hardcoreLabel: 'Hardcore Mode',
      hardcoreHelp: 'The Stop button is disabled during an active session.',
      zeusStyleLabel: 'Zeus voice',
      zeusStyleHelp: 'Choose how Zeus talks to you.',
      skillTreePanel: 'Skill tree',
      skillPointsLabel: 'Skill points: {value}',
      skillStateUnlocked: 'Unlocked',
      skillStateReady: 'Ready',
      skillStateLocked: 'Locked',
      connectionsPanel: 'Connections and backups',
      connectionsCopy: 'Manage app install, Google Drive backup, and wallet access from one place.',
      wallet: 'Wallet',
      google: 'Google',
      connectWallet: 'Connect wallet',
      disconnectWallet: 'Disconnect wallet',
      connectGoogle: 'Connect Google',
      disconnectGoogle: 'Disconnect Google',
      installButton: 'Install FocusOS',
      backupGoogle: 'Backup to Google Drive',
      accessScreen: 'Access screen',
      retro: 'Retro entry',
      alerts: 'Alerts',
      exportCSV: 'Export CSV',
      exportJSON: 'Export JSON',
      importJSON: 'Import JSON',
      installHint: 'The install button appears automatically when your browser reports PWA install support.',
      walletStatusNone: 'No wallet connected.',
      walletStatusConnected: 'Connected wallet: {address}',
      googleStatusNone: 'Google Drive backup is not connected.',
      googleStatusConnected: 'Google Drive backup is connected.',
      notConnected: 'Not connected',
      aboutPanel: 'FocusOS - local productivity intelligence',
      aboutTitle: 'FocusOS - local productivity intelligence',
      aboutCopy1: 'FocusOS is a productivity tool built around a <strong>Local-First</strong> philosophy: no backend, no external cloud, and full control over your data.',
      aboutCopy2: 'Your data stays on the device (IndexedDB and localStorage), and you decide when to export or create a backup.',
      welcomeKicker: 'FocusOS 2.0',
      welcomeTitleMain: 'How do you want to begin?',
      welcomeSubtitle: 'We start with only what you need, and unlock the deeper layers over time or on demand.',
      welcomeModeZenTag: 'Zen mode',
      welcomeModeZenTitle: 'Focus only',
      welcomeModeZenCopy: 'Minimal timer, current task, gentle Zeus, and no visual overload.',
      welcomeModeProTag: 'Pro mode',
      welcomeModeProTitle: 'Full biohacking',
      welcomeModeProCopy: 'Show every module as a preview, then unlock them as progress grows.',
      welcomeTourTitle: 'One-click tutorial',
      welcomeTourStep1: 'Start launches your first session.',
      welcomeTourStep2: 'Categories teach FocusOS how you work.',
      welcomeTourStep3: 'Statistics appear only when you actually want them.',
      welcomeFooter: 'Data is saved locally: IndexedDB · localStorage · no private cloud',
      welcomeSkip: 'Skip for now',
      welcomeEnter: 'Enter the app',
      backupPromptText: 'You already have valuable data here. Create a backup so you do not lose it.',
      backupOpenSettings: 'Open backups',
      profileDayplan: 'Day plan',
      profileNotes: 'Sleep notes',
      profileSocials: 'Socials',
      profileWallet: 'Wallet',
      profileSaveSocials: 'Save links',
      profileRestartGuide: 'Run tutorial again',
      profileNoLinks: 'No saved links yet.',
      profileNoWallet: 'No wallet connected.',
      profileTwitterLabel: 'X / Twitter link',
      profileDiscordLabel: 'Discord link',
      profileTwitterPlaceholder: 'https://x.com/...',
      profileDiscordPlaceholder: 'https://discord.gg/...',
      start: 'Start',
      stop: 'Stop',
      titlePrefix: 'Title: {title}',
      modeWallet: 'Mode: wallet {address}',
      modeGoogle: 'Mode: local + Google',
      modeLocal: 'Mode: local offline',
      installUnavailable: 'Install prompt is unavailable right now. Use HTTPS or app may already be installed.',
      installReady: 'App can now be installed.',
      installDone: 'Install prompt opened.',
      installDismissed: 'Install was dismissed.',
      alarmSet: 'Alarm set to',
      alarmCancelled: 'Alarm canceled.',
      alarmIdle: 'Alarm is inactive.',
      backupMissingClient: 'Paste your Google Client ID in GOOGLE_CLIENT_ID.',
      backupDone: 'Backup uploaded to Google Drive as FocusOS_Backup.json',
      backupFailed: 'Google backup failed: ',
      tutorialDone: 'Tutorial completed',
      tutorialSkip: 'Skip',
      tutorialNext: 'Next →',
      tutorialFinish: 'Done ✓',
      onboardingSkip: 'Skip',
      onboardingNext: 'Next',
      onboardingFinish: 'Finish',
      rewardContinue: 'Continue',
      levelRewardTitle: 'Level reward unlocked',
      levelRewardDefault: 'A new reward has been unlocked.',
      resetCancel: 'Cancel',
      languageSwitched: 'Interface language updated.',
      hardcoreConfirm: 'Hardcore Mode V2: no pause and no cancel. The session must finish or fail. Continue?',
      hardcoreEnabled: 'Hardcore mode enabled.',
      hardcoreDisabled: 'Hardcore mode disabled.',
      walletConnected: 'Wallet connected.',
      walletDisconnected: 'Wallet disconnected.',
      noActiveWallet: 'No active wallet connected.',
      accessScreenReopened: 'Access screen reopened.',
      dailyGoalSet: 'Daily goal set: {value} min.',
      dailyGoalCleared: 'Daily goal cleared.',
      focusSprintStarted: 'Focus sprint started.',
      recoveryBreakStarted: 'Recovery break started.',
      focusCycleStarted: 'Focus cycle started.',
      focusSoundEnabled: 'Focus cycle sound enabled.',
      focusSoundMuted: 'Focus cycle sound muted.',
      noSkillPoints: 'No skill points available.',
      skillRequiresLevel: 'Requires level {level}.',
      skillRequiresPrevious: 'Unlock the previous skill first.',
      googleServicesMissing: 'Google Identity Services did not load.',
      missingAccessToken: 'Missing access token.',
      googleConnectedToast: 'Google connected.',
      googleNotConnected: 'Google is not connected.',
      googleDisconnected: 'Google disconnected.',
      connectionAttemptFailed: 'Connection failed. Switching to local mode.',
      monadOnlyStake: 'Staking is available in Monad mode only.',
      stakeSuccess: 'Staked 25 FCS. Total staked: {total} FCS.',
      monadOnlyBurn: 'Burn is available in Monad mode only.',
      burnSuccess: 'Burn simulation complete. A fatigue-penalty bypass hook can be implemented on-chain.',
      monadOnlyChainSave: 'On-chain save is available in Monad mode only.',
      chainSaveSuccess: 'Progress signed and submitted in simulation.',
      chainSaveCanceled: 'Signature canceled: {message}',
      noWalletChainSave: 'No wallet detected. Local on-chain save simulation completed.',
      socialsSaved: 'Social links saved.',
      recoveryBreakPrepared: 'Recovery break is ready. Log sleep or take a proper reset.',
      dayPlanEmpty: 'No day-plan items yet.',
      sleepNotesEmpty: 'No sleep notes yet.',
      hardcoreRefreshFail: 'Hardcore session failed after refresh. XP -{value}.',
      taskNameRequired: 'Enter a task name.',
      taskStartToast: 'Start: "{name}"',
      genericError: 'Error: {message}',
      hardcoreWaitPhase: 'Hardcore mode: wait for the phase to finish.',
      levelUpToast: 'Level up! You reached level {level} - {title}.',
      sessionCompletedToast: 'Session completed: "{name}" (+{xp} XP)',
      sessionStoppedToast: 'Session stopped: "{name}"',
      xpPenaltyToast: 'XP penalty: -{value}',
      notificationsEnabled: 'Notifications enabled.',
      settingsSaved: 'Settings saved.',
      focusSprintFallbackName: 'Focus sprint session',
      themeNames: {
        olympus: 'Crystal focus',
        marble: 'Bright morning',
        ember: 'Warm dusk',
        tide: 'Calm tide',
        poseidon: 'Poseidon\'s Deep',
        hephaestus: 'Forge of Hephaestus',
      },
      zeusVoices: {
        strict: 'Commander',
        balanced: 'Mentor',
        supportive: 'Spark',
      },
      tabs: {
        tracker: 'Focus',
        daily: 'Stats',
        weekly: 'Report',
        health: 'Health',
        sleep: 'Sleep',
        settings: 'Settings',
        about: 'About',
        profile: 'Profile',
      },
    },
  };

  const t = (key, params = {}) => {
    const langPack = I18N[S.language] || I18N.pl;
    const fallbackPack = I18N.pl;
    const resolve = pack => key.split('.').reduce((acc, part) => acc?.[part], pack);
    const value = resolve(langPack) ?? resolve(fallbackPack) ?? key;
    if (typeof value !== 'string') return value;
    return value.replace(/\{(\w+)\}/g, (_, token) => {
      if (token in params) return String(params[token]);
      return `{${token}}`;
    });
  };

  function applyStaticTranslations() {
    setText('.splash-sub', t('splashSub'));
    setText('#btnModeLocal', t('splashLocal'));
    setText('#btnModeMonad', t('splashWallet'));
    setText('#btnModeGoogle', t('splashGoogle'));
    setText('.splash-footnote', t('splashFootnote'));
    setText('.logo-sub', t('logoSub'));
    setText('#btnZenMode', t('uxModeZen'));
    setText('#btnProMode', t('uxModePro'));
    setText('#saveStatus', t('saveStatusLocal'));
    setText('.panel--web3 .panel-label', t('web3Panel'));
    setText('.web3-grid > div:nth-child(1) .web3-k', t('web3Wallet'));
    setText('.web3-grid > div:nth-child(2) .web3-k', t('web3Network'));
    setText('.web3-grid > div:nth-child(3) .web3-k', t('web3Staked'));
    setText('#btnStakeTokens', t('web3Stake'));
    setText('#btnBurnTokens', t('web3Burn'));
    setText('#btnSaveToChain', t('web3Save'));
    setText('.panel--tracker-main .panel-label', t('trackerPanel'));
    setText('#focusHeroKicker', t('focusHeroKicker'));
    setText('.tracker-hero-title', t('trackerHeroTitle'));
    setText('.tracker-hero-sub', t('trackerHeroSub'));
    setText('.tracker-helper', t('trackerHelper'));
    setText('#fatigueHint', t('fatigueHint'));
    setText('.quick-start-title', t('quickStartTitle'));
    setText('#quickStartSummary', t('quickStartSummary'));
    setText('#quickStartBadge', t('quickStartBadge'));
    const quickStart = document.querySelectorAll('.quick-start-list li');
    if (quickStart[0]) quickStart[0].textContent = t('quickStart1');
    if (quickStart[1]) quickStart[1].textContent = t('quickStart2');
    if (quickStart[2]) quickStart[2].textContent = t('quickStart3');
    setText('#focusTaskTitle', t('focusTaskTitle'));
    setText('#focusTaskCopy', t('focusTaskCopy'));
    setText('#focusStartTitle', t('focusStartTitle'));
    setText('#focusStartCopy', t('focusStartCopy'));
    setText('#focusCompleteTitle', t('focusCompleteTitle'));
    setText('#focusCompleteCopy', t('focusCompleteCopy'));
    setText('.panel--focus-cycle .panel-label', t('focusCyclePanel'));
    setText('.panel--focus-cycle .panel-copy', t('focusCycleCopy'));
    const focusLabels = document.querySelectorAll('.focus-cycle-field span');
    if (focusLabels[0]) focusLabels[0].textContent = t('focusFieldFocus');
    if (focusLabels[1]) focusLabels[1].textContent = t('focusFieldRecovery');
    setPlaceholder('#taskName', t('taskPlaceholder'));
    setText('#btnStart', t('startSessionPrimary'));
    setText('#btnStop', t('completeSession'));
    setText('#btnDeepFocusStop', t('completeSession'));
    setText('#flowPrimaryHint', t('focusHintIdle'));
    setText('#flowCompletionHint', t('focusHintNoSession'));
    setText('#btnRefresh', t('refreshData'));
    setText('.panel--zeus .panel-label', t('zeusPanel'));
    setText('.zeus-badge', t('zeusTagline'));
    setText('#zeusMood', t('zeusStateIdle'));
    if ($('zeusMessage') && !$('zeusMessage').dataset.dynamic) $('zeusMessage').textContent = t('zeusDefaultMessage');
    setText('#zeusCoachline', t('zeusCoachIdle'));
    setText('#zeusNudge', t('zeusNudgeIdle'));
    setText('#btnZeusFocus', t('zeusActionFocus'));
    setText('#btnZeusStreak', t('zeusActionStreak'));
    setText('#btnZeusRecover', t('zeusActionRecover'));
    setText('#deepFocusLabel', t('deepFocusLabel'));
    setText('#deepFocusCopy', t('deepFocusCopy'));
    setText('.panel--routines .panel-label', t('routinesPanel'));
    const routineOptions = document.querySelectorAll('#routineType option');
    if (routineOptions[0]) routineOptions[0].textContent = t('routineMorning');
    if (routineOptions[1]) routineOptions[1].textContent = t('routineEvening');
    setPlaceholder('#routineInput', t('routinePlaceholder'));
    setText('#btnAddRoutine', t('add'));
    const routineTitles = document.querySelectorAll('.routine-title');
    if (routineTitles[0]) routineTitles[0].textContent = t('routineSectionMorning');
    if (routineTitles[1]) routineTitles[1].textContent = t('routineSectionEvening');
    setText('#routineMorningList .health-empty', t('noMorningRoutine'));
    setText('#routineEveningList .health-empty', t('noEveningRoutine'));
    setText('.panel--missions .panel-label', t('missionsPanel'));
    setText('.panel--advstats .panel-label', t('advStatsPanel'));
    setText('.panel--achievements .panel-label', t('achievementsPanel'));
    setText('.panel-label[style*="margin-top:14px"]', t('glancePanel'));
    const qsKeys = document.querySelectorAll('.qs-key');
    if (qsKeys[0]) qsKeys[0].textContent = t('statFocusTime');
    if (qsKeys[1]) qsKeys[1].textContent = t('statEfficiency');
    if (qsKeys[2]) qsKeys[2].textContent = t('statSessions');
    if (qsKeys[3]) qsKeys[3].textContent = t('statStreak');
    if (qsKeys[4]) qsKeys[4].textContent = t('statTrend');
    setText('.lb-title', t('statBenchmark'));
    setText('.panel--log .panel-label', t('recentSessions'));
    setText('#btnFilterToday', t('filterToday'));
    setText('#btnFilterAll', t('filterAll'));
    setText('#btnSaveGoal', t('saveGoal'));
    setText('#btnDetailedReport', t('detailedReport'));
    setText('.panel--daily-donut .panel-label', S.language === 'en' ? 'Time by category' : 'Czas per kategoria');
    setText('.panel--daily-hours .panel-label', S.language === 'en' ? 'Hourly layout' : 'Rozkład godzinowy');
    setText('.panel--golden .panel-label', S.language === 'en' ? 'Golden hours - K-Means (k=2)' : 'Złote godziny - K-Means (k=2)');
    setText('.panel--daily-insights .panel-label', S.language === 'en' ? 'Daily insights' : 'Wnioski dnia');
    setText('.panel--day-plan .panel-label', S.language === 'en' ? 'Day plan' : 'Plan dnia');
    setText('.panel--week-bars .panel-label', S.language === 'en' ? 'Daily time (h)' : 'Czas dzienny (h)');
    setText('.panel--ema .panel-label', S.language === 'en' ? 'Productivity trend - EMA (14 days)' : 'Trend produktywności - EMA (14 dni)');
    setText('.panel--markov .panel-label', S.language === 'en' ? 'Activity sequence - Markov chain' : 'Sekwencje aktywności - Markov Chain');
    setText('.panel--bayes .panel-label', S.language === 'en' ? 'Bayesian time estimates by category' : 'Bayesian - estymacje czasu per kategoria');
    setText('.panel--week-insights .panel-label', S.language === 'en' ? 'Weekly insights' : 'Wnioski tygodniowe');
    setText('.panel--water .panel-label', S.language === 'en' ? 'Hydration' : 'Nawodnienie');
    setText('.panel--meals .panel-label', S.language === 'en' ? 'Meals' : 'Posiłki');
    setText('.panel--movement .panel-label', S.language === 'en' ? 'Movement' : 'Ruch fizyczny');
    setText('.water-info', S.language === 'en' ? 'Tap a glass to log 250 ml:' : 'Kliknij szklankę, aby zalogować 250 ml:');
    setText('#btnWaterUndo', S.language === 'en' ? 'Undo last' : 'Cofnij ostatnią');
    setText('#btnLogMeal', S.language === 'en' ? '+ Add' : '+ Dodaj');
    setText('.panel--sleep-calc .panel-label', S.language === 'en' ? 'Sleep cycle calculator' : 'Kalkulator cykli snu');
    setText('.panel--sleep-log .panel-label', S.language === 'en' ? 'Log last sleep' : 'Loguj ostatni sen');
    setText('.panel--sleep-hist .panel-label', S.language === 'en' ? 'Sleep history (last 7 days)' : 'Historia snu (ostatnie 7 dni)');
    setText('.panel--sleep-alarm .panel-label', S.language === 'en' ? 'Local alarm' : 'Budzik lokalny');
    setText('.panel--sleep-notes .panel-label', S.language === 'en' ? 'Dream notes' : 'Notes snów');
    setText('#btnCalcSleep', S.language === 'en' ? 'Calculate' : 'Oblicz');
    setText('#btnLogSleep', S.language === 'en' ? 'Save sleep' : 'Zapisz sen');
    setText('#btnSetAlarm', S.language === 'en' ? 'Set alarm' : 'Ustaw budzik');
    setText('#btnCancelAlarm', S.language === 'en' ? 'Cancel' : 'Anuluj');
    setText('#btnAddSleepNote', t('add'));
    setText('#btnAddSleepNoteProfile', t('add'));
    setText('#btnAddDayPlan', t('add'));
    setText('#btnAddDayPlanProfile', t('add'));
    setText('.panel--quick-actions .panel-label', t('quickActionsPanel'));
    setText('#btnQuickWater strong', t('quickWaterTitle'));
    setText('#btnQuickWater span', t('quickWaterSub'));
    setText('#btnQuickMeal strong', t('quickMealTitle'));
    setText('#btnQuickMeal span', t('quickMealSub'));
    setText('#btnQuickMove strong', t('quickMoveTitle'));
    setText('#btnQuickMove span', t('quickMoveSub'));
    setText('.quick-action-note', t('quickActionNote'));
    setText('#backupPromptText', t('backupPromptText'));
    setText('#btnBackupOpenSettings', t('backupOpenSettings'));
    setText('.panel--settings-language .panel-label', t('settingsLanguagePanel'));
    setText('.panel--settings-language .form-label', t('settingsLanguageLabel'));
    setText('.panel--settings-theme .panel-label', t('settingsThemePanel'));
    setText('.panel--settings-theme .form-label', t('settingsThemeLabel'));
    const notifLabels = document.querySelectorAll('.panel--settings-theme .notif-label');
    if (notifLabels[0]) {
      const small = notifLabels[0].querySelector('small');
      notifLabels[0].childNodes[0].textContent = t('hardcoreLabel');
      if (small) small.textContent = t('hardcoreHelp');
    }
    if (notifLabels[1]) {
      const small = notifLabels[1].querySelector('small');
      notifLabels[1].childNodes[0].textContent = t('zeusStyleLabel');
      if (small) small.textContent = t('zeusStyleHelp');
    }
    setText('.panel--skilltree .panel-label', t('skillTreePanel'));
    setText('.panel--settings-sync .panel-label', t('connectionsPanel'));
    setText('.panel--settings-sync > p', t('connectionsCopy'));
    setText('.connection-card:nth-child(1) .connection-title', t('wallet'));
    setText('.connection-card:nth-child(2) .connection-title', t('google'));
    setText('#btnConnectWalletSettings', t('connectWallet'));
    setText('#btnDisconnectWalletSettings', t('disconnectWallet'));
    setText('#btnGoogleConnect', t('connectGoogle'));
    setText('#btnGoogleDisconnect', t('disconnectGoogle'));
    setText('#installButton', t('installButton'));
    setText('#btnGoogleBackup', t('backupGoogle'));
    setText('#btnShowAccessScreen', t('accessScreen'));
    setText('#btnOpenBackfill', t('retro'));
    setText('#btnOpenNotif', t('alerts'));
    setText('#btnExport', t('exportCSV'));
    setText('#btnExportJSON', t('exportJSON'));
    setText('#btnImportJSON', t('importJSON'));
    setText('#installHint', t('installHint'));
    setText('.panel--about .panel-label', t('aboutPanel'));
    setText('.panel--about h2', t('aboutTitle'));
    setHTML('.panel--about p:nth-of-type(1)', t('aboutCopy1'));
    setHTML('.panel--about p:nth-of-type(2)', t('aboutCopy2'));
    const profileNav = document.querySelectorAll('.profile-nav-btn');
    if (profileNav[0]) profileNav[0].childNodes[2].textContent = t('profileDayplan');
    if (profileNav[1]) profileNav[1].childNodes[2].textContent = t('profileNotes');
    if (profileNav[2]) profileNav[2].childNodes[2].textContent = t('profileSocials');
    if (profileNav[3]) profileNav[3].childNodes[2].textContent = t('profileWallet');
    setText('[data-dashboard-panel="socials"] .panel-label', t('profileSocials'));
    setText('[data-dashboard-panel="wallet"] .panel-label', t('profileWallet'));
    setText('[data-dashboard-panel="socials"] .form-group:nth-child(1) .form-label', t('profileTwitterLabel'));
    setText('[data-dashboard-panel="socials"] .form-group:nth-child(2) .form-label', t('profileDiscordLabel'));
    setPlaceholder('#socialTwitter', t('profileTwitterPlaceholder'));
    setPlaceholder('#socialDiscord', t('profileDiscordPlaceholder'));
    setText('#btnSaveSocials', t('profileSaveSocials'));
    setText('#btnRestartOnboarding', t('profileRestartGuide'));
    setText('#socialsPreview', t('profileNoLinks'));
    setText('#walletProfileInfo', t('profileNoWallet'));
    setText('#btnConnectWalletProfile', t('connectWallet'));
    setText('#btnDisconnectWallet', t('disconnectWallet'));
    setText('#welcomeKicker', t('welcomeKicker'));
    setText('#welcomeTitle', t('welcomeTitleMain'));
    setText('#welcomeSubtitle', t('welcomeSubtitle'));
    setText('#btnGoalZen .welcome-mode-tag', t('welcomeModeZenTag'));
    setText('#btnGoalZen strong', t('welcomeModeZenTitle'));
    setText('#btnGoalZen span:last-child', t('welcomeModeZenCopy'));
    setText('#btnGoalPro .welcome-mode-tag', t('welcomeModeProTag'));
    setText('#btnGoalPro strong', t('welcomeModeProTitle'));
    setText('#btnGoalPro span:last-child', t('welcomeModeProCopy'));
    setText('.welcome-tour-title', t('welcomeTourTitle'));
    const welcomeTour = document.querySelectorAll('.welcome-tour-list li');
    if (welcomeTour[0]) welcomeTour[0].innerHTML = `<strong>${S.language === 'en' ? 'Start' : 'Start'}</strong> ${t('welcomeTourStep1')}`;
    if (welcomeTour[1]) welcomeTour[1].innerHTML = `<strong>${S.language === 'en' ? 'Categories' : 'Kategorie'}</strong> ${t('welcomeTourStep2')}`;
    if (welcomeTour[2]) welcomeTour[2].innerHTML = `<strong>${S.language === 'en' ? 'Statistics' : 'Statystyki'}</strong> ${t('welcomeTourStep3')}`;
    setText('#btnWelcomeSkip', t('welcomeSkip'));
    setText('#btnWelcomeEnter', t('welcomeEnter'));
    setText('.welcome-footer', t('welcomeFooter'));
    setText('#tutSkip', t('tutorialSkip'));
    setHTML('#levelRewardModal .modal-title', `<span>🏛️</span> ${t('levelRewardTitle')}`);
    setText('#levelRewardText', t('levelRewardDefault'));
    setText('#btnCloseLevelReward', t('rewardContinue'));
    setText('#btnResetDataCancel', t('resetCancel'));
    setText('#btnOnboardingSkip', t('onboardingSkip'));
  }

  function applyThemeOptionLabels() {
    document.querySelectorAll('#themeSelect option').forEach(option => {
      option.textContent = t(`themeNames.${option.value}`);
    });
  }

  function applyZeusVoiceLabels() {
    document.querySelectorAll('#zeusStyleSelect option').forEach(option => {
      option.textContent = t(`zeusVoices.${option.value}`);
    });
  }

  function applyLanguage(lang) {
    S.language = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (I18N[lang]?.tabs?.[tabId]) btn.textContent = I18N[lang].tabs[tabId];
    });
    applyStaticTranslations();
    applyThemeOptionLabels();
    applyZeusVoiceLabels();
    const nextBtn = $('tutNext');
    if (nextBtn) {
      nextBtn.textContent = t('tutorialNext');
    }
    const installHint = $('installHint');
    if (installHint && !S.installAvailable) {
      installHint.textContent = t('installHint');
    }
    if ($('alarmStatus') && !S.alarm.time) {
      updateAlarmStatus(t('alarmIdle'));
    }
    updateModeIndicator();
    refreshConnectionViews();
    updatePomodoroUI();
    if (S.activeTask) setActiveUI(S.activeTask);
    else clearActiveUI();
    if ($('playerTitle') && S.totalXP >= 0) {
      const info = getLevelInfo(S.totalXP);
      if ($('xpTitle')) $('xpTitle').textContent = localizeTitle(info.title);
      $('playerTitle').textContent = t('titlePrefix', { title: localizeTitle(info.title) });
    }
    if (S.userProgress) renderBackupSafetyNet();
    applyProgressiveDisclosure();
    updateFocusFlowState();
    updateDeepFocusUI();
    setSaveStatus('saved', t('saveStatusLocal'));
  }

  function applyPersistedSettings() {
    const settings = getAppSettings();
    S.uxMode = settings.uxMode;
    S.preferredExperience = settings.preferredExperience;
    applyTheme(settings.theme);
    applyLanguage(settings.language);
  }

  // Apply local-first appearance settings immediately on startup.
  applyPersistedSettings();

  function getActiveElapsedSec() {
    if (!S.activeTask?.start_time) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(S.activeTask.start_time).getTime()) / 1000));
  }

  function updateStopButtonLabel() {
    const label = S.activeTask && getActiveElapsedSec() < 15 * 60
      ? t('stopEarly')
      : t('completeSession');
    if ($('btnStop')) $('btnStop').textContent = label;
    if ($('btnDeepFocusStop')) $('btnDeepFocusStop').textContent = label;
  }

  function updateFocusFlowState() {
    const hasDraft = !!$('taskName')?.value.trim();
    const hasActive = !!S.activeTask;
    const hasCompleted = (S.userProgress?.focusSessions || 0) > 0;
    const activeStep = hasActive ? 'complete' : hasDraft ? 'start' : 'task';
    const doneMap = {
      task: hasDraft || hasActive || hasCompleted,
      start: hasActive || hasCompleted,
      complete: hasCompleted,
    };

    document.querySelectorAll('[data-flow-step]').forEach(node => {
      const step = node.dataset.flowStep;
      node.classList.toggle('is-active', activeStep === step);
      node.classList.toggle('is-done', !!doneMap[step]);
    });

    [['checkAddTask', doneMap.task, activeStep === 'task'], ['checkStartTask', doneMap.start, activeStep === 'start'], ['checkCompleteTask', doneMap.complete, activeStep === 'complete']].forEach(([id, done, current]) => {
      const item = $(id);
      if (!item) return;
      item.classList.toggle('is-done', !!done);
      item.classList.toggle('is-active', !!current);
    });

    $('quickStartChecklist')?.classList.toggle('is-complete', hasCompleted);
    if ($('quickStartSummary')) {
      $('quickStartSummary').textContent = hasCompleted
        ? t('quickStartSummaryDone')
        : t('quickStartSummary');
    }

    if ($('btnPomodoroSkip')) $('btnPomodoroSkip').disabled = !S.pomodoro.running;
    if ($('btnDeepWorkMode')) $('btnDeepWorkMode').disabled = !hasActive;

    if ($('flowPrimaryHint')) {
      $('flowPrimaryHint').textContent = hasActive
        ? t('focusHintActive')
        : hasDraft
          ? t('focusHintReady')
          : t('focusHintIdle');
    }

    if ($('flowCompletionHint')) {
      $('flowCompletionHint').textContent = hasActive
        ? (getActiveElapsedSec() >= 15 * 60 ? t('focusHintCompleteReady') : t('focusHintCompleteWait'))
        : t('focusHintNoSession');
    }

    updateStopButtonLabel();
  }

  function updateDeepFocusUI() {
    const task = S.activeTask;
    const phaseLabel = S.pomodoro.phase === 'break' ? t('focusCycleBreak') : t('focusCycleFocus');
    const timerText = $('activeTimer')?.textContent || '00:00:00';
    if ($('deepFocusTask')) $('deepFocusTask').textContent = task?.name || (S.language === 'en' ? 'No active session' : 'Brak aktywnej sesji');
    if ($('deepFocusPhase')) $('deepFocusPhase').textContent = task ? phaseLabel : t('statusIdle');
    if ($('deepFocusTimer')) $('deepFocusTimer').textContent = task ? timerText : '00:00:00';
    if ($('deepFocusCopy')) $('deepFocusCopy').textContent = task ? t('deepFocusCopy') : t('focusHintNoSession');
    if ($('btnDeepFocusStop')) {
      const stopDisabled = $('btnStop') ? $('btnStop').disabled : true;
      $('btnDeepFocusStop').disabled = !task || stopDisabled;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRACKER VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async function loadTrackerView() {
    await refreshActiveTask();
    await loadRecentLog();
    await loadQuickStats();
    applyProgressiveDisclosure();
    updateFocusFlowState();
    updateDeepFocusUI();
  }

  async function refreshActiveTask() {
    const task = await DB.getActiveTask();
    S.activeTask = task;
    if (task) {
      S.sessionStart = S.sessionStart || new Date(task.start_time);
      setActiveUI(task);
      if (!S.timerInterval) startLocalTimer(task.start_time);
    } else {
      clearActiveUI();
    }
  }

  function setActiveUI(task) {
    S.activeTask = task;
    $('statusDot').className = 'status-dot running';
    $('statusLabel').textContent = t('statusTracking');
    $('activeCard').style.display = 'block';
    $('activeCard').classList.add('timer-emphasis');
    setTimeout(() => $('activeCard')?.classList.remove('timer-emphasis'), 220);
    $('activeName').textContent = task.name;
    $('activeCat').textContent = catLabel(task.category);
    $('btnStart').disabled = true;
    $('btnStop').disabled  = false;
    $('taskName').value    = '';
    updateHardcoreStopState();
    updateFocusFlowState();
    updateDeepFocusUI();
  }

  function clearActiveUI() {
    S.activeTask   = null;
    S.sessionStart = null;
    clearInterval(S.timerInterval); S.timerInterval = null;
    $('statusDot').className     = 'status-dot idle';
    $('statusLabel').textContent = t('statusIdle');
    $('activeCard').style.display = 'block';
    $('activeCard').classList.remove('timer-emphasis');
    $('activeName').textContent   = S.language === 'en' ? 'Ready to focus' : 'Gotowy do skupienia';
    $('activeCat').textContent    = t('focusCycleFocus');
    const timerEl = $('activeTimer');
    if (timerEl) { timerEl._fdSpans = null; timerEl._fdPrev = null; timerEl.textContent = '00:00:00'; }
    $('fatigueBar').style.width   = '0%';
    $('fatigueLabel').textContent = '';
    _updateFatigueGauge(100, false);
    $('btnStart').disabled = false;
    $('btnStop').disabled  = true;
    clearZenOledMode();
    if (document.body.classList.contains('deep-work')) setDeepWorkMode(false);
    updateFocusFlowState();
    updateDeepFocusUI();
  }

  function updateHardcoreStopState() {
    if (!$('btnStop')) return;
    if (!S.activeTask) return;
    getSkillState().then(skillState => {
      const forceNoCancel = hasSkill(skillState, 'no_mercy');
      $('btnStop').disabled = !!S.hardcoreMode || forceNoCancel;
    });
  }

  async function initHardcoreMode() {
    S.hardcoreMode = !!(await DB.getSetting('hardcore_mode', false));
    window.addEventListener('beforeunload', () => {
      if (S.hardcoreMode && S.activeTask) {
        localStorage.setItem(HARDCORE_ACTIVE_KEY, '1');
      }
    });
  }

  async function recoverHardcoreFailureIfNeeded() {
    if (localStorage.getItem(HARDCORE_ACTIVE_KEY) !== '1') return;
    localStorage.removeItem(HARDCORE_ACTIVE_KEY);
    const active = await DB.getActiveTask();
    if (active) await DB.stopActiveTask();
    const failed = (await DB.getSetting('hardcore_failed_sessions', 0)) + 1;
    await DB.setSetting('hardcore_failed_sessions', failed);
    const skillState = await getSkillState();
    const failPenalty = hasSkill(skillState, 'wrath_of_zeus') ? 40 : 20;
    await applyXPPenalty(failPenalty);
    if (hasSkill(skillState, 'comeback')) {
      skillState.comebackReady = true;
      await setSkillState(skillState);
    }
    markMissionFailure();
    showToast(t('hardcoreRefreshFail', { value: failPenalty }), 'warn', 6000);
    zeusSpeak('You fled the trial. Olympus marks this as failure.', 'Judging', 'high');
  }

  function _updateFatigueGauge(efficiencyPct, shouldBreak) {
    const GAUGE_LEN = 131.95;
    const fill  = $('fatigueGaugeFill');
    const label = $('fatigueGaugeLabel');
    if (!fill) return;
    const eff    = Math.max(0, Math.min(100, efficiencyPct));
    const offset = GAUGE_LEN - (eff / 100) * GAUGE_LEN;
    fill.style.strokeDashoffset = offset.toFixed(2);
    const hue = shouldBreak ? 25 : Math.round(105 * (eff / 100));
    fill.style.stroke = `hsl(${hue}, 90%, 55%)`;
    if (label) label.textContent = `${eff}%`;
  }

  function _applyFatigueAccent(efficiencyPct) {
    const root = document.documentElement;
    if (efficiencyPct >= 95) {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent2');
      return;
    }
    const t = Math.max(0, Math.min(1, (efficiencyPct - 30) / 65));
    const sat = Math.round(55 + t * 100);
    if (efficiencyPct < 50) {
      root.style.setProperty('--accent',  `hsl(25,${sat}%,55%)`);
      root.style.setProperty('--accent2', `hsl(30,${sat}%,60%)`);
    } else {
      root.style.setProperty('--accent',  `hsl(105,${sat}%,52%)`);
      root.style.setProperty('--accent2', `hsl(110,${sat}%,56%)`);
    }
  }

  // ── Rolling digit timer display ───────────────────────────────────────────
  function updateTimerDisplay(timeStr) {
    const el = $('activeTimer');
    if (!el) return;
    if (!el._fdSpans) {
      el.innerHTML = '';
      el._fdSpans  = [];
      el._fdPrev   = '';
      for (const ch of timeStr) {
        const span = document.createElement('span');
        span.className = ch === ':' ? 'fd-sep' : 'fd-digit';
        span.textContent = ch;
        el.appendChild(span);
        el._fdSpans.push(span);
      }
      el._fdPrev = timeStr;
      return;
    }
    for (let i = 0; i < timeStr.length; i++) {
      if (timeStr[i] !== (el._fdPrev || '')[i] && el._fdSpans[i]?.className === 'fd-digit') {
        const span = el._fdSpans[i];
        span.textContent = timeStr[i];
        span.classList.remove('fd-roll');
        void span.offsetWidth;
        span.classList.add('fd-roll');
      }
    }
    el._fdPrev = timeStr;
  }

  // ── OLED Zen Auto-Hide ────────────────────────────────────────────────────
  function initZenOledMode() {
    if (S.uxMode !== 'zen') return;
    document.body.classList.add('zen-oled');
    let hideTimer = null;
    const wake = () => {
      document.body.classList.add('zen-awake');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => document.body.classList.remove('zen-awake'), 3000);
    };
    document._zenWake = wake;
    document.addEventListener('mousemove', wake);
    document.addEventListener('touchstart', wake, { passive: true });
    wake();
  }

  function clearZenOledMode() {
    document.body.classList.remove('zen-oled', 'zen-awake');
    if (document._zenWake) {
      document.removeEventListener('mousemove', document._zenWake);
      document.removeEventListener('touchstart', document._zenWake);
      document._zenWake = null;
    }
  }

  // ── Breathing ring (canvas, 4-7-8 rhythm) ────────────────────────────────
  function initBreathRing() {
    const canvas = $('zenBreathRing');
    if (!canvas || canvas._rfRunning) return;
    canvas._rfRunning = true;
    const IN = 4000, HOLD = 7000, OUT = 8000, TOTAL = IN + HOLD + OUT;
    let rafId;
    function draw(ts) {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      if (!canvas._rfRunning) return;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      if (W > 0 && H > 0) {
        const phase = ts % TOTAL;
        let r, a;
        if (phase < IN) {
          const t = phase / IN;
          r = Math.min(W, H) * (0.18 + 0.18 * t);
          a = 0.03 + 0.10 * t;
        } else if (phase < IN + HOLD) {
          r = Math.min(W, H) * 0.36; a = 0.13;
        } else {
          const t = (phase - IN - HOLD) / OUT;
          r = Math.min(W, H) * (0.36 - 0.18 * t);
          a = 0.13 - 0.10 * t;
        }
        const cx = W / 2, cy = H / 2;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `hsla(180,100%,60%,${(a * 1.5).toFixed(3)})`);
        g.addColorStop(0.6, `hsla(195,100%,55%,${a.toFixed(3)})`);
        g.addColorStop(1, `hsla(195,100%,55%,0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);
    canvas._stopRing = () => {
      canvas._rfRunning = false;
      cancelAnimationFrame(rafId);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  // ── Water particle burst ──────────────────────────────────────────────────
  function spawnWaterParticle(x, y, label) {
    const p = document.createElement('div');
    p.className = 'water-particle';
    p.textContent = label || '+250ml 💧';
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }

  function startLocalTimer(startISO) {
    const startTs = new Date(startISO).getTime();
    clearInterval(S.timerInterval);
    S.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
      updateTimerDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      const fatigue = MATH.fatigueCurve(Math.floor(elapsed / 60));
      const pct     = Math.round(100 - fatigue.currentEfficiency);
      $('fatigueBar').style.width   = `${Math.min(pct, 100)}%`;
      $('fatigueLabel').textContent = `Wydajność: ${fatigue.currentEfficiency}%`;
      $('fatigueBarWrap').classList.toggle('fatigue--warn', fatigue.shouldBreak);
      // Zeus orb: efficiency ring + state-based pulse
      if (typeof ZeusHologram !== 'undefined') {
        ZeusHologram.updateEfficiencyRing(fatigue.currentEfficiency);
        ZeusHologram.setOrbState(fatigue.shouldBreak ? 'alert' : 'focus');
      }
      // Semicircular fatigue gauge
      _updateFatigueGauge(fatigue.currentEfficiency, fatigue.shouldBreak);
      // Fatigue accent desaturation
      _applyFatigueAccent(fatigue.currentEfficiency);
      updateStopButtonLabel();
      updateDeepFocusUI();
    }, 1000);
  }

  async function handleStart() {
    const name     = $('taskName').value.trim();
    const category = $('taskCategory').value;
    if (!name) { showToast(`⚠️ ${t('taskNameRequired')}`, 'warn'); $('taskName').focus(); return; }
    try {
      const task = await DB.startTask(name, category);
      S.sessionStart = new Date(task.start_time);
      S.lastActivity = Date.now();
      if (S.hardcoreMode) localStorage.setItem(HARDCORE_ACTIVE_KEY, '1');
      markDayPlanProgress(name);
      setActiveUI(task);
      startLocalTimer(task.start_time);
      initZenOledMode();
      initBreathRing();
      playSessionStart(); vibrateClick();
      if (typeof ZeusHologram !== 'undefined') ZeusHologram.setOrbState('focus');
      showToast(`▶ ${t('taskStartToast', { name })}`, 'success');
      zeusSpeak('Discipline initiated. Olympus expects consistency.', 'Demanding', 'high');
      await loadRecentLog(); await loadQuickStats();
    } catch (e) { showToast(`❌ ${t('genericError', { message: e.message })}`, 'error'); }
  }

  async function handleStop() {
    if (S.hardcoreMode) {
      showToast(t('hardcoreWaitPhase'), 'warn');
      return;
    }
    try {
      const stopped = await DB.stopActiveTask();
      localStorage.removeItem(HARDCORE_ACTIVE_KEY);
      if (S.pomodoro.running && S.pomodoro.phase === 'focus') {
        if (S.pomodoro.interval) clearInterval(S.pomodoro.interval);
        S.pomodoro.interval = null;
        S.pomodoro.running = false;
        S.pomodoro.phase = 'focus';
        S.pomodoro.remainingSec = S.pomodoro.focusMin * 60;
        updatePomodoroUI();
      }
      clearActiveUI();
      triggerPanelFlash('.panel--tracker-main');
      if (typeof ZeusHologram !== 'undefined') { ZeusHologram.setOrbState('idle'); ZeusHologram.triggerGlitch(); ZeusHologram.updateEfficiencyRing(0); }
      _applyFatigueAccent(100);
      if (stopped) {
        const stoppedMin = Math.round((stopped.duration || 0) / 60);
        const interrupted = stoppedMin < 15;
        const xp = await calcTaskXP(stopped, { interrupted, hardcoreFail: false });
        if (xp > 0) {
          playSessionComplete(); vibrateSuccess();
          const prevLevel = getLevelInfo(S.totalXP).level;
          let bonusXP = 0;
          const todayTasks = await DB.getTasksForDay(DB.toDateStr());
          const goalMin = await DB.getSetting('daily_goal_min', 0);
          if (goalMin > 0) {
            const totalMin = Math.round(todayTasks.reduce((s, t) => s + (t.duration || 0), 0) / 60);
            const perfectAwardedDate = await DB.getSetting('perfect_day_bonus_date', null);
            if (totalMin >= goalMin && perfectAwardedDate !== DB.toDateStr()) {
              bonusXP += 100;
              await DB.setSetting('perfect_day_bonus_date', DB.toDateStr());
            }
          }
          const newTotal = await DB.addXP(xp + bonusXP);
          const nextLevel = getLevelInfo(newTotal).level;
          await refreshXPBar();
          if (nextLevel > prevLevel) {
            showToast(t('levelUpToast', { level: nextLevel, title: localizeTitle(getLevelInfo(newTotal).title) }), 'success', 6000);
            zeusSpeak(`You ascended to level ${nextLevel}. Olympus acknowledges your rise.`, 'Triumphant', 'high');
            showLevelUpAnimation(nextLevel, localizeTitle(getLevelInfo(newTotal).title));
          } else {
            showToast(t('sessionCompletedToast', { name: stopped.name, xp: xp + bonusXP }), 'info');
            zeusSpeak('Another session completed. Olympus is watching.', 'Approving', 'high');
          }
        } else {
          showToast(t('sessionStoppedToast', { name: stopped.name }), 'info');
          if (interrupted) {
            const penalty = S.hardcoreMode ? 20 : 35;
            await applyXPPenalty(penalty);
            markMissionFailure();
            zeusSpeak('You stopped early? Even mortals show more discipline.', 'Disappointed', 'high');
            showToast(t('xpPenaltyToast', { value: penalty }), 'warn');
          } else {
            zeusSpeak('Session closed. Return stronger.', 'Neutral');
          }
        }
      }
      S.lastActivity = Date.now();
      await loadRecentLog();
      await loadQuickStats();
    } catch (e) {
      showToast(t('genericError', { message: e.message }), 'error');
    }
  }


  function _calcSystemReadiness(analysis, waterCount, sleepHours) {
    const sleepScore  = sleepHours >= 8 ? 100 : sleepHours >= 6 ? 75 : sleepHours >= 5 ? 50 : 20;
    const waterScore  = Math.min(100, waterCount * 14);
    const focusScore  = Math.min(100, analysis.efficiencyPct ?? 75);
    return Math.round(sleepScore * 0.35 + waterScore * 0.30 + focusScore * 0.35);
  }

  function _renderSystemReadiness(score, { waterCount = 0, sleepHours = 0, effPct = 0 } = {}) {
    const el = $('sysReadinessBar');
    const sc = $('sysReadinessScore');
    if (el) el.style.width = `${score}%`;
    if (sc) sc.textContent = `${score}%`;
    // Mirror strip
    const strip = $('sysReadinessBarStrip');
    if (strip) strip.style.width = `${score}%`;
    // Health strip values
    const hw = $('hsWater'),  hs = $('hsSleep'), he = $('hsEff'), hst = $('hsStreak');
    if (hw)  hw.textContent  = waterCount;
    if (hs)  hs.textContent  = sleepHours >= 1 ? `${sleepHours.toFixed(1)}h` : '—';
    if (he)  he.textContent  = effPct + '%';
    document.body.classList.toggle('sys-low', score < 45);
  }

  async function loadQuickStats() {
    const todayTasks = await DB.getTasksForDay(DB.toDateStr());
    const analysis   = MATH.analyzeDay(todayTasks);
    const [all, latestSleep, waterCount] = await Promise.all([
      DB.getAllCompletedTasks(),
      DB.getSleepLogs(1),
      DB.getTodayWaterCount(),
    ]);
    $('qsTodayTime').textContent  = fmtSec(analysis.totalSec);
    $('qsEfficiency').textContent = analysis.efficiencyPct + '%';
    $('qsTaskCount').textContent  = analysis.taskCount;
    const sleepHours = (latestSleep?.[0]?.durationMin || 0) / 60;
    const score = _calcSystemReadiness(analysis, waterCount, sleepHours);
    _renderSystemReadiness(score, {
      waterCount,
      sleepHours,
      effPct: analysis.efficiencyPct ?? 0,
    });

    // Streak
    const { streak, bestStreak } = computeStreakFromTasks(all);
    $('qsStreak').textContent = `${streak} / ${bestStreak}`;
    if ($('streakText')) $('streakText').textContent = t('streakLabel', { value: streak });
    if ($('bestStreakText')) $('bestStreakText').textContent = t('bestLabel', { value: bestStreak });
    const streakMeta = getLS(LS_KEYS.streakMeta, { lastSeenStreak: 0, lastActiveDate: null });
    const days = new Set(all.map(t => (t.start_time || '').slice(0, 10)).filter(Boolean));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = DB.toDateStr(yesterday);
    if (streakMeta.lastActiveDate && streakMeta.lastActiveDate !== DB.toDateStr() && !days.has(yesterdayKey)) {
      const skillState = await getSkillState();
      const canProtect = hasSkill(skillState, 'unbreakable') && !skillState.unbreakableUsed;
      if (canProtect) {
        skillState.unbreakableUsed = true;
        await setSkillState(skillState);
        zeusSpeak('Unbreakable absorbed your first missed day. Do not waste this mercy.', 'Warning', 'high');
      } else {
        const alreadyPenalizedFor = streakMeta.lastPenaltyDate;
        if (alreadyPenalizedFor !== DB.toDateStr()) {
          await applyXPPenalty(50);
          streakMeta.lastPenaltyDate = DB.toDateStr();
        }
        zeusSpeak('A day was skipped. Olympus does not reward broken oaths.', 'Judging', 'high');
      }
    }
    if (streak > streakMeta.lastSeenStreak && streak >= 2) {
      zeusSpeak(`Streak ${streak} days. Keep climbing toward Olympus.`, 'Fired Up', 'high');
    }
    setLS(LS_KEYS.streakMeta, {
      lastSeenStreak: streak,
      lastActiveDate: days.size ? [...days].sort().slice(-1)[0] : null,
    });

    // EMA badge
    const ema = MATH.emaProductivityTrend(all);
    const trendMap = { improving:'📈 Wzrost', declining:'📉 Spadek', stable:'➡️ Stabilny' };
    $('qsEMA').textContent = `${trendMap[ema.trend] || '—'} (${ema.currentScore}%)`;
    $('qsEMA').className   = `qs-ema ema--${ema.trend}`;

    // XP bar
    await refreshXPBar();

    // Leaderboard
    renderLeaderboard(all);
    await refreshDailyGoal(analysis.totalSec);
    await updateMissionsFromTasks(todayTasks);
    await evaluateAchievements(all, streak);
    await renderAdvancedStats();
    const fullAnalysis = MATH.analyzeAll(all);
    await syncUserProgress();
    renderZeusGuidance(fullAnalysis, latestSleep);
    renderBackupSafetyNet();
    applyProgressiveDisclosure();
    updateFocusFlowState();
  }

  // ── Leaderboard (Phase 5) ─────────────────────────────────────────────────

  function renderLeaderboard(allTasks) {
    const el = $('lbRows');
    if (!el) return;
    const dayMap = {};
    for (const t of allTasks) {
      if (!t.duration) continue;
      const d = t.start_time.slice(0,10);
      dayMap[d] = (dayMap[d] || 0) + t.duration;
    }
    const days      = Object.keys(dayMap);
    const userAvgH  = days.length
      ? Math.round(Object.values(dayMap).reduce((a,b)=>a+b,0) / days.length / 360) / 10
      : 0;
    const benchmarks = [
      { name:'Przeciętny pracownik biurowy', h:2.8 },
      { name:'Student IB (średnia globalna)', h:4.2 },
      { name:'Top 10% produktywnych', h:6.1 },
    ];
    const maxH = Math.max(userAvgH, 6.1);
    el.innerHTML = benchmarks.map(b => `
      <div class="lb-row">
        <span class="lb-name">${escH(b.name)}</span>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${Math.round(b.h/maxH*100)}%;background:var(--text-dim)"></div></div>
        <span class="lb-val" style="color:var(--text-muted)">${b.h}h</span>
      </div>`).join('') +
    `<div class="lb-row lb-row-you">
        <span class="lb-name"><strong>⚡ Ty (${days.length}d śr.)</strong></span>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${Math.round(userAvgH/maxH*100)}%"></div></div>
        <span class="lb-val">${userAvgH}h</span>
      </div>`;
  }

  async function loadRecentLog() {
    let tasks = await DB.getTasks({ limit: 120 });
    if (S.listFilter === 'today') {
      const today = DB.toDateStr();
      tasks = tasks.filter(t => (t.start_time || '').slice(0, 10) === today);
    }
    tasks = tasks.slice(0, 40);
    const container = $('recentLog');
    if (!tasks.length) {
      container.innerHTML = `<div class="log-empty">${S.language === 'en' ? 'No sessions yet. Start your first focus session.' : 'Brak sesji. Uruchom pierwszą sesję skupienia.'}</div>`;
      return;
    }
    container.innerHTML = tasks.map(t => {
      const dur          = t.duration ? fmtSec(t.duration) : (t.is_active ? '⏳' : '—');
      const stMin = Math.round((t.duration || 0) / 60);
      let termBadge;
      if (t.is_active) {
        termBadge = '<span class="term-badge term-badge--exec">[EXEC]</span>';
      } else if (t.is_backfill) {
        termBadge = '<span class="term-badge term-badge--retro">[RETRO]</span>';
      } else if (stMin >= 15) {
        termBadge = '<span class="term-badge term-badge--done">[DONE]</span>';
      } else {
        termBadge = '<span class="term-badge term-badge--abbr">[ABBR]</span>';
      }
      return `
        <div class="log-item cat-border--${t.category}" draggable="${t.is_active ? 'false' : 'true'}" data-log-id="${t.id}">
          <div class="log-item-header">
            <span class="log-item-name">${termBadge}${escH(t.name)}</span>
            <span class="log-item-dur">${dur}</span>
          </div>
          <div class="log-item-footer">
            <span class="log-cat cat-${t.category}">${catLabel(t.category)}</span>
            <span class="log-time">${fmtTime(t.start_time)}</span>
            <button class="log-del" data-id="${t.id}" title="Usuń">×</button>
          </div>
        </div>`;
    }).join('');
    container.querySelectorAll('.log-del').forEach(btn =>
      btn.addEventListener('click', async e => {
        await DB.deleteTask(Number(e.currentTarget.dataset.id));
        showToast('🗑 Usunięto', 'info');
        await loadRecentLog(); await loadQuickStats();
      })
    );
    initLogDragDrop(container);
  }

  function initLogDragDrop(container) {
    let dragSrc = null;

    container.querySelectorAll('.log-item[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragSrc = item;
        item.classList.add('drag-source');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.logId || '');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('drag-source');
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragSrc = null;
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (item !== dragSrc) item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (!dragSrc || dragSrc === item) return;
        // Reorder DOM only (visual reordering — no DB write needed)
        const allItems = [...container.querySelectorAll('.log-item')];
        const srcIdx   = allItems.indexOf(dragSrc);
        const tgtIdx   = allItems.indexOf(item);
        if (srcIdx < tgtIdx) {
          item.after(dragSrc);
        } else {
          item.before(dragSrc);
        }
        // Bounce animation on dropped item
        dragSrc.classList.remove('drop-bounce');
        void dragSrc.offsetWidth;
        dragSrc.classList.add('drop-bounce');
        setTimeout(() => dragSrc?.classList.remove('drop-bounce'), 420);
        navigator.vibrate?.(12);
      });
    });
  }

  function initHistoryFilters() {
    const applyFilterVisual = () => {
      $('btnFilterToday')?.classList.toggle('active', S.listFilter === 'today');
      $('btnFilterAll')?.classList.toggle('active', S.listFilter === 'all');
    };
    $('btnFilterToday')?.addEventListener('click', async () => {
      S.listFilter = 'today';
      applyFilterVisual();
      await loadRecentLog();
    });
    $('btnFilterAll')?.addEventListener('click', async () => {
      S.listFilter = 'all';
      applyFilterVisual();
      await loadRecentLog();
    });
    applyFilterVisual();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DAILY VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async function loadDailyView() {
    $('dailyDateLabel').textContent = new Date(S.dailyDate).toLocaleDateString('pl-PL', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const tasks    = await DB.getTasksForDay(S.dailyDate);
    const analysis = MATH.analyzeDay(tasks);

    $('dTotalTime').textContent  = fmtSec(analysis.totalSec);
    $('dEfficiency').textContent = analysis.efficiencyPct + '%';
    $('dTaskCount').textContent  = analysis.taskCount + ' zadań';

    renderDailyCatDonut(analysis.timeByCat);
    renderDailyHourChart(analysis.hourlyData);
    renderDailyInsightsList(tasks, analysis);
    renderGoldenHoursDisplay(tasks);
    loadDayPlan();
    applyProgressiveDisclosure();
  }

  function renderDailyCatDonut(timeByCat) {
    const entries = Object.entries(timeByCat).filter(([,v]) => v > 0);
    destroyChart('dailyCatChart');
    const ctx = $('dailyCatChart');
    if (!ctx || !entries.length) return;
    S.charts['dailyCatChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   entries.map(([c]) => catLabel(c)),
        datasets: [{ data: entries.map(([,v]) => Math.round(v/60)), backgroundColor: entries.map(([c]) => catColor(c)), borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { display: true, position: 'right', labels: { color:'#aaa', font:{ size:10, family:'Space Mono' }, boxWidth:10, padding:8 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} min` } },
        },
      },
    });
  }

  function renderDailyHourChart(hourlyData) {
    const active = hourlyData.filter(h => h.total > 0);
    destroyChart('dailyHourChart');
    const ctx = $('dailyHourChart');
    if (!ctx || !active.length) return;
    S.charts['dailyHourChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: active.map(h => `${h.hour}:00`),
        datasets: [
          { label:'Produktywne', data: active.map(h => Math.round(h.productive/60)), backgroundColor:'rgba(99,255,180,0.7)', borderWidth:0, borderRadius:3 },
          { label:'Pozostałe',  data: active.map(h => Math.round((h.total-h.productive)/60)), backgroundColor:'rgba(255,107,107,0.4)', borderWidth:0, borderRadius:3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color:'#aaa', font:{ size:10, family:'Space Mono' } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} min` } } },
        scales: {
          x: { stacked: true, grid: { display:false }, ticks: { color:'#6b6b80' } },
          y: { stacked: true, grid: { color:'rgba(255,255,255,0.04)' }, ticks: { color:'#6b6b80', callback: v => v+'m' } },
        },
      },
    });
  }

  async function renderDailyInsightsList(tasks, analysis) {
    const container = $('dailyInsights');
    if (!container) return;
    const allTasks = await DB.getTasksLast30Days();
    const full     = MATH.analyzeAll(allTasks);
    const today    = [
      analysis.efficiencyPct >= 70
        ? { icon:'⭐', text:`Dziś: ${analysis.efficiencyPct}% produktywności — świetny dzień!` }
        : { icon:'📊', text:`Dziś: ${analysis.efficiencyPct}% produktywności. Cel: 70%+` },
      { icon:'⏱️', text:`Łączny czas pracy: ${fmtSec(analysis.totalSec)} w ${analysis.taskCount} sesjach.` },
    ];
    container.innerHTML = [...today, ...full.insights.slice(0,3)]
      .map(i => `<li><span class="insight-icon">${i.icon}</span>${escH(i.text)}</li>`)
      .join('');
  }

  async function renderGoldenHoursDisplay(tasks) {
    const el = $('goldenHoursDisplay');
    if (!el) return;
    const allTasks = await DB.getTasksLast30Days();
    const km       = MATH.kMeansGoldenHours([...allTasks, ...tasks]);
    if (!km.goldenHours.length) {
      el.innerHTML = '<span class="text-muted">Za mało danych dla K-Means...</span>';
      return;
    }
    el.innerHTML =
      km.goldenHours.map(h => `<span class="hour-chip hour-chip--gold">${h}:00</span>`).join('') +
      '<span class="gh-divider">vs</span>' +
      km.shadowHours.slice(0,6).map(h => `<span class="hour-chip hour-chip--shadow">${h}:00</span>`).join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEEKLY VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async function loadWeeklyView() {
    const monday = new Date(S.weekStart);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    $('weekLabel').textContent =
      `${monday.toLocaleDateString('pl-PL',{day:'2-digit',month:'short'})} — ${sunday.toLocaleDateString('pl-PL',{day:'2-digit',month:'short',year:'numeric'})}`;

    const tasks    = await DB.getTasksForWeek(S.weekStart);
    const allTasks = await DB.getTasksLast30Days();
    const analysis = MATH.analyzeAll(tasks);
    const emaData  = MATH.emaProductivityTrend(allTasks, 14);

    renderStreamgraph(allTasks);
    renderWeeklyBars(analysis.timeByDay, S.weekStart);
    renderEMAChart(emaData);
    renderMarkovTable(analysis.markov);
    renderBayesianTable(analysis.bayesian, emaData);
    renderWeeklyInsights(analysis.insights);

    const trendEl  = $('weekTrendBadge');
    const trendMap = { improving:'📈 WZROST', declining:'📉 SPADEK', stable:'➡️ STABILNY' };
    trendEl.textContent = trendMap[emaData.trend] || '—';
    trendEl.className   = `trend-badge trend--${emaData.trend}`;
    renderZeusGuidance({ ...analysis, emaData });
    applyLevelLocks();
    applyProgressiveDisclosure();
    applyInspectModeDefaults();
  }

  function renderStreamgraph(tasks) {
    const wrap = $('weeklyStreamgraph');
    if (!wrap) return;

    const DAY_COUNT = 28;
    const today = new Date();
    const labels = [], dateKeys = [];
    for (let i = DAY_COUNT - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      dateKeys.push(DB.toDateStr(d));
      labels.push(d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }));
    }

    const dayMap = {}, catSet = new Set();
    for (const t of tasks) {
      if (!t.duration || t.duration <= 0) continue;
      const dk = t.start_time.slice(0, 10);
      if (!dayMap[dk]) dayMap[dk] = {};
      dayMap[dk][t.category] = (dayMap[dk][t.category] || 0) + t.duration;
      catSet.add(t.category);
    }

    const categories = [...catSet].sort();
    if (!categories.length) {
      wrap.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:12px;padding:36px 0">Brak danych — uruchom pierwsze sesje.</p>';
      return;
    }

    const STREAM_COLORS = [
      'rgba(99,255,180,0.72)','rgba(122,179,255,0.72)','rgba(244,196,106,0.72)',
      'rgba(255,99,160,0.72)','rgba(178,122,255,0.72)','rgba(99,220,255,0.72)',
      'rgba(255,160,80,0.72)','rgba(180,255,99,0.72)',
    ];

    const datasets = categories.map((cat, i) => ({
      label: DB.CAT_LABELS?.[cat] || cat,
      data: dateKeys.map(dk => +( ((dayMap[dk]?.[cat] || 0) / 60).toFixed(1) )),
      backgroundColor: STREAM_COLORS[i % STREAM_COLORS.length],
      borderColor:     STREAM_COLORS[i % STREAM_COLORS.length].replace('0.72', '0.95'),
      borderWidth: 1,
      fill: true,
      tension: 0.38,
      pointRadius: 0,
    }));

    if (!wrap.querySelector('canvas')) {
      wrap.innerHTML = '';
      wrap.appendChild(document.createElement('canvas'));
    }
    destroyChart('weeklyStreamgraph');
    S.charts['weeklyStreamgraph'] = new Chart(wrap.querySelector('canvas'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(238,242,255,0.65)',
              font: { size: 10, family: "'JetBrains Mono', monospace" },
              boxWidth: 10, padding: 8,
            },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}h` },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: 'rgba(238,242,255,0.45)', font: { size: 9 }, maxTicksLimit: 8 },
            grid:  { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            stacked: true,
            ticks: {
              color: 'rgba(238,242,255,0.45)',
              font: { size: 9 },
              callback: v => `${v}h`,
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    });
  }

  function renderWeeklyBars(timeByDay, weekStart) {
    destroyChart('weeklyBarsChart');
    const ctx = $('weeklyBarsChart');
    if (!ctx) return;
    const dayNames = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];
    const labels = [], values = [];
    for (let i = 0; i < 7; i++) {
      const d   = new Date(new Date(weekStart).getTime() + i * 86400000);
      const key = DB.toDateStr(d);
      labels.push(dayNames[i]);
      values.push(parseFloat(((timeByDay[key] || 0) / 3600).toFixed(2)));
    }
    const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(99,255,180,0.7)');
    grad.addColorStop(1, 'rgba(99,255,180,0.1)');
    S.charts['weeklyBarsChart'] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: grad, borderRadius:4, borderWidth:0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display:false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}h` } } },
        scales: {
          x: { grid: { display:false }, ticks: { color:'#6b6b80' } },
          y: { grid: { color:'rgba(255,255,255,0.04)' }, ticks: { color:'#6b6b80', callback: v => v+'h' } },
        },
      },
    });
  }

  function renderEMAChart(emaData) {
    destroyChart('emaChart');
    const ctx = $('emaChart');
    if (!ctx) return;
    S.charts['emaChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: emaData.dayLabels,
        datasets: [
          { label:'Raw', data:emaData.rawScores, borderColor:'rgba(99,255,180,0.25)', backgroundColor:'transparent', borderWidth:1, pointRadius:2, tension:0 },
          { label:'EMA (Î±=0.3)', data:emaData.smoothed, borderColor:'#63ffb4', backgroundColor:'rgba(99,255,180,0.06)', borderWidth:2, pointRadius:3, fill:true, tension:0.4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color:'#aaa', font:{ size:10, family:'Space Mono' } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` } },
        },
        scales: {
          x: { grid: { display:false }, ticks: { color:'#6b6b80', maxTicksLimit:7 } },
          y: { min:0, max:100, grid: { color:'rgba(255,255,255,0.04)' }, ticks: { color:'#6b6b80', callback: v => v+'%' } },
        },
      },
    });
  }

  function renderMarkovTable(matrix) {
    const el = $('markovTable');
    if (!el) return;
    const transitions = MATH.topTransitions(matrix, 8);
    if (!transitions.length) {
      el.innerHTML = `<tr><td colspan="4" class="empty-row">${S.language === 'en' ? 'Not enough data' : 'Za mało danych'}</td></tr>`;
      return;
    }
    el.innerHTML = transitions.map(t => `
      <tr>
        <td><span class="log-cat cat-${t.from}">${catLabel(t.from)}</span></td>
        <td class="markov-arrow">→</td>
        <td><span class="log-cat cat-${t.to}">${catLabel(t.to)}</span></td>
        <td class="markov-prob">
          <div class="prob-bar" style="width:${Math.round(t.prob*100)}%"></div>
          <span>${Math.round(t.prob * 100)}%</span>
        </td>
      </tr>`).join('');
  }

  function renderBayesianTable(bayesian, emaData) {
    const el = $('bayesTable');
    if (!el) return;
    const rows = Object.entries(bayesian).sort((a,b) => b[1].totalSeconds - a[1].totalSeconds);
    if (!rows.length) {
      el.innerHTML = `<tr><td colspan="5" class="empty-row">${S.language === 'en' ? 'Not enough data' : 'Za mało danych'}</td></tr>`;
      return;
    }
    // Build per-category daily trend from emaData if available
    const catValues = {};
    if (emaData?.daily) {
      for (const day of emaData.daily) {
        if (day.byCat) {
          for (const [cat, mins] of Object.entries(day.byCat)) {
            if (!catValues[cat]) catValues[cat] = [];
            catValues[cat].push(mins);
          }
        }
      }
    }
    el.innerHTML = rows.map(([cat, s]) => {
      const sparkVals = catValues[cat] && catValues[cat].length >= 4 ? catValues[cat].slice(-10) : null;
      const spark = sparkVals
        ? buildSparklineSVG(sparkVals, { w: 52, h: 18, color: 'var(--accent2)', fill: true })
        : '';
      return `
      <tr>
        <td><span class="log-cat cat-${cat}">${catLabel(cat)}</span></td>
        <td class="mono">${fmtSec(s.bayesMean)}</td>
        <td class="mono text-muted">±${fmtSec(s.bayesStd)}</td>
        <td class="mono">${s.sampleCount}×</td>
        <td>${spark}</td>
      </tr>`;
    }).join('');
  }

  function renderWeeklyInsights(insights) {
    const el = $('weeklyInsights');
    if (!el) return;
    el.innerHTML = (insights.length ? insights : [{ icon:'📊', text: S.language === 'en' ? 'Not enough data yet...' : 'Za mało danych...' }])
      .map(i => `<li><span class="insight-icon">${i.icon}</span>${escH(i.text)}</li>`)
      .join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async function loadHealthView() {
    const today = DB.toDateStr();
    const logs  = await DB.getHealthForDay(today);
    renderWaterTracker(logs.filter(l => l.type === 'water'));
    renderMealLog(logs.filter(l => l.type === 'meal'));
    renderMovementLog(logs.filter(l => l.type === 'movement'));

    const waterLogs = logs.filter(l => l.type === 'water');
    if (waterLogs.length) S.lastWaterLog = new Date(waterLogs[waterLogs.length-1].timestamp);
    applyProgressiveDisclosure();
  }

  function renderWaterTracker(waterLogs) {
    const WATER_CAP    = 12;
    const GOAL         = 8;
    const totalGlasses = waterLogs.reduce((s, l) => s + (l.value || 1), 0);
    const pct          = Math.min(Math.round(totalGlasses / GOAL * 100), 100);

    $('waterCount').textContent       = S.language === 'en'
      ? `${totalGlasses} / ${GOAL} glasses`
      : `${totalGlasses} / ${GOAL} szklanek`;
    $('waterProgress').style.width    = pct + '%';
    $('waterProgressPct').textContent = pct + '%';

    const glasses = $('waterGlasses');
    glasses.innerHTML = '';
    for (let i = 1; i <= GOAL; i++) {
      const btn = document.createElement('button');
      btn.className = `glass-btn ${i <= totalGlasses ? 'filled' : ''}`;
      btn.title     = `${i * 250}ml`;
      btn.textContent = i <= totalGlasses ? '250ml' : '+';
      btn.addEventListener('click', async () => {
        const slotState = await DB.consumeWaterSlot();
        if (!slotState.ok) {
          showToast(S.language === 'en'
            ? `Hydration slots used today: ${WATER_CAP}/${WATER_CAP}`
            : `Dzienne sloty nawodnienia wykorzystane: ${WATER_CAP}/${WATER_CAP}`, 'warn', 6000);
          return;
        }
        await DB.logHealth({ type:'water', value:1, unit:'glass', note:'250ml' });
        S.lastWaterLog = new Date();
        await DB.addXP(20);
        triggerPanelFlash('.panel--water');
        await refreshXPBar();
        await loadHealthView();
        showToast(S.language === 'en' ? '+20 XP for hydration' : '+20 XP za nawodnienie', 'success');
      });
      glasses.appendChild(btn);
    }
    if (totalGlasses > GOAL) {
      const extra = document.createElement('div');
      extra.style.cssText = 'font-family:var(--font-mono);font-size:10px;color:var(--accent4);margin-top:6px';
      extra.textContent   = S.language === 'en'
        ? `+${totalGlasses - GOAL} above goal`
        : `+${totalGlasses - GOAL} ponad cel`;
      glasses.appendChild(extra);
    }

    const undoBtn = $('btnWaterUndo');
    if (undoBtn) {
      undoBtn.onclick = async () => {
        const ok = await DB.undoLastWater();
        if (ok) {
          await loadHealthView();
          showToast(S.language === 'en' ? 'Last glass removed (slot stays used).' : 'Cofnięto ostatnią szklankę (slot pozostaje zużyty)', 'info');
        } else {
          showToast(S.language === 'en' ? 'Nothing to undo.' : 'Brak wpisów do cofnięcia', 'warn');
        }
      };
    }
  }

  function renderMealLog(mealLogs) {
    const container = $('mealLog');
    const totalCal  = mealLogs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
    const calTotal  = $('mealCalTotal');
    const calSum    = $('mealCalSum');

    if (!mealLogs.length) {
      container.innerHTML = `<div class="health-empty">${S.language === 'en' ? 'No meals today' : 'Brak posiłków dziś'}</div>`;
      if (calTotal) calTotal.style.display = 'none';
      return;
    }
    if (calTotal) { calTotal.style.display = 'block'; calSum.textContent = totalCal; }

    container.innerHTML = mealLogs.map(l => `
      <div class="health-log-item">
        <span class="health-emoji">🍽️</span>
        <span>${escH(l.note || l.value)}</span>
        ${l.calories ? `<span style="font-family:var(--font-mono);font-size:10px;color:var(--accent4)">${l.calories} kcal</span>` : ''}
        <span class="log-time">${fmtTime(l.timestamp)}</span>
        <button class="log-del" data-hid="${l.id}">×</button>
      </div>`).join('');
    container.querySelectorAll('.log-del').forEach(btn =>
      btn.addEventListener('click', async e => {
        await DB.deleteHealthLog(Number(e.currentTarget.dataset.hid));
        await loadHealthView();
      })
    );
  }

  function renderMovementLog(moveLogs) {
    const totalMin  = moveLogs.reduce((s, l) => s + (l.value || 0), 0);
    $('movementTotal').textContent = S.language === 'en'
      ? `${totalMin} min of movement today`
      : `${totalMin} min ruchu dziś`;
    const container = $('movementLog');
    if (!moveLogs.length) {
      container.innerHTML = `<div class="health-empty">${S.language === 'en' ? 'No movement today' : 'Brak aktywności fizycznej dziś'}</div>`;
      return;
    }
    container.innerHTML = moveLogs.map(l => `
      <div class="health-log-item">
        <span class="health-emoji">🏃</span>
        <span>${l.value} min ${escH(l.note || '')}</span>
        <span class="log-time">${fmtTime(l.timestamp)}</span>
        <button class="log-del" data-hid="${l.id}">×</button>
      </div>`).join('');
    container.querySelectorAll('.log-del').forEach(btn =>
      btn.addEventListener('click', async e => {
        await DB.deleteHealthLog(Number(e.currentTarget.dataset.hid));
        await loadHealthView();
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLEEP VIEW (Phase 3)
  // ─────────────────────────────────────────────────────────────────────────

  function calcSleepTimes(wakeTimeStr) {
    const [wh, wm]   = wakeTimeStr.split(':').map(Number);
    const wakeMin    = wh * 60 + wm;
    const FALL_ASLEEP = 15;
    const results    = [];
    for (let cycles = 6; cycles >= 3; cycles--) {
      const sleepMin = (wakeMin - (cycles * 90 + FALL_ASLEEP) + 1440) % 1440;
      const sh = Math.floor(sleepMin / 60), sm = sleepMin % 60;
      results.push({
        cycles,
        bedtime:  `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`,
        duration: `${(cycles * 90 / 60).toFixed(1)}h`,
      });
    }
    return results;
  }

  function initSleepView() {
    const btnCalc = $('btnCalcSleep');
    if (btnCalc && !btnCalc._bound) {
      btnCalc._bound = true;
      btnCalc.addEventListener('click', () => {
        const wakeTime = $('sleepWakeTime').value;
        if (!wakeTime) return;
        const results = calcSleepTimes(wakeTime);
        $('sleepResultGrid').innerHTML = results.map(r => `
          <div class="sleep-result-card">
            <span class="src-cycles">${r.cycles} cykli</span>
            <span class="src-time">${r.bedtime}</span>
            <span class="src-duration">${r.duration} snu</span>
          </div>`).join('');
        $('sleepResults').style.display = 'block';
      });
    }

    const btnLogSleep = $('btnLogSleep');
    if (btnLogSleep && !btnLogSleep._bound) {
      btnLogSleep._bound = true;
      btnLogSleep.addEventListener('click', async () => {
        const date     = $('sleepDate').value;
        const bedtime  = $('sleepBedtime').value;
        const wakeTime = $('sleepWakeLog').value;
        const quality  = parseInt($('sleepQuality').value) || 3;
        if (!date || !bedtime || !wakeTime) {
          showToast(S.language === 'en' ? 'Fill in the date and times.' : 'Uzupełnij datę i godziny', 'warn');
          return;
        }
        const [bh,bm] = bedtime.split(':').map(Number);
        const [wh,wm] = wakeTime.split(':').map(Number);
        let bedMin = bh*60+bm, wakeMin = wh*60+wm;
        if (wakeMin <= bedMin) wakeMin += 1440;
        const durationMin = wakeMin - bedMin;
        await DB.logSleep({ date, bedtime, wakeTime, durationMin, quality });
        await DB.addXP(50);
        await refreshXPBar();
        showToast(S.language === 'en'
          ? `Sleep saved (${Math.round(durationMin/60*10)/10}h) - +50 XP`
          : `Sen zapisany (${Math.round(durationMin/60*10)/10}h) - +50 XP`, 'success');
        const sleepHours = calculateSleepDurationHours(bedtime, wakeTime);
        if (sleepHours < 6) {
          zeusSpeak(`You slept ${sleepHours.toFixed(1)} hours. Even gods require more.`, 'Warning', 'high');
        } else {
          zeusSpeak(`Recovery logged: ${sleepHours.toFixed(1)}h. A sharper mind returns.`, 'Approving');
        }
        await loadSleepHistory();
        await loadQuickStats();
        $('sleepDate').value = $('sleepBedtime').value = $('sleepWakeLog').value = $('sleepQuality').value = '';
      });
    }
  }

  async function loadSleepHistory() {
    const logs = await DB.getSleepLogs(7);
    const el   = $('sleepHistory');
    if (!el) return;
    if (!logs.length) {
      el.innerHTML = `<div class="health-empty">${S.language === 'en' ? 'No sleep data yet' : 'Brak danych snu'}</div>`;
      return;
    }
    el.innerHTML = logs.map(l => {
      const stars = '★'.repeat(l.quality) + '☆'.repeat(5 - l.quality);
      const h     = Math.round(l.durationMin / 60 * 10) / 10;
      return `<div class="sleep-hist-item">
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${l.date}</span>
        <span>${l.bedtime} → ${l.wakeTime}</span>
        <span style="color:var(--accent)">${h}h</span>
        <span class="sleep-quality-stars" title="Jakość ${l.quality}/5">${stars}</span>
        <button class="log-del" data-sid="${l.id}">×</button>
      </div>`;
    }).join('');
    el.querySelectorAll('[data-sid]').forEach(btn =>
      btn.addEventListener('click', async e => {
        await DB.deleteSleepLog(Number(e.currentTarget.dataset.sid));
        await loadSleepHistory();
      })
    );
    applyProgressiveDisclosure();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS, ALARM, PWA INSTALL, GOOGLE BACKUP
  // ─────────────────────────────────────────────────────────────────────────

  function loadSettingsView() {
    const languageSelect = $('languageSelect');
    const themeSelect = $('themeSelect');
    if (languageSelect) languageSelect.value = S.language;
    if (themeSelect) themeSelect.value = S.theme;
    if ($('headerLangSelect')) $('headerLangSelect').value = S.language;
    refreshConnectionViews();
  }

  function initSettingsView() {
    $('languageSelect')?.addEventListener('change', e => {
      const lang = e.target.value === 'en' ? 'en' : 'pl';
      applyLanguage(lang);
      saveAppSettings({ language: lang });
      if ($('headerLangSelect')) $('headerLangSelect').value = lang;
      showToast(t('languageSwitched'), 'success');
    });

    const headerLangSel = $('headerLangSelect');
    if (headerLangSel) {
      headerLangSel.value = S.language;
      headerLangSel.addEventListener('change', e => {
        const lang = e.target.value === 'en' ? 'en' : 'pl';
        applyLanguage(lang);
        saveAppSettings({ language: lang });
        if ($('languageSelect')) $('languageSelect').value = lang;
        showToast(t('languageSwitched'), 'success');
      });
    }

    $('themeSelect')?.addEventListener('change', e => {
      const theme = e.target.value;
      applyTheme(theme);
      saveAppSettings({ theme: S.theme });
      e.target.value = S.theme;
      showToast(`${t('settingsThemePanel')}: ${t(`themeNames.${S.theme}`)}`, 'success');
    });

    const hardcoreToggle = document.getElementById('hardcoreModeToggle');
    if (hardcoreToggle) {
      hardcoreToggle.checked = S.hardcoreMode;
      hardcoreToggle.addEventListener('change', async () => {
        if (hardcoreToggle.checked) {
          const ok = window.confirm(t('hardcoreConfirm'));
          if (!ok) {
            hardcoreToggle.checked = false;
            return;
          }
        }
        S.hardcoreMode = hardcoreToggle.checked;
        await DB.setSetting('hardcore_mode', S.hardcoreMode);
        showToast(S.hardcoreMode ? t('hardcoreEnabled') : t('hardcoreDisabled'), 'info');
        updateHardcoreStopState();
      });
    }

    const zeusSelect = $('zeusStyleSelect');
    if (zeusSelect) {
      zeusSelect.value = S.zeusStyle;
      zeusSelect.addEventListener('change', () => {
        S.zeusStyle = zeusSelect.value;
        setLS(LS_KEYS.zeusStyle, S.zeusStyle);
        zeusSpeak('Zeus voice adjusted to your preference.', 'Observing');
      });
    }

    $('btnConnectWalletSettings')?.addEventListener('click', async () => {
      await connectMonadWallet(true);
      S.appMode = 'monad';
      await DB.setSetting('app_mode', 'monad');
      updateModeIndicator();
      refreshConnectionViews();
      applyProgressiveDisclosure();
      showToast(t('walletConnected'), 'success');
    });

    $('btnDisconnectWalletSettings')?.addEventListener('click', () => disconnectWalletFlow());
    $('btnGoogleConnect')?.addEventListener('click', async () => {
      await requestGoogleAccess({ uploadBackup: false });
    });
    $('btnGoogleDisconnect')?.addEventListener('click', () => disconnectGoogleFlow());
    $('btnShowAccessScreen')?.addEventListener('click', () => {
      openModeSplash();
      showToast(t('accessScreenReopened'), 'info');
    });
  }

  async function initDailyGoal() {
    const goalMin = await DB.getSetting('daily_goal_min', 0);
    const input = $('dailyGoalMin');
    if (input && goalMin > 0) input.value = goalMin;
    $('btnSaveGoal')?.addEventListener('click', async () => {
      const value = Math.max(0, parseInt($('dailyGoalMin')?.value || '0', 10) || 0);
      await DB.setSetting('daily_goal_min', value);
      await refreshDailyGoal();
      showToast(value > 0 ? t('dailyGoalSet', { value }) : t('dailyGoalCleared'), 'success');
    });
  }

  async function refreshDailyGoal(todaySec = null) {
    const goalMin = await DB.getSetting('daily_goal_min', 0);
    const fill = $('goalFill');
    const label = $('goalLabel');
    if (!fill || !label) return;
    if (!goalMin) {
      fill.style.width = '0%';
      label.textContent = t('noGoalSet');
      return;
    }
    let totalSec = todaySec;
    if (totalSec == null) {
      const tasks = await DB.getTasksForDay(DB.toDateStr());
      totalSec = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    }
    const goalSec = goalMin * 60;
    const pct = Math.min(100, Math.round((totalSec / goalSec) * 100));
    fill.style.width = `${pct}%`;
    label.textContent = pct >= 100
      ? t('goalCompleted', { done: Math.round(totalSec / 60), goal: goalMin })
      : t('goalProgress', { done: Math.round(totalSec / 60), goal: goalMin });
  }

  function ringAlarm() {
    // Tiny local beep sequence generated with Web Audio API.
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    let ctx;
    try { ctx = new AudioCtx(); } catch { return; }
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.001;
      gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  function ringSoftBell() {
    if (!S.pomodoro.sound) return;
    ringAlarm();
  }

  function formatMMSS(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function syncFocusSoundButton() {
    const btn = $('btnFocusSound');
    const label = $('focusSoundLabel');
    const icon = $('focusSoundIcon');
    if (btn) btn.setAttribute('aria-pressed', String(!!S.pomodoro.sound));
    if (label) label.textContent = S.pomodoro.sound ? t('soundOn') : t('soundOff');
    if (icon) icon.textContent = S.pomodoro.sound ? 'ON' : 'OFF';
  }

  function updatePomodoroUI() {
    const el = $('pomodoroState');
    if (!el) return;
    const phaseLabel = S.pomodoro.phase === 'focus' ? t('focusCycleFocus') : t('focusCycleBreak');
    const statusLabel = S.pomodoro.running ? phaseLabel : t('focusCycleReady');
    el.textContent = `${statusLabel} - ${formatMMSS(Math.max(0, S.pomodoro.remainingSec))}`;
    if ($('btnPomodoroStart')) $('btnPomodoroStart').textContent = S.pomodoro.running ? t('focusCycleRestart') : t('focusCycleStart');
    if ($('btnPomodoroSkip')) $('btnPomodoroSkip').textContent = S.pomodoro.phase === 'focus' ? t('focusCycleToBreak') : t('focusCycleToFocus');
    if ($('btnDeepWorkMode')) $('btnDeepWorkMode').textContent = document.body.classList.contains('deep-work') ? t('exitDeepWork') : t('deepWork');
    syncFocusSoundButton();
    updateFocusFlowState();
    updateDeepFocusUI();
  }

  async function switchPomodoroPhase() {
    S.pomodoro.phase = S.pomodoro.phase === 'focus' ? 'break' : 'focus';
    S.pomodoro.remainingSec = (S.pomodoro.phase === 'focus' ? S.pomodoro.focusMin : S.pomodoro.breakMin) * 60;
    ringSoftBell();
    if (S.pomodoro.phase === 'break' && S.activeTask) {
      try {
        localStorage.removeItem(HARDCORE_ACTIVE_KEY);
        await DB.stopActiveTask();
        clearActiveUI();
        await loadRecentLog();
        await loadQuickStats();
      } catch (e) {
        console.warn('[pomodoro] stop failed', e);
      }
    }
    updatePomodoroUI();
    showToast(S.pomodoro.phase === 'focus' ? t('focusSprintStarted') : t('recoveryBreakStarted'), 'info');
  }

  function startPomodoroLoop() {
    if (S.pomodoro.interval) clearInterval(S.pomodoro.interval);
    S.pomodoro.running = true;
    S.pomodoro.interval = setInterval(async () => {
      S.pomodoro.remainingSec -= 1;
      updatePomodoroUI();
      if (S.pomodoro.remainingSec <= 0) {
        await switchPomodoroPhase();
      }
    }, 1000);
  }

  async function initPomodoro() {
    const saved = await DB.getSetting('pomodoro_settings', null);
    if (saved && typeof saved === 'object') {
      S.pomodoro.focusMin = Math.min(90, Math.max(10, Number(saved.focusMin) || 25));
      S.pomodoro.breakMin = Math.min(30, Math.max(3, Number(saved.breakMin) || 5));
      S.pomodoro.sound = saved.sound !== false;
    }
    $('pomodoroFocusMin') && ($('pomodoroFocusMin').value = String(S.pomodoro.focusMin));
    $('pomodoroBreakMin') && ($('pomodoroBreakMin').value = String(S.pomodoro.breakMin));
    S.pomodoro.remainingSec = S.pomodoro.focusMin * 60;
    updatePomodoroUI();

    $('btnPomodoroStart')?.addEventListener('click', async () => {
      S.pomodoro.focusMin = Math.min(90, Math.max(10, parseInt($('pomodoroFocusMin')?.value || '25', 10) || 25));
      S.pomodoro.breakMin = Math.min(30, Math.max(3, parseInt($('pomodoroBreakMin')?.value || '5', 10) || 5));
      await DB.setSetting('pomodoro_settings', {
        focusMin: S.pomodoro.focusMin,
        breakMin: S.pomodoro.breakMin,
        sound: S.pomodoro.sound,
      });
      if (!S.activeTask) {
        const name = $('taskName')?.value?.trim() || t('focusSprintFallbackName');
        $('taskName').value = name;
        await handleStart();
      }
      S.pomodoro.phase = 'focus';
      S.pomodoro.remainingSec = S.pomodoro.focusMin * 60;
      startPomodoroLoop();
      updatePomodoroUI();
      showToast(t('focusCycleStarted'), 'success');
    });

    $('btnPomodoroSkip')?.addEventListener('click', async () => {
      if (S.hardcoreMode) {
        zeusSpeak('Hardcore law: no skipping phases.', 'Judging', 'high');
        return;
      }
      await switchPomodoroPhase();
      if (!S.pomodoro.running) startPomodoroLoop();
      updatePomodoroUI();
    });

    $('btnFocusSound')?.addEventListener('click', async () => {
      S.pomodoro.sound = !S.pomodoro.sound;
      await DB.setSetting('pomodoro_settings', {
        focusMin: S.pomodoro.focusMin,
        breakMin: S.pomodoro.breakMin,
        sound: S.pomodoro.sound,
      });
      syncFocusSoundButton();
      showToast(S.pomodoro.sound ? t('focusSoundEnabled') : t('focusSoundMuted'), 'info');
    });
  }

  async function setDeepWorkMode(enabled) {
    const overlay = $('deepFocusOverlay');
    if (!overlay) return false;
    if (enabled && !S.activeTask) {
      showToast(t('deepFocusNeedsSession'), 'warn');
      $('taskName')?.focus();
      return false;
    }
    document.body.classList.toggle('deep-work', enabled);
    overlay.classList.toggle('open', enabled);
    overlay.setAttribute('aria-hidden', String(!enabled));
    if (enabled) {
      zeusSpeak('Lock in.', 'Demanding', 'high');
      if (document.documentElement.requestFullscreen) {
        try { await document.documentElement.requestFullscreen(); } catch {}
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch {}
    }
    updatePomodoroUI();
    updateDeepFocusUI();
    return true;
  }

  function initDeepWorkMode() {
    $('btnDeepWorkMode')?.addEventListener('click', async () => {
      await setDeepWorkMode(!document.body.classList.contains('deep-work'));
    });
    $('btnDeepFocusExit')?.addEventListener('click', async () => {
      await setDeepWorkMode(false);
    });
    $('btnDeepFocusStop')?.addEventListener('click', async () => {
      if ($('btnDeepFocusStop')?.disabled) return;
      await handleStop();
    });
  }


  async function getSkillPointsInfo() {
    const skillState = await getSkillState();
    const earned = Math.floor(Math.max(0, S.userLevel - 1) / 2);
    const spent = Number(skillState.spentPoints || 0);
    return { earned, spent, available: Math.max(0, earned - spent), state: skillState };
  }

  async function renderSkillTree() {
    const grid = $('skillTreeGrid');
    if (!grid) return;
    const { available, state } = await getSkillPointsInfo();
    if ($('skillPointsLabel')) $('skillPointsLabel').textContent = t('skillPointsLabel', { value: available });
    const branchNames = S.language === 'en'
      ? { discipline: 'Discipline', focus: 'Focus', power: 'Power' }
      : { discipline: 'Dyscyplina', focus: 'Skupienie', power: 'Moc' };
    const mkBranch = (branchName, nodes) => {
      const items = nodes.map(n => {
        const skillInfo = localizeSkill(n);
        const unlocked = hasSkill(state, n.id);
        const reqMet = !n.requires || hasSkill(state, n.requires);
        const levelMet = S.userLevel >= n.levelReq;
        const canUnlock = !unlocked && reqMet && levelMet && available > 0;
        const status = unlocked ? 'unlocked' : canUnlock ? 'ready' : 'locked';
        const meta = S.language === 'en'
          ? `Tier ${n.tier} · Lv ${n.levelReq}+`
          : `Tier ${n.tier} · Poziom ${n.levelReq}+`;
        const stateLabel = unlocked ? t('skillStateUnlocked') : canUnlock ? t('skillStateReady') : t('skillStateLocked');
        return `<div class="skill-node-row ${unlocked ? 'is-unlocked' : ''} ${canUnlock ? 'is-ready' : ''}">
          <span class="skill-node-row__line" aria-hidden="true"></span>
          <button class="skill-node skill-node--${status}" data-skill="${n.id}" data-skill-status="${status}">
            <div class="skill-node__head">
              <span class="skill-node__tier">T${n.tier}</span>
              <span class="skill-node__state">${stateLabel}</span>
            </div>
            <div class="skill-name">${skillInfo.name}</div>
            <div class="skill-desc">${skillInfo.desc}</div>
            <div class="skill-meta">${meta}</div>
          </button>
        </div>`;
      }).join('');
      return `<div class="skill-branch">
        <div class="skill-branch-title">${branchName}</div>
        <div class="skill-branch-track">${items}</div>
      </div>`;
    };
    grid.innerHTML = [
      mkBranch(branchNames.discipline, SKILL_TREE.discipline),
      mkBranch(branchNames.focus, SKILL_TREE.focus),
      mkBranch(branchNames.power, SKILL_TREE.power),
    ].join('');
    grid.querySelectorAll('[data-skill]').forEach(btn => {
      btn.addEventListener('click', async e => {
        const skillId = e.currentTarget.dataset.skill;
        await tryUnlockSkill(skillId);
      });
    });
  }

  async function tryUnlockSkill(skillId) {
    const { available, state } = await getSkillPointsInfo();
    const skill = allSkillsFlat().find(s => s.id === skillId);
    if (!skill) return;
    if (available <= 0) return showToast(t('noSkillPoints'), 'warn');
    if (hasSkill(state, skillId)) return;
    if (S.userLevel < skill.levelReq) return showToast(t('skillRequiresLevel', { level: skill.levelReq }), 'warn');
    if (skill.requires && !hasSkill(state, skill.requires)) return showToast(t('skillRequiresPrevious'), 'warn');
    state.unlocked.push(skillId);
    state.spentPoints = Number(state.spentPoints || 0) + 1;
    await setSkillState(state);
    await renderSkillTree();
    const unlockedNode = document.querySelector(`[data-skill="${skillId}"]`);
    unlockedNode?.classList.add('skill-node--new');
    setTimeout(() => unlockedNode?.classList.remove('skill-node--new'), 1400);
    const localizedSkill = localizeSkill(skill);
    zeusSpeak(
      S.language === 'en'
        ? `Path chosen: ${localizedSkill.name}. Your style is being forged.`
        : `Wybrano ścieżkę: ${localizedSkill.name}. Twój styl działania właśnie się kształtuje.`,
      'Fired Up',
      'high',
    );
  }

  function updateAlarmStatus(msg, colorVar = '--accent4') {
    const status = $('alarmStatus');
    if (!status) return;
    status.textContent = msg;
    status.style.color = `var(${colorVar})`;
  }

  function cancelAlarm() {
    if (S.alarm.intervalId) clearInterval(S.alarm.intervalId);
    S.alarm.intervalId = null;
    S.alarm.time = null;
    localStorage.removeItem('focusos_alarm_time');
    updateAlarmStatus(t('alarmIdle'));
  }

  function scheduleAlarm(timeStr) {
    cancelAlarm();
    S.alarm.time = timeStr;
    localStorage.setItem('focusos_alarm_time', timeStr);
    updateAlarmStatus(`${t('alarmSet')} ${timeStr}`);

    S.alarm.intervalId = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const today = DB.toDateStr(now);
      if (hhmm === S.alarm.time && S.alarm.triggeredForDate !== today) {
        S.alarm.triggeredForDate = today;
        ringAlarm();
        sendAlert('⏰ FocusOS Alarm', `Alarm ${S.alarm.time}`);
        showToast(`⏰ Alarm ${S.alarm.time}`, 'warn', 7000);
      }
    }, 1000);
  }

  function initAlarmClock() {
    const savedAlarm = localStorage.getItem('focusos_alarm_time');
    if (savedAlarm) scheduleAlarm(savedAlarm);
    else updateAlarmStatus(t('alarmIdle'));

    $('btnSetAlarm')?.addEventListener('click', () => {
      const timeVal = $('alarmTime')?.value;
      if (!timeVal) return;
      scheduleAlarm(timeVal);
    });
    $('btnCancelAlarm')?.addEventListener('click', () => {
      cancelAlarm();
      showToast(t('alarmCancelled'), 'info');
    });
  }

  // ── Inspect Toggles ─────────────────────────────────────────────────────
  function initInspectToggles() {
    document.querySelectorAll('.inspect-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.inspect;
        const body     = document.getElementById(targetId);
        if (!body) return;
        const open = body.hasAttribute('hidden');
        if (open) {
          body.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = 'INSPECT ▲';
        } else {
          body.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = 'INSPECT ▼';
        }
      });
    });
  }

  // In Engineer mode, auto-expand inspect bodies
  function applyInspectModeDefaults() {
    if (S.uxMode !== 'pro') return;
    document.querySelectorAll('.inspect-toggle').forEach(btn => {
      const bodyEl = document.getElementById(btn.dataset.inspect);
      if (bodyEl && bodyEl.hasAttribute('hidden')) btn.click();
    });
  }

  // ── Command Palette ──────────────────────────────────────────────────────
  function initCommandPalette() {
    const btn   = $('cmdPaletteBtn');
    const panel = $('cmdPalette');
    if (!btn || !panel) return;

    const toggle = () => {
      document.body.classList.toggle('cmd-palette-open');
      if (document.body.classList.contains('cmd-palette-open'))
        setTimeout(() => $('cmdInput')?.focus(), 60);
    };
    const close  = () => document.body.classList.remove('cmd-palette-open');

    btn.addEventListener('click', toggle);

    // Slash-command text input parser
    const cmdInput = $('cmdInput');
    if (cmdInput) {
      cmdInput.addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const raw = cmdInput.value.trim();
        cmdInput.value = '';
        close();
        const [cmd, ...rest] = raw.replace(/^\//,'').split(/\s+/);
        switch (cmd.toLowerCase()) {
          case 'woda': {
            const ml = parseInt(rest[0]) || 250;
            const slotState = await DB.consumeWaterSlot();
            if (slotState.ok) {
              await DB.logHealth({ type: 'water', value: 1, unit: 'glass', note: `${ml}ml` });
              await DB.addXP(20);
              await loadQuickStats();
              showToast(`💧 Woda zapisana (+${ml} ml).`, 'success');
            } else showToast('Dzienny limit wody osiągnięty.', 'warn');
            break;
          }
          case 'start': {
            const min  = parseInt(rest[0]) || 25;
            const name = rest.slice(1).join(' ') || 'Sesja skupienia';
            $('taskName').value    = name;
            $('taskCategory').value = 'work';
            switchTab('tracker');
            await handleStart();
            break;
          }
          case 'stop':
            if (!$('btnStop')?.disabled) await handleStop();
            break;
          case 'zen':  setUxMode('zen');  break;
          case 'pro':  setUxMode('pro');  break;
          case 'tab':  if (rest[0]) switchTab(rest[0]); break;
          default:
            showToast(`Nieznana komenda: /${cmd}`, 'warn');
        }
      });
    }

    // Close on Escape or click-outside
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); toggle();
      }
    });
    document.addEventListener('click', e => {
      if (document.body.classList.contains('cmd-palette-open') &&
          !panel.contains(e.target) && e.target !== btn) close();
    });

    // Wire command items
    panel.querySelectorAll('[data-cmd]').forEach(item => {
      item.addEventListener('click', async () => {
        close();
        const cmd = item.dataset.cmd;
        switch (cmd) {
          case 'start-session':   switchTab('tracker'); $('taskName')?.focus(); break;
          case 'stop-session':    if (!$('btnStop')?.disabled) await handleStop(); break;
          case 'deep-work':       $('btnDeepWorkMode')?.click(); break;
          case 'nav-tracker':     switchTab('tracker');  break;
          case 'nav-daily':       switchTab('daily');    break;
          case 'nav-weekly':      switchTab('weekly');   break;
          case 'nav-health':      switchTab('health');   break;
          case 'nav-settings':    switchTab('settings'); break;
          case 'mode-zen':        setUxMode('zen');      break;
          case 'mode-pro':        setUxMode('pro');      break;
          case 'show-bayesian':   setUxMode('pro'); switchTab('weekly'); break;
          case 'show-markov':     setUxMode('pro'); switchTab('weekly'); break;
          case 'export-proof': {
            const { oneClickProof } = await import('./js/attestation.js').catch(() => ({}));
            if (oneClickProof) {
              const tasks = await DB.getAllCompletedTasks();
              await oneClickProof({ tasks, walletAddress: S.walletAddress });
              showToast('🏆 Proof eksportowany!', 'success');
            } else { showToast('attestation.js nie załadowany', 'warn'); }
            break;
          }
          case 'mab-reset':
            MATH.createBreakOptimizer().reset();
            showToast('🔄 MAB zresetowany', 'info');
            break;
        }
      });
    });
  }

  // ── Panel Flash Confirmation ─────────────────────────────────────────────
  function triggerPanelFlash(panelSelector) {
    const el = typeof panelSelector === 'string'
      ? document.querySelector(panelSelector)
      : panelSelector;
    if (!el) return;
    el.classList.remove('panel--flash');
    void el.offsetWidth;
    el.classList.add('panel--flash');
    setTimeout(() => el.classList.remove('panel--flash'), 600);
  }

  // ── Sparkline SVG Generator ──────────────────────────────────────────────
  function buildSparklineSVG(values, { w = 60, h = 22, color = 'var(--accent)', fill = true } = {}) {
    if (!values || values.length < 2) return '';
    const min  = Math.min(...values);
    const max  = Math.max(...values);
    const range = max - min || 1;
    const step  = w / (values.length - 1);
    const pts   = values.map((v, i) => {
      const x = Math.round(i * step);
      const y = Math.round(h - ((v - min) / range) * (h - 2) - 1);
      return `${x},${y}`;
    });
    const polyline = pts.join(' ');
    const fillPath = fill
      ? `<polygon points="${polyline} ${w},${h} 0,${h}"
           fill="${color}" opacity="0.15"/>`
      : '';
    return `<svg class="sparkline-wrap" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${fillPath}
      <polyline points="${polyline}"
        fill="none" stroke="${color}" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function initAmbientControls() {
    const toggleBtn  = $('btnAmbientToggle');
    const typeSelect = $('ambientType');
    const volSlider  = $('ambientVolume');
    const volLabel   = $('ambientVolumeLabel');
    if (!toggleBtn) return;

    let running = false;

    toggleBtn.addEventListener('click', () => {
      if (running) {
        stopAmbient();
        running = false;
        toggleBtn.textContent = '\u25b6 Start';
        toggleBtn.classList.remove('btn--active');
      } else {
        const type = typeSelect?.value || 'brown';
        const vol  = (parseInt(volSlider?.value ?? 3)) / 100;
        startAmbient(type, vol);
        running = true;
        toggleBtn.textContent = '\u23f9 Stop';
        toggleBtn.classList.add('btn--active');
      }
    });

    volSlider?.addEventListener('input', () => {
      const v = parseInt(volSlider.value);
      if (volLabel) volLabel.textContent = v;
      if (running) setAmbientVolume(v / 100);
    });

    typeSelect?.addEventListener('change', () => {
      if (running) {
        stopAmbient();
        const vol = (parseInt(volSlider?.value ?? 3)) / 100;
        startAmbient(typeSelect.value, vol);
      }
    });
  }

  function initPwaInstall() {
    const installButton = $('installButton');
    const installHint = $('installHint');
    if (!installButton) return;
    if (installButton) installButton.classList.add('hidden');

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      S.deferredInstallPrompt = e;
      S.installAvailable = true;
      if (installButton) installButton.classList.remove('hidden');
      if (installHint) installHint.textContent = t('installReady');
    });

    const installNow = async () => {
      if (!S.deferredInstallPrompt) {
        showToast(t('installUnavailable'), 'warn');
        return;
      }
      S.deferredInstallPrompt.prompt();
      const choice = await S.deferredInstallPrompt.userChoice;
      S.deferredInstallPrompt = null;
      if (installButton) installButton.classList.add('hidden');
      if (choice.outcome === 'accepted') showToast(t('installDone'), 'success');
      else showToast(t('installDismissed'), 'info');
    };

    installButton?.addEventListener('click', installNow);
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('%c⚡ FocusOS SW zarejestrowany', 'color:#39ff14;font-family:monospace', reg.scope);
    } catch (err) {
      console.warn('[FocusOS] SW rejestracja nieudana:', err);
    }
  }

  async function uploadBackupToGoogleDrive(accessToken) {
    const dbPayload = JSON.parse(await DB.exportJSON());
    dbPayload.extended_local = getExtendedLocalDataSnapshot();
    dbPayload.exported_at = new Date().toISOString();
    const metadata = {
      name: 'FocusOS_Backup.json',
      mimeType: 'application/json',
    };
    const boundary = 'focusos_boundary';
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${JSON.stringify(dbPayload, null, 2)}\r\n` +
      `--${boundary}--`;
    const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!upload.ok) throw new Error(`HTTP ${upload.status}`);
  }

  async function requestGoogleAccess({ uploadBackup = false } = {}) {
    if (!window.google?.accounts?.oauth2) {
      showToast(t('googleServicesMissing'), 'error');
      return;
    }
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE')) {
      showToast(t('backupMissingClient'), 'warn', 7000);
      return;
    }
    S.googleRequestMode = uploadBackup ? 'backup' : 'connect';
    if (!S.googleTokenClient) {
      S.googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: async (resp) => {
          if (!resp?.access_token) {
            showToast(t('backupFailed') + t('missingAccessToken'), 'error');
            return;
          }
          setGoogleConnectionState(true, resp.access_token);
          try {
            if (S.googleRequestMode === 'backup') {
              await uploadBackupToGoogleDrive(resp.access_token);
              showToast(t('backupDone'), 'success', 6000);
            } else {
              if (!S.appMode) {
                S.appMode = 'google';
                await DB.setSetting('app_mode', 'google');
              }
              showToast(t('googleConnectedToast'), 'success');
            }
          } catch (err) {
            showToast(t('backupFailed') + err.message, 'error', 7000);
          }
        },
      });
    }
    S.googleTokenClient.requestAccessToken();
  }

  function initGoogleBackup() {
    $('btnGoogleBackup')?.addEventListener('click', async () => {
      await requestGoogleAccess({ uploadBackup: true });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BACKFILL MODAL
  // ─────────────────────────────────────────────────────────────────────────

  function initBackfillModal() {
    $('btnOpenBackfill').addEventListener('click', () => {
      $('backfillDate').value = DB.toDateStr();
      $('backfillModal').classList.add('open');
    });
    $('backfillClose').addEventListener('click', () => $('backfillModal').classList.remove('open'));
    $('backfillModal').addEventListener('click', e => {
      if (e.target === $('backfillModal')) $('backfillModal').classList.remove('open');
    });
    $('backfillForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name      = $('backfillName').value.trim();
      const category  = $('backfillCategory').value;
      const date      = $('backfillDate').value;
      const startTime = $('backfillStart').value;
      const durationM = parseInt($('backfillDuration').value);
      if (!name || !date || !startTime || !durationM) { showToast('⚠️ Uzupełnij wszystkie pola', 'warn'); return; }
      const [hh, mm] = startTime.split(':').map(Number);
      await DB.addBackfill({ name, category, date, startHH:hh, startMM:mm, durationMinutes:durationM });
      showToast(`✅ Dodano retro: "${name}" (${durationM} min)`, 'success');
      $('backfillModal').classList.remove('open');
      $('backfillForm').reset();
      await loadRecentLog(); await loadQuickStats();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS & SMART ALERTS
  // ─────────────────────────────────────────────────────────────────────────

  async function initNotifications() {
    const saved = await DB.getSetting('notif_settings');
    if (saved) Object.assign(S.notif, saved);

    $('btnOpenNotif').addEventListener('click', () => {
      $('notifWater').checked  = S.notif.waterEnabled;
      $('notifWaterH').value   = S.notif.waterIntervalH;
      $('notifBreak').checked  = S.notif.breakEnabled;
      $('notifBreakM').value   = S.notif.breakThresholdM;
      $('notifModal').classList.add('open');
    });
    $('notifClose').addEventListener('click', () => $('notifModal').classList.remove('open'));
    $('notifModal').addEventListener('click', e => {
      if (e.target === $('notifModal')) $('notifModal').classList.remove('open');
    });
    $('notifSave').addEventListener('click', async () => {
      S.notif.waterEnabled     = $('notifWater').checked;
      S.notif.waterIntervalH   = parseFloat($('notifWaterH').value) || 2;
      S.notif.breakEnabled     = $('notifBreak').checked;
      S.notif.breakThresholdM  = parseInt($('notifBreakM').value) || 90;
      await DB.setSetting('notif_settings', S.notif);
      showToast(`✅ ${t('settingsSaved')}`, 'success');
      $('notifModal').classList.remove('open');
    });

    S.alertInterval = setInterval(checkSmartAlerts, 60000);
  }

  async function checkSmartAlerts() {
    const now = Date.now();

    // ── Idle Alert (Phase 4): 2h without any tracked activity ─────────────
    const idleMs = now - S.lastActivity;
    if (idleMs >= 2 * 3600 * 1000 && !S.activeTask) {
      sendAlert('⚡ Zeus Reminder', 'No focus activity for 2h. Start your next session.');
      S.lastActivity = now;
    }

    const lastRoutinePing = Number(localStorage.getItem('focusos_routine_ping') || '0');
    const morningHour = new Date().getHours();
    if (morningHour >= 7 && morningHour <= 10 && now - lastRoutinePing > 8 * 3600000) {
      sendAlert('⚡ Zeus Ritual', 'Complete your morning routine before distractions take over.');
      localStorage.setItem('focusos_routine_ping', String(now));
    }

    // ── Water reminder ─────────────────────────────────────────────────────
    if (S.notif.waterEnabled) {
      const thresholdMs = S.notif.waterIntervalH * 3600 * 1000;
      let lastWater     = S.lastWaterLog;
      if (!lastWater) {
        const logs = await DB.getHealthForDay(DB.toDateStr());
        const wl   = logs.filter(l => l.type === 'water');
        lastWater  = wl.length ? new Date(wl[wl.length-1].timestamp) : null;
        S.lastWaterLog = lastWater;
      }
      const sinceWater = now - (lastWater ? lastWater.getTime() : (now - thresholdMs - 1));
      if (sinceWater >= thresholdMs) {
        sendAlert('💧 Czas na wodę!', `Nie piłeś wody od ${Math.round(sinceWater/3600000*10)/10}h.`);
        S.lastWaterLog = new Date();
      }
    }

    // ── Break reminder (Fatigue Curve) ─────────────────────────────────────
    if (S.notif.breakEnabled && S.activeTask && S.sessionStart) {
      const workCats = new Set(['work','coding','learning','planning']);
      if (workCats.has(S.activeTask.category)) {
        const sessionMin = Math.floor((now - S.sessionStart.getTime()) / 60000);
        const fatigue    = MATH.fatigueCurve(sessionMin);
        if (fatigue.shouldBreak) {
          sendAlert('🧠 Czas na przerwę!',
            `${sessionMin} min ciągłej pracy. Wydajność: ${fatigue.currentEfficiency}%. Zrób ${fatigue.recoveryMinutes} min przerwy.`);
          S.sessionStart = new Date(now + 20 * 60000);
        }
      }
    }

    // ── Toxic Productivity Alert (Phase 4): 5+ h continuous deep work ─────
    if (S.activeTask && S.sessionStart && now > S.toxicSnoozedUntil) {
      const deepCats = new Set(['learning','coding','work']);
      if (deepCats.has(S.activeTask.category)) {
        const sessionH = (now - S.sessionStart.getTime()) / 3600000;
        if (sessionH >= 5) {
          $('toxicSessionHours').textContent = Math.round(sessionH * 10) / 10;
          $('toxicCatName').textContent      = DB.CAT_LABELS[S.activeTask.category] || S.activeTask.category;
          $('toxicModal').classList.add('open');
        }
      }
    }
  }

  function sendAlert(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
      });
    }
    showToast(`${title} ${body.slice(0, 60)}...`, 'warn', 7000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODE SPLASH + WEB3 PLACEHOLDERS
  // ─────────────────────────────────────────────────────────────────────────

  async function selectMode(mode) {
    S.appMode = mode;
    await DB.setSetting('app_mode', mode);
    try {
      if (mode === 'monad') {
        await connectMonadWallet();
        $('web3Panel')?.classList.remove('hidden');
      } else if (mode === 'google') {
        $('web3Panel')?.classList.add('hidden');
        await requestGoogleAccess({ uploadBackup: false });
      } else {
        $('web3Panel')?.classList.add('hidden');
      }
    } catch (error) {
      console.warn('[mode-splash] selection failed', error);
      showToast(t('connectionAttemptFailed'), 'warn');
      S.appMode = 'local';
      await DB.setSetting('app_mode', 'local');
      $('web3Panel')?.classList.add('hidden');
    }
    updateModeIndicator();
    refreshConnectionViews();
    // Request notification permission after explicit user interaction
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') showToast(`🔔 ${t('notificationsEnabled')}`, 'success');
      });
    }
    document.body.classList.remove('app-locked');
    $('modeSplash')?.classList.add('hidden');
    switchTab('tracker');
    await loadTrackerView();
    applyProgressiveDisclosure();
    await maybeStartGuidedEntry();
  }
  function updateModeIndicator() {
    const el = $('modeIndicator');
    if (!el) return;
    if (S.appMode === 'monad') {
      const short = S.walletAddress ? `${S.walletAddress.slice(0, 6)}...${S.walletAddress.slice(-4)}` : t('notConnected');
      el.textContent = t('modeWallet', { address: short });
      return;
    }
    if (S.appMode === 'google' || S.googleConnected) {
      el.textContent = t('modeGoogle');
      return;
    }
    el.textContent = t('modeLocal');
  }

  async function connectMonadWallet(forceRequest = false) {
    if (!forceRequest) {
      const saved = localStorage.getItem(LS_KEYS.wallet);
      if (saved) S.walletAddress = saved;
    }
    if ((!S.walletAddress || forceRequest) && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        S.walletAddress = accounts?.[0] || null;
      } catch (e) {
        const msg = String(e?.message || '');
        const rejected = e?.code === 4001 || /rejected/i.test(msg);
        if (!rejected) {
          console.warn('[FocusOS:web3] wallet request failed, falling back to demo mode', e);
        }
        if (!S.walletAddress) {
          S.walletAddress = FALLBACK_WALLET_ADDRESS.includes('YOUR_MONAD_WALLET_ADDRESS_HERE')
            ? '0xDEMO00000000000000000000000000000000FCS'
            : FALLBACK_WALLET_ADDRESS;
        }
      }
    } else if (!S.walletAddress) {
      S.walletAddress = FALLBACK_WALLET_ADDRESS.includes('YOUR_MONAD_WALLET_ADDRESS_HERE')
        ? '0xDEMO00000000000000000000000000000000FCS'
        : FALLBACK_WALLET_ADDRESS;
    }
    if (S.walletAddress) localStorage.setItem(LS_KEYS.wallet, S.walletAddress);
    refreshConnectionViews();
  }

  async function stakeTokens() {
    if (S.appMode !== 'monad') return showToast(t('monadOnlyStake'), 'warn');
    S.stakedFCS += 25;
    localStorage.setItem(LS_KEYS.stakedFCS, String(S.stakedFCS));
    if ($('stakedAmountView')) $('stakedAmountView').textContent = `${S.stakedFCS} FCS`;
    showToast(t('stakeSuccess', { total: S.stakedFCS }), 'success');
  }

  async function burnTokens() {
    if (S.appMode !== 'monad') return showToast(t('monadOnlyBurn'), 'warn');
    showToast(t('burnSuccess'), 'info');
  }

  async function saveProgressToChain() {
    if (S.appMode !== 'monad') return showToast(t('monadOnlyChainSave'), 'warn');
    const payload = { day: DB.toDateStr(), xp: S.totalXP, ts: Date.now() };
    if (window.ethereum && S.walletAddress) {
      try {
        await window.ethereum.request({
          method: 'personal_sign',
          params: [JSON.stringify(payload), S.walletAddress],
        });
        showToast(t('chainSaveSuccess'), 'success');
        return;
      } catch (e) {
        showToast(t('chainSaveCanceled', { message: e.message }), 'warn');
        return;
      }
    }
    showToast(t('noWalletChainSave'), 'info');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEB3 WALLET + FCS TOKEN (ported from Web3Provider.tsx)
  // ─────────────────────────────────────────────────────────────────────────

  async function connectWallet() {
    if (!window.ethereum) {
      showToast('Nie znaleziono portfela. Zainstaluj MetaMask.', 'warn');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts?.[0] ?? null;
      if (!addr) { showToast('Anulowano połączenie z portfelem.', 'warn'); return; }
      S.walletAddress = addr;
      S.appMode = 'monad';
      localStorage.setItem(LS_KEYS.wallet, addr);
      updateModeIndicator();
      refreshConnectionViews();
      updateFcsBalanceView();
      showToast(`Połączono: ${addr.slice(0, 6)}...${addr.slice(-4)}`, 'success');
    } catch (e) {
      showToast(`Błąd połączenia: ${e?.message || e}`, 'warn');
    }
  }

  function disconnectWallet() {
    S.walletAddress = null;
    S.appMode = 'local';
    localStorage.removeItem(LS_KEYS.wallet);
    updateModeIndicator();
    refreshConnectionViews();
    updateFcsBalanceView();
    showToast('Rozłączono portfel.', 'info');
  }

  async function claimTestFCS() {
    S.fcsBalance += 100;
    updateFcsBalanceView();
    showToast('Otrzymano 100 FCS (testnet faucet).', 'success');
  }

  async function buyFCS(amount) {
    if (!amount || amount <= 0) return;
    const TREASURY_WALLET = '0x0000000000000000000000000000000000000000';
    if (window.ethereum && S.walletAddress && typeof ethers !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: TREASURY_WALLET,
          value: ethers.parseEther((0.0001 * amount).toString()),
        });
        await tx.wait();
      } catch (e) {
        showToast(`Transakcja anulowana: ${e?.message || e}`, 'warn');
        return;
      }
    }
    S.fcsBalance += amount;
    updateFcsBalanceView();
    showToast(`Zakupiono ${amount} FCS.`, 'success');
  }

  function getFCSBalance() {
    return S.fcsBalance;
  }

  function updateFcsBalanceView() {
    localStorage.setItem(LS_KEYS.fcsBalance, String(S.fcsBalance));
    if ($('fcsBalanceView')) $('fcsBalanceView').textContent = `${S.fcsBalance} FCS`;
  }

  async function initModeSplash() {
    $('btnStakeTokens')?.addEventListener('click', stakeTokens);
    $('btnBurnTokens')?.addEventListener('click', burnTokens);
    $('btnSaveToChain')?.addEventListener('click', saveProgressToChain);
    $('btnClaimFCS')?.addEventListener('click', claimTestFCS);
    $('btnConnectWallet')?.addEventListener('click', connectWallet);
    $('btnModeLocal')?.addEventListener('click', async () => {
      await selectMode('local');
    });
    $('btnModeMonad')?.addEventListener('click', async () => {
      await selectMode('monad');
    });
    $('btnModeGoogle')?.addEventListener('click', async () => {
      await selectMode('google');
    });
    refreshConnectionViews();
  }

  function renderList(containerId, items, emptyText, onDelete, onToggle) {
    const containerIds = Array.isArray(containerId) ? containerId : [containerId];
    const html = !items.length
      ? `<div class="health-empty">${emptyText}</div>`
      : items.map((it, idx) => `
      <div class="health-log-item">
        ${onToggle ? `<input type="checkbox" class="day-plan-check" data-chk="${idx}" ${it.done ? 'checked' : ''}>` : ''}
        <span style="${it.done ? 'text-decoration:line-through;opacity:.5;' : ''}flex:1">${escH(it.text)}</span>
        <span class="log-time">${new Date(it.ts).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span>
        <button class="log-del" data-del="${idx}">×</button>
      </div>
    `).join('');
    containerIds.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = html;
      el.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', e => onDelete(Number(e.currentTarget.dataset.del))));
      if (onToggle) el.querySelectorAll('[data-chk]').forEach(chk => chk.addEventListener('change', e => onToggle(Number(e.currentTarget.dataset.chk), e.currentTarget.checked)));
    });
  }

  function loadDayPlan() {
    const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
    const items = getLS(key, []);
    renderList(['dayPlanList', 'dayPlanListProfile'], items, t('dayPlanEmpty'), idx => {
      items.splice(idx, 1);
      setLS(key, items);
      loadDayPlan();
    }, (idx, checked) => {
      items[idx].done = checked;
      setLS(key, items);
      loadDayPlan();
    });
    updateDashboardCounters();
  }

  function markDayPlanProgress(taskName) {
    const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
    const items = getLS(key, []);
    const name = String(taskName || '').toLowerCase();
    const idx = items.findIndex(it => !it.done && (name.includes(String(it.text).toLowerCase()) || String(it.text).toLowerCase().includes(name)));
    if (idx >= 0) {
      items[idx].done = true;
      setLS(key, items);
      loadDayPlan();
      zeusSpeak('Daily plan task aligned with your focus session.', 'Approving');
    }
  }

  function loadSleepNotes() {
    const key = `${LS_KEYS.sleepNotes}:${DB.toDateStr()}`;
    const items = getLS(key, []);
    renderList(['sleepNotesList', 'sleepNotesListProfile'], items, t('sleepNotesEmpty'), idx => {
      items.splice(idx, 1);
      setLS(key, items);
      loadSleepNotes();
    });
    updateDashboardCounters();
  }

  function getRoutinesState() {
    return getLS(LS_KEYS.routines, {
      morning: [],
      evening: [],
      completions: {},
    });
  }

  function saveRoutinesState(state) {
    setLS(LS_KEYS.routines, state);
  }

  async function renderRoutines() {
    const state = getRoutinesState();
    const today = DB.toDateStr();
    const renderGroup = (key, containerId) => {
      const container = $(containerId);
      if (!container) return;
      const items = state[key] || [];
      if (!items.length) {
        const emptyText = key === 'morning' ? t('noMorningRoutine') : t('noEveningRoutine');
        container.innerHTML = `<div class="health-empty">${emptyText}</div>`;
        return;
      }
      container.innerHTML = items.map((it, idx) => {
        const done = !!state.completions?.[`${today}:${key}:${idx}`];
        return `<label class="routine-item ${done ? 'done' : ''}">
          <input type="checkbox" data-routine="${key}" data-ridx="${idx}" ${done ? 'checked' : ''}/>
          <span>${escH(it)}</span>
          <button class="log-del" data-rdel="${key}:${idx}">×</button>
        </label>`;
      }).join('');
    };
    renderGroup('morning', 'routineMorningList');
    renderGroup('evening', 'routineEveningList');

    const all = [...(state.morning || []), ...(state.evening || [])].length;
    const doneCount = Object.keys(state.completions || {}).filter(k => k.startsWith(`${today}:`) && state.completions[k]).length;
    if ($('routineProgress')) {
      $('routineProgress').textContent = S.language === 'en'
        ? `${doneCount} / ${all} completed today`
        : `${doneCount} / ${all} wykonanych dzisiaj`;
    }

    document.querySelectorAll('[data-routine][data-ridx]').forEach(cb => {
      cb.addEventListener('change', async e => {
        const key = e.currentTarget.dataset.routine;
        const idx = e.currentTarget.dataset.ridx;
        const cKey = `${today}:${key}:${idx}`;
        const wasDone = !!state.completions[cKey];
        state.completions[cKey] = e.currentTarget.checked;
        saveRoutinesState(state);
        if (!wasDone && e.currentTarget.checked) {
          const skillState = await getSkillState();
          const routineXP = hasSkill(skillState, 'iron_routine') ? 20 : 15;
          await DB.addXP(routineXP);
          await refreshXPBar();
          zeusSpeak('Ritual completed. Discipline is forged in repetition.', 'Approving');
        }
        renderRoutines();
      });
    });
    document.querySelectorAll('[data-rdel]').forEach(btn => {
      btn.addEventListener('click', e => {
        const [key, idxStr] = e.currentTarget.dataset.rdel.split(':');
        const idx = Number(idxStr);
        state[key].splice(idx, 1);
        Object.keys(state.completions).forEach(cKey => {
          if (cKey.includes(`:${key}:${idx}`)) delete state.completions[cKey];
        });
        saveRoutinesState(state);
        renderRoutines();
      });
    });
  }

  function initRoutines() {
    $('btnAddRoutine')?.addEventListener('click', () => {
      const type = $('routineType')?.value || 'morning';
      const text = $('routineInput')?.value.trim();
      if (!text) return;
      const state = getRoutinesState();
      state[type] = state[type] || [];
      state[type].push(text);
      saveRoutinesState(state);
      $('routineInput').value = '';
      renderRoutines();
    });
    renderRoutines();
  }

  function getTodayMissionState() {
    const today = DB.toDateStr();
    const state = getLS(LS_KEYS.missions, {});
    if (!state[today]) {
      state[today] = {
        sessions3: { progress: 0, target: 3, done: false, xp: 50, label: missionLabel('sessions3') },
        focus2h: { progress: 0, target: 120, done: false, xp: 100, label: missionLabel('focus2h') },
        noFail: { progress: 1, target: 1, done: false, xp: 150, label: missionLabel('noFail') },
      };
      setLS(LS_KEYS.missions, state);
    }
    return { today, state, missions: state[today] };
  }

  async function updateMissionsFromTasks(tasksToday) {
    const { today, state, missions } = getTodayMissionState();
    const sessions = tasksToday.filter(t => (t.duration || 0) > 0);
    const totalMin = Math.round(sessions.reduce((s, t) => s + (t.duration || 0), 0) / 60);
    missions.sessions3.progress = Math.min(missions.sessions3.target, sessions.length);
    missions.focus2h.progress = Math.min(missions.focus2h.target, totalMin);
    if (!missions.noFail.done && missions.noFail.progress <= 0) {
      missions.noFail.progress = 0;
    }
    const entries = Object.entries(missions);
    for (const [key, m] of entries) {
      const nowDone = m.progress >= m.target;
      if (nowDone && !m.done) {
        m.done = true;
        if (!S.missionRewarded.has(`${today}:${key}`)) {
          S.missionRewarded.add(`${today}:${key}`);
          await DB.addXP(m.xp);
          await refreshXPBar();
          zeusSpeak(`Mission completed: ${missionLabel(key)}. Olympus grants ${m.xp} XP.`, 'Triumphant', 'high');
        }
      }
    }
    state[today] = missions;
    setLS(LS_KEYS.missions, state);
    renderMissions();
  }

  function markMissionFailure() {
    const { today, state, missions } = getTodayMissionState();
    missions.noFail.progress = 0;
    missions.noFail.done = false;
    state[today] = missions;
    setLS(LS_KEYS.missions, state);
    renderMissions();
  }

  function renderMissions() {
    const { missions } = getTodayMissionState();
    const el = $('missionList');
    if (!el) return;
    el.innerHTML = Object.entries(missions).map(([key, m]) => {
      const pct = Math.round((m.progress / m.target) * 100);
      return `<div class="mission-row ${m.done ? 'done' : ''}">
        <div class="mission-label">${escH(missionLabel(key))}</div>
        <div class="mission-meta">${m.progress} / ${m.target} · ${m.xp} XP</div>
        <div class="xp-track"><div class="xp-fill" style="width:${Math.min(100, pct)}%"></div></div>
      </div>`;
    }).join('');
  }

  function getAchievements() {
    return getLS(LS_KEYS.achievements, {
      first_session: false,
      streak_7: false,
      focused_1000m: false,
    });
  }

  function saveAchievements(a) {
    setLS(LS_KEYS.achievements, a);
  }

  async function evaluateAchievements(allTasks, streakNow) {
    const a = getAchievements();
    const totalMin = Math.round(allTasks.reduce((s, t) => s + (t.duration || 0), 0) / 60);
    const completedSessions = allTasks.filter(t => (t.duration || 0) > 0).length;
    let unlocked = null;
    if (!a.first_session && completedSessions >= 1) {
      a.first_session = true;
      unlocked = achievementLabel('first_session');
    }
    if (!a.streak_7 && streakNow >= 7) {
      a.streak_7 = true;
      unlocked = achievementLabel('streak_7');
    }
    if (!a.focused_1000m && totalMin >= 1000) {
      a.focused_1000m = true;
      unlocked = achievementLabel('focused_1000m');
    }
    saveAchievements(a);
    renderAchievements();
    if (unlocked) zeusSpeak(`Achievement unlocked: ${unlocked}.`, 'Triumphant', 'high');
  }

  function renderAchievements() {
    const a = getAchievements();
    const el = $('achievementsList');
    if (!el) return;
    const rows = [
      { key: 'first_session', title: achievementLabel('first_session') },
      { key: 'streak_7', title: achievementLabel('streak_7') },
      { key: 'focused_1000m', title: achievementLabel('focused_1000m') },
    ];
    el.innerHTML = rows.map(r => `
      <div class="achievement-row ${a[r.key] ? 'unlocked' : ''}">
        <span>${a[r.key] ? '🏛️' : '◻'}</span>
        <span>${r.title}</span>
      </div>
    `).join('');
  }

  async function renderAdvancedStats() {
    const all = await DB.getAllCompletedTasks();
    const el = $('advancedStatsList');
    if (!el || !all.length) {
      if (el) el.innerHTML = `<div class="health-empty">${S.language === 'en' ? 'No data yet.' : 'Brak danych jeszcze.'}</div>`;
      return;
    }
    const byDay = {};
    const byHour = Array.from({ length: 24 }, () => 0);
    let longest = 0;
    let bestDay = { day: '-', sec: 0 };
    all.forEach(t => {
      const sec = t.duration || 0;
      longest = Math.max(longest, sec);
      const day = (t.start_time || '').slice(0, 10);
      byDay[day] = (byDay[day] || 0) + sec;
      const hour = new Date(t.start_time).getHours();
      byHour[hour] += sec;
    });
    Object.entries(byDay).forEach(([d, sec]) => {
      if (sec > bestDay.sec) bestDay = { day: d, sec };
    });
    const topHour = byHour.indexOf(Math.max(...byHour));
    el.innerHTML = `
      <div class="adv-row"><strong>${S.language === 'en' ? 'Best day' : 'Najmocniejszy dzień'}</strong><span>${bestDay.day} · ${fmtSec(bestDay.sec)}</span></div>
      <div class="adv-row"><strong>${S.language === 'en' ? 'Longest session' : 'Najdłuższa sesja'}</strong><span>${fmtSec(longest)}</span></div>
      <div class="adv-row"><strong>${S.language === 'en' ? 'Best hour' : 'Najlepsza godzina'}</strong><span>${String(topHour).padStart(2, '0')}:00</span></div>
    `;
  }

  function initExtendedSections() {
    const bindAddDayPlan = (btnId, inputId) => {
      const doAdd = () => {
        const input = $(inputId);
        if (!input) return;
        const text = input.value.trim();
        if (!text) {
          input.classList.add('input-error');
          const prev = input.placeholder;
          input.placeholder = 'Wpisz treść, aby dodać punkt planu...';
          setTimeout(() => { input.classList.remove('input-error'); input.placeholder = prev; }, 2000);
          input.focus();
          return;
        }
        const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
        const items = getLS(key, []);
        items.unshift({ text, ts: Date.now(), done: false });
        setLS(key, items);
        input.value = '';
        loadDayPlan();
      };
      $(btnId)?.addEventListener('click', doAdd);
      $(inputId)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    };
    bindAddDayPlan('btnAddDayPlan', 'dayPlanInput');
    bindAddDayPlan('btnAddDayPlanProfile', 'dayPlanInputProfile');
    const bindAddSleepNote = (btnId, inputId) => $(btnId)?.addEventListener('click', () => {
      const input = $(inputId);
      const text = input.value.trim();
      if (!text) return;
      const key = `${LS_KEYS.sleepNotes}:${DB.toDateStr()}`;
      const items = getLS(key, []);
      items.unshift({ text, ts: Date.now() });
      setLS(key, items);
      input.value = '';
      loadSleepNotes();
    });
    bindAddSleepNote('btnAddSleepNote', 'sleepNoteInput');
    bindAddSleepNote('btnAddSleepNoteProfile', 'sleepNoteInputProfile');
    $('btnSaveSocials')?.addEventListener('click', () => {
      const data = {
        twitter: $('socialTwitter').value.trim(),
        discord: $('socialDiscord').value.trim(),
      };
      setLS(LS_KEYS.socials, data);
      showToast(t('socialsSaved'), 'success');
      loadProfileView();
    });
    $('btnDisconnectWallet')?.addEventListener('click', () => disconnectWalletFlow());
    $('btnConnectWalletProfile')?.addEventListener('click', async () => {
      await connectMonadWallet(true);
      S.appMode = 'monad';
      await DB.setSetting('app_mode', 'monad');
      updateModeIndicator();
      refreshConnectionViews();
      applyProgressiveDisclosure();
      showToast(t('walletConnected'), 'success');
    });
    $('btnRestartOnboarding')?.addEventListener('click', () => restartOnboarding());
    $('btnResetData')?.addEventListener('click', () => openResetDataModal());
    $('btnResetDataCancel')?.addEventListener('click', () => closeResetDataModal());
    $('btnResetDataConfirm')?.addEventListener('click', () => advanceResetConfirmation());
    $('resetDataModal')?.addEventListener('click', e => {
      if (e.target === $('resetDataModal')) closeResetDataModal();
    });
    initProfileDashboardNav();
  }

  function initProfileDashboardNav() {
    const navBtns = document.querySelectorAll('[data-dashboard-section]');
    const panels = document.querySelectorAll('[data-dashboard-panel]');
    navBtns.forEach(btn => btn.addEventListener('click', () => {
      const section = btn.dataset.dashboardSection;
      navBtns.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.dataset.dashboardPanel === section));
    }));
  }

  const GUIDED_ENTRY_KEY = 'focusos_guided_entry_requested';

  function startOnboardingIfNeeded() {
    if (document.body.classList.contains('app-locked')) return;
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return;
    maybeShowWelcome();
  }

  function restartOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
    localStorage.setItem(GUIDED_ENTRY_KEY, 'true');
    S.guidedEntryStarted = false;
    maybeStartGuidedEntry();
  }

  async function maybeStartGuidedEntry() {
    if (S.guidedEntryStarted || document.body.classList.contains('app-locked')) return;
    S.guidedEntryStarted = true;
    const shouldGuide = localStorage.getItem(GUIDED_ENTRY_KEY) === 'true'
      || localStorage.getItem(TUTORIAL_COMPLETED_KEY) !== 'true'
      || localStorage.getItem(ONBOARDING_KEY) !== 'true';
    if (!shouldGuide) return;
    localStorage.removeItem(GUIDED_ENTRY_KEY);
    await maybeShowWelcome();
  }

  function closeWelcomeWizard() {
    $('welcomeModal')?.classList.remove('open');
  }

  function completeWelcomeWizard({ skipTutorial = false } = {}) {
    S.preferredExperience = S.welcomeGoalMode === 'pro' ? 'pro' : 'zen';
    setUxMode(S.preferredExperience, { persist: false });
    saveAppSettings({
      uxMode: S.uxMode,
      preferredExperience: S.preferredExperience,
    });
    const progress = normalizeUserProgress(getLS(USER_PROGRESS_KEY, getDefaultUserProgress()));
    setLS(USER_PROGRESS_KEY, {
      ...progress,
      preferredExperience: S.preferredExperience,
      uxMode: S.uxMode,
    });
    localStorage.setItem(ONBOARDING_KEY, 'true');
    if (skipTutorial) {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    } else {
      localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
    }
    closeWelcomeWizard();
    if (!skipTutorial) {
      setTimeout(startTutorial, 180);
    } else {
      showToast(S.language === 'en' ? 'You can restart the tutorial from Profile.' : 'Samouczek możesz uruchomić ponownie z Profilu.', 'info');
    }
  }

  function initWelcomeWizard() {
    setWelcomeGoalMode(S.preferredExperience || 'zen');
    document.querySelectorAll('[data-goal-mode]').forEach(card => {
      card.addEventListener('click', () => setWelcomeGoalMode(card.dataset.goalMode));
    });
    $('btnWelcomeEnter')?.addEventListener('click', () => completeWelcomeWizard({ skipTutorial: false }));
    $('btnWelcomeSkip')?.addEventListener('click', () => completeWelcomeWizard({ skipTutorial: true }));
  }

  function initUxModeControls() {
    $('btnZenMode')?.addEventListener('click', () => setUxMode('zen'));
    $('btnProMode')?.addEventListener('click', () => setUxMode('pro'));
    $('btnDetailedReport')?.addEventListener('click', openDetailedReport);
    $('btnBackupOpenSettings')?.addEventListener('click', () => switchTab('settings'));
  }

  function initZeusActions() {
    $('btnZeusFocus')?.addEventListener('click', async () => {
      switchTab('tracker');
      if (!$('taskName')?.value.trim()) $('taskName').value = 'High-value focus sprint';
      $('taskCategory').value = 'work';
      if ($('pomodoroFocusMin')) $('pomodoroFocusMin').value = '25';
      if ($('pomodoroBreakMin')) $('pomodoroBreakMin').value = '5';
      if (!S.activeTask) {
        $('btnPomodoroStart')?.click();
      } else {
        $('taskName')?.focus();
      }
      showToast('Zeus started a focus sprint.', 'success');
      zeusSpeak('A focused sprint begins with one clear target.', 'Approving');
    });
    $('btnZeusStreak')?.addEventListener('click', async () => {
      switchTab('tracker');
      if (!S.activeTask) {
        $('taskName').value = 'Streak protection session';
        $('taskCategory').value = 'planning';
        if ($('pomodoroFocusMin')) $('pomodoroFocusMin').value = '15';
        if ($('pomodoroBreakMin')) $('pomodoroBreakMin').value = '5';
        $('btnPomodoroStart')?.click();
        showToast('Short streak-saving session started.', 'success');
      } else {
        showToast('Current session is already protecting your streak.', 'info');
      }
      zeusSpeak('Protect the streak with one completed session before the day ends.', 'Observing');
    });
    $('btnZeusRecover')?.addEventListener('click', async () => {
      switchTab('sleep');
      if (S.activeTask && !S.hardcoreMode) {
        await handleStop();
      }
      S.pomodoro.phase = 'break';
      S.pomodoro.remainingSec = Math.max(300, S.pomodoro.breakMin * 60);
      S.pomodoro.running = false;
      updatePomodoroUI();
      showToast(t('recoveryBreakPrepared'), 'info');
      zeusSpeak('Recovery is part of discipline, not a break from it.', 'Tired');
    });
  }
  function loadProfileView() {
    const socials = getLS(LS_KEYS.socials, { twitter: '', discord: '' });
    if ($('socialTwitter')) $('socialTwitter').value = socials.twitter || '';
    if ($('socialDiscord')) $('socialDiscord').value = socials.discord || '';
    const preview = [];
    if (socials.twitter) preview.push(`Twitter: ${socials.twitter}`);
    if (socials.discord) preview.push(`Discord: ${socials.discord}`);
    if ($('socialsPreview')) $('socialsPreview').textContent = preview.length ? preview.join(' | ') : t('profileNoLinks');
    if ($('walletProfileInfo')) {
      $('walletProfileInfo').textContent = S.walletAddress
        ? t('walletStatusConnected', { address: S.walletAddress })
        : t('profileNoWallet');
    }
    refreshConnectionViews();
    updateDashboardCounters();
  }

  function updateDashboardCounters() {
    const dayPlan = getLS(`${LS_KEYS.dayPlan}:${DB.toDateStr()}`, []);
    const sleepNotes = getLS(`${LS_KEYS.sleepNotes}:${DB.toDateStr()}`, []);
    const socials = getLS(LS_KEYS.socials, { twitter: '', discord: '' });
    const socialsCount = Number(Boolean(socials.twitter)) + Number(Boolean(socials.discord));

    if ($('cntDayPlan')) $('cntDayPlan').textContent = String(dayPlan.length);
    if ($('cntSleepNotes')) $('cntSleepNotes').textContent = String(sleepNotes.length);
    if ($('cntSocials')) $('cntSocials').textContent = `${socialsCount}/2`;
    if ($('cntWallet')) $('cntWallet').textContent = S.walletAddress ? 'ON' : 'OFF';
  }

  function disconnectWalletFlow() {
    if (!S.walletAddress) {
      showToast(t('noActiveWallet'), 'warn');
      return;
    }
    if (!window.confirm('Krok 1/2: Czy na pewno chcesz rozpocząć rozłączanie portfela?')) return;
    if (!window.confirm('Krok 2/2: Potwierdź ostatecznie rozłączenie portfela.')) return;
    S.walletAddress = null;
    localStorage.removeItem(LS_KEYS.wallet);
    if (S.appMode === 'monad') {
      S.appMode = S.googleConnected ? 'google' : 'local';
      DB.setSetting('app_mode', S.appMode);
    }
    updateModeIndicator();
    refreshConnectionViews();
    loadProfileView();
    applyProgressiveDisclosure();
    showToast(t('walletDisconnected'), 'success');
  }

  function openResetDataModal() {
    S.resetConfirmStep = 0;
    $('resetDataModal')?.classList.add('open');
    updateResetModalUI();
  }

  function closeResetDataModal() {
    $('resetDataModal')?.classList.remove('open');
    S.resetConfirmStep = 0;
  }

  function updateResetModalUI() {
    const step = S.resetConfirmStep + 1;
    if ($('resetDataStepText')) $('resetDataStepText').textContent = `To usunie notatki, plan dnia, socials i zapisany portfel. Potwierdź krok ${step}/3.`;
    if ($('btnResetDataConfirm')) $('btnResetDataConfirm').textContent = `Potwierdź ${step}/3`;
  }

  function advanceResetConfirmation() {
    S.resetConfirmStep++;
    if (S.resetConfirmStep < 3) {
      updateResetModalUI();
      return;
    }
    Object.values(LS_KEYS).forEach(k => {
      Object.keys(localStorage).forEach(lsKey => {
        if (lsKey === k || lsKey.startsWith(`${k}:`)) localStorage.removeItem(lsKey);
      });
    });
    S.walletAddress = null;
    closeResetDataModal();
    loadDayPlan();
    loadSleepNotes();
    loadProfileView();
    updateModeIndicator();
    showToast('Dane użytkownika zostały zresetowane', 'success', 5000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH BUTTONS
  // ─────────────────────────────────────────────────────────────────────────

  function initHealthButtons() {
    // Meal log with caloric input (Phase 3)
    const btnLogMeal = $('btnLogMeal');
    if (btnLogMeal) {
      btnLogMeal.addEventListener('click', async () => {
        const mealType = $('mealType').value;
        const calories = parseInt($('mealCalories').value) || 0;
        const label    = $('mealType').options[$('mealType').selectedIndex].text;
        await DB.logHealth({ type:'meal', value:mealType, note:label, calories });
        $('mealCalories').value = '';
        showToast(`🍽️ ${label} zalogowany${calories ? ` — ${calories} kcal` : ''}`, 'success');
        if (S.currentView === 'health') await loadHealthView();
      });
    }

    $('btnQuickWater')?.addEventListener('click', async e => {
      const slotState = await DB.consumeWaterSlot();
      if (!slotState.ok) {
        showToast(S.language === 'en' ? 'Water limit reached for today.' : 'Dzisiejszy limit wody jest już wykorzystany.', 'warn');
        triggerPanelFlash('.panel--water');
        return;
      }
      await DB.logHealth({ type: 'water', value: 1, unit: 'glass', note: '250ml' });
      await DB.addXP(20);
      S.lastWaterLog = new Date();
      spawnWaterParticle(e.clientX, e.clientY);
      triggerPanelFlash('.panel--water');
      if (S.currentView === 'health') await loadHealthView();
      await loadQuickStats();
      showToast(S.language === 'en' ? 'Water logged (+250ml).' : 'Woda zapisana (+250 ml).', 'success');
    });

    $('btnQuickMeal')?.addEventListener('click', async () => {
      const hour = new Date().getHours();
      const label = S.language === 'en'
        ? (hour < 11 ? 'Quick breakfast' : hour < 17 ? 'Quick meal' : 'Quick dinner')
        : (hour < 11 ? 'Szybkie śniadanie' : hour < 17 ? 'Szybki posiłek' : 'Lekka kolacja');
      await DB.logHealth({ type: 'meal', value: 'quick', note: label, calories: 0 });
      if (S.currentView === 'health') await loadHealthView();
      await loadQuickStats();
      showToast(S.language === 'en' ? 'Meal logged.' : 'Posiłek zapisany.', 'success');
    });

    $('btnQuickMove')?.addEventListener('click', async () => {
      await DB.logHealth({ type: 'movement', value: 5, unit: 'min', note: S.language === 'en' ? 'Quick reset' : 'Krótki reset' });
      if (S.currentView === 'health') await loadHealthView();
      await loadQuickStats();
      showToast(S.language === 'en' ? 'Movement logged (+5 min).' : 'Ruch zapisany (+5 min).', 'success');
    });

    // Movement quick-log
    document.querySelectorAll('[data-move]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const min = parseInt(btn.dataset.move);
        await DB.logHealth({ type:'movement', value:min, unit:'min', note:btn.textContent.trim() });
        showToast(`🏃 ${min} min ruchu zalogowane`, 'success');
        if (S.currentView === 'health') await loadHealthView();
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DATE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  function initDateNav() {
    $('dailyPrev').addEventListener('click', () => {
      S.dailyDate = DB.toDateStr(new Date(new Date(S.dailyDate).getTime() - 86400000));
      loadDailyView();
    });
    $('dailyNext').addEventListener('click', () => {
      const next = new Date(new Date(S.dailyDate).getTime() + 86400000);
      if (next <= new Date()) { S.dailyDate = DB.toDateStr(next); loadDailyView(); }
    });
    $('dailyToday').addEventListener('click', () => { S.dailyDate = DB.toDateStr(); loadDailyView(); });

    $('weekPrev').addEventListener('click', () => {
      S.weekStart = DB.toDateStr(new Date(new Date(S.weekStart).getTime() - 7 * 86400000));
      loadWeeklyView();
    });
    $('weekNext').addEventListener('click', () => {
      const next = new Date(new Date(S.weekStart).getTime() + 7 * 86400000);
      if (next <= new Date()) { S.weekStart = DB.toDateStr(next); loadWeeklyView(); }
    });
    $('weekCurrent').addEventListener('click', () => { S.weekStart = getMonday(new Date()); loadWeeklyView(); });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT / IMPORT (Phase 5)
  // ─────────────────────────────────────────────────────────────────────────

  function getExtendedLocalDataSnapshot() {
    const dayPlan = {};
    const sleepNotes = {};
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`${LS_KEYS.dayPlan}:`)) dayPlan[k] = getLS(k, []);
      if (k.startsWith(`${LS_KEYS.sleepNotes}:`)) sleepNotes[k] = getLS(k, []);
    });
    return {
      dayPlan,
      sleepNotes,
      socials: getLS(LS_KEYS.socials, { twitter: '', discord: '' }),
      walletAddress: localStorage.getItem(LS_KEYS.wallet) || null,
    };
  }

  function applyExtendedLocalData(payload) {
    if (!payload || typeof payload !== 'object') return;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`${LS_KEYS.dayPlan}:`) || k.startsWith(`${LS_KEYS.sleepNotes}:`)) localStorage.removeItem(k);
    });
    Object.entries(payload.dayPlan || {}).forEach(([k, v]) => setLS(k, v));
    Object.entries(payload.sleepNotes || {}).forEach(([k, v]) => setLS(k, v));
    setLS(LS_KEYS.socials, payload.socials || { twitter: '', discord: '' });
    if (payload.walletAddress) localStorage.setItem(LS_KEYS.wallet, payload.walletAddress);
    else localStorage.removeItem(LS_KEYS.wallet);
  }

  async function handleExport() {
    try {
      const csv  = await DB.exportCSV();
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `focusos_${DB.toDateStr()}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast('📥 CSV wyeksportowany!', 'success');
    } catch { showToast('❌ Błąd eksportu CSV', 'error'); }
  }

  async function handleExportJSON() {
    try {
      const dbPayload = JSON.parse(await DB.exportJSON());
      dbPayload.extended_local = getExtendedLocalDataSnapshot();
      dbPayload.version = Math.max(Number(dbPayload.version || 0), 3);
      const blob = new Blob([JSON.stringify(dbPayload, null, 2)], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `focusos_backup_${DB.toDateStr()}.json`; a.click();
      URL.revokeObjectURL(url);
      showToast('📦 Backup JSON (z planem, notesami i profilem) gotowy.', 'success', 5000);
    } catch (e) { showToast('❌ Błąd eksportu JSON: ' + e.message, 'error'); }
  }

  async function handleImportJSON(file) {
    try {
      const text  = await file.text();
      const parsed = JSON.parse(text);
      const backupVersion = Number(parsed?.version || 0);
      const count = await DB.importJSON(text);
      if (parsed?.extended_local && typeof parsed.extended_local === 'object') {
        applyExtendedLocalData(parsed.extended_local);
      } else {
        showToast(
          backupVersion > 0
            ? `⚠ Backup v${backupVersion} nie zawiera sekcji extended_local — przywrócono tylko dane DB.`
            : '⚠ Backup nie zawiera metadanych wersji/extended_local — przywrócono tylko dane DB.',
          'warn',
          7000
        );
      }
      showToast(`✅ Zaimportowano ${count} zadań. Odświeżam...`, 'success', 5000);
      setTimeout(() => location.reload(), 1500);
    } catch (e) { showToast('❌ Import nieudany: ' + e.message, 'error'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL BEHAVIORS — backdrop click & Escape
  // ─────────────────────────────────────────────────────────────────────────

  function initQuickStartNav() {
    const checklist = $('quickStartChecklist');
    if (!checklist) return;

    // Dismiss (×) button
    $('btnDismissChecklist')?.addEventListener('click', e => {
      e.stopPropagation();
      checklist.style.transition = 'opacity 0.4s ease';
      checklist.style.opacity = '0';
      checklist.style.pointerEvents = 'none';
      setTimeout(() => { checklist.style.display = 'none'; }, 420);
    });

    // Click on list item → navigate to relevant element
    checklist.querySelectorAll('[data-nav]').forEach(item => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        let target = null;
        if (nav === 'task')  target = $('taskName');
        if (nav === 'start') target = $('btnStart');
        if (nav === 'stop')  target = $('btnStop');
        if (!target) return;
        if (typeof switchTab === 'function') switchTab('tracker');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.focus({ preventScroll: true });
          target.classList.add('qs-highlight');
          setTimeout(() => target.classList.remove('qs-highlight'), 1400);
        }, 120);
      });
    });
  }

  function initModalBehaviors() {
    ['toxicModal', 'welcomeModal', 'resetDataModal', 'backfillModal', 'notifModal', 'levelRewardModal'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
    });
    const oo = $('onboardingOverlay');
    if (oo) oo.addEventListener('click', e => { if (e.target === oo) oo.style.display = 'none'; });
    const df = $('deepFocusOverlay');
    if (df) df.addEventListener('click', e => { if (e.target === df) setDeepWorkMode(false); });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────────────────

  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.open');
        if (openModal) { openModal.classList.remove('open'); return; }
        if ($('appSidebar')?.classList.contains('open')) {
          $('appSidebar').classList.remove('open');
          $('appSidebar').setAttribute('aria-hidden', 'true');
          $('sidebarBackdrop')?.classList.remove('visible');
          document.body.style.overflow = '';
          return;
        }
        if ($('tutorialOverlay')?.style.display === 'block') {
          $('tutorialOverlay').style.display = 'none';
          localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
          return;
        }
        if ($('onboardingOverlay')?.style.display && $('onboardingOverlay').style.display !== 'none') {
          $('onboardingOverlay').style.display = 'none';
          return;
        }
        if (document.body.classList.contains('deep-work')) { setDeepWorkMode(false); return; }
        if (!$('btnStop')?.disabled) handleStop();
        return;
      }
      if (e.key === 'Enter' && !$('btnStart').disabled) handleStart();
      if (e.key === '1') switchTab('tracker');
      if (e.key === '2') switchTab('daily');
      if (e.key === '3') switchTab('weekly');
      if (e.key === '4') switchTab('health');
      if (e.key === '5') switchTab('sleep');
      if (e.key === '6') switchTab('settings');
      if (e.key === '7') switchTab('about');
      if (e.key === '8') switchTab('profile');
    });
    $('taskName').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleStart();
    });
  }

  function initFocusFlow() {
    $('taskName')?.addEventListener('input', updateFocusFlowState);
    $('taskCategory')?.addEventListener('change', updateFocusFlowState);
    updateFocusFlowState();
    updateDeepFocusUI();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────

  async function init() {
    installLocalSaveHooks();
    await registerServiceWorker();
    await recoverHardcoreFailureIfNeeded();
    await initHardcoreMode();
    await initLevelProgression();
    await syncUserProgress();
    S.zeusStyle = getLS(LS_KEYS.zeusStyle, 'balanced');
    S.walletAddress = localStorage.getItem(LS_KEYS.wallet) || null;
    S.fcsBalance = Number(localStorage.getItem(LS_KEYS.fcsBalance)) || 0;
    S.stakedFCS = Number(localStorage.getItem(LS_KEYS.stakedFCS)) || 0;
    S.googleConnected = localStorage.getItem(LS_KEYS.google) === '1';
    await initModeSplash();
    initMatrixRain();
    startClock();
    initTabs();
    initResponsiveHeader();
    initDateNav();
    initKeyboard();
    initFocusFlow();
    initBackfillModal();
    await initNotifications();
    initHealthButtons();
    initExtendedSections();
    initSleepView();
    initSettingsView();
    initWelcomeWizard();
    initUxModeControls();
    initRoutines();
    initDeepWorkMode();
    initZeusActions();
    initZeusChat();
    renderMissions();
    renderAchievements();
    await renderAdvancedStats();
    await initPomodoro();
    await initDailyGoal();
    initHistoryFilters();
    initAlarmClock();
    initAmbientControls();
    initCommandPalette();
    initInspectToggles();
    initPwaInstall();
    initGoogleBackup();
    initModalBehaviors();
    initQuickStartNav();
    $('levelRewardModal')?.addEventListener('click', e => {
      if (e.target === $('levelRewardModal')) $('levelRewardModal').classList.remove('open');
    });

    $('btnStart').addEventListener('click', handleStart);
    $('btnStop').addEventListener('click', handleStop);
    $('btnExport').addEventListener('click', handleExport);
    $('btnExportJSON').addEventListener('click', handleExportJSON);
    $('btnImportJSON').addEventListener('click', () => $('importFileInput').click());
    $('importFileInput').addEventListener('change', e => {
      if (e.target.files[0]) handleImportJSON(e.target.files[0]);
    });
    $('btnRefresh').addEventListener('click', async () => {
      await loadTrackerView();
      showToast('↻ Odświeżono', 'info');
    });
    $('btnRefreshLog') && $('btnRefreshLog').addEventListener('click', async () => {
      await loadRecentLog(); await loadQuickStats();
    });

    // Idle tracking: reset lastActivity on any user interaction
    ['click','keydown','touchstart'].forEach(ev =>
      document.addEventListener(ev, () => { S.lastActivity = Date.now(); }, { passive:true })
    );

    // Global button micro-tap ripple + haptic
    document.addEventListener('pointerdown', e => {
      const btn = e.target.closest('button:not(:disabled)');
      if (!btn) return;
      btn.classList.remove('btn--tap');
      void btn.offsetWidth;
      btn.classList.add('btn--tap');
      setTimeout(() => btn.classList.remove('btn--tap'), 230);
      navigator.vibrate?.(8);
    }, { passive: true });

    // Toxic Productivity modal wiring (Phase 4)
    $('btnToxicSnooze').addEventListener('click', () => {
      S.toxicSnoozedUntil = Date.now() + 3600000;
      $('toxicModal').classList.remove('open');
      showToast('😅 Przypomnę za 1h. Zaplanuj przerwę!', 'warn');
    });
    $('btnToxicBreak').addEventListener('click', async () => {
      $('toxicModal').classList.remove('open');
      S.toxicSnoozedUntil = Date.now() + 6 * 3600000;
      if (S.activeTask) await handleStop();
      $('taskName').value = 'Przerwa regeneracyjna';
      $('taskCategory').value = 'break';
      await handleStart();
    });

    await loadTrackerView();
    loadDayPlan();
    loadSleepNotes();
    const latestSleep = await DB.getSleepLogs(1);
    if (latestSleep?.length) {
      const s = latestSleep[0];
      const hours = (s.durationMin || 0) / 60;
      if (hours > 0 && hours < 6) {
        zeusSpeak(`Last sleep: ${hours.toFixed(1)}h. Low recovery weakens focus.`, 'Warning');
      }
    }
    loadProfileView();
    refreshConnectionViews();
    updateModeIndicator();
    applyProgressiveDisclosure();
    setSaveStatus('saved');
    if (!document.body.classList.contains('app-locked')) {
      await maybeStartGuidedEntry();
    }

    setInterval(async () => {
      if (S.currentView === 'tracker') await loadQuickStats();
    }, 30000);

    // Navigate to view specified in URL hash (e.g. index.html#settings)
    const _hashView = location.hash.slice(1);
    const _validTabs = ['tracker','daily','weekly','health','sleep','settings','about','profile'];
    if (_validTabs.includes(_hashView)) switchTab(_hashView);

  }

  function disconnectGoogleFlow() {
    if (!S.googleConnected) {
      showToast(t('googleNotConnected'), 'warn');
      return;
    }
    setGoogleConnectionState(false, null);
    if (S.appMode === 'google') {
      S.appMode = S.walletAddress ? 'monad' : 'local';
      DB.setSetting('app_mode', S.appMode);
    }
    showToast(t('googleDisconnected'), 'success');
  }

  return { init, _loadSleepHistory: loadSleepHistory };

})();

// Ensure bootstrap can resolve App after directory/rewrite changes.
if (typeof globalThis !== 'undefined' && typeof globalThis.App?.init !== 'function') {
  globalThis.App = App;
}

function installRuntimeGuards() {
  if (window.__focusosRuntimeGuardsInstalled) return;
  window.__focusosRuntimeGuardsInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const message = String(reason?.message || reason || '');
    if (message.includes('Data provided to an operation does not meet requirements') || message.includes('DataError')) {
      console.warn('[FocusOS:runtime] intercepted IndexedDB DataError', reason);
      event.preventDefault();
      return;
    }
    if (message.includes('WeakMap key undefined')) {
      console.warn('[FocusOS:runtime] intercepted SES WeakMap guard error', reason);
      event.preventDefault();
      return;
    }
  });

  window.addEventListener('error', (event) => {
    const message = String(event?.message || '');
    if (message.includes("can't access property \"catch\"") || message.includes('WeakMap key undefined')) {
      console.warn('[FocusOS:runtime] intercepted global error', message);
      event.preventDefault();
      return;
    }
  }, true);
}

// Install as early as possible (before DOMContentLoaded) to catch extension noise.
installRuntimeGuards();

document.addEventListener('DOMContentLoaded', () => {
  try {
    const appApi = globalThis.App || App;
    if (typeof appApi?.init !== 'function') {
      throw new Error('App.init is not available (bootstrap aborted)');
    }
    const initResult = appApi.init();
    if (!initResult || typeof initResult.then !== 'function') {
      console.error('[FocusOS:init] App.init did not return a Promise/thenable', initResult);
      return;
    }
    (async () => {
      try {
        await initResult;
      } catch (err) {
        console.error('[FocusOS:init] async bootstrap failed', err);
      }
    })();
  } catch (err) {
    console.error('[FocusOS:init] bootstrap crashed before promise creation', err);
  }
});
