/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FocusOS 2.0 — app.js
   Main UI controller. Orchestrates DB ↔ MATH ↔ DOM.
   Phase 1-5: Onboarding, XP, Level Locks, Sleep, Idle/Toxic alerts,
              Water cap, Calories, JSON export/import, Leaderboard.
   ═══════════════════════════════════════════════════════════════════════════ */

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
  };
  const LS_KEYS = {
    sleepNotes: 'focusos_sleep_notes',
    dayPlan: 'focusos_day_plan',
    socials: 'focusos_socials',
    wallet: 'focusos_wallet_address',
    google: 'focusos_google_connected',
    routines: 'focusos_routines',
    streakMeta: 'focusos_streak_meta',
    missions: 'focusos_daily_missions',
    achievements: 'focusos_achievements',
    zeusStyle: 'focusos_zeus_style',
  };
  const ONBOARDING_KEY = 'hasCompletedOnboarding';
  const TUTORIAL_COMPLETED_KEY = 'tutorialCompleted';
  const APP_SETTINGS_KEY = 'focusos_app_settings';
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
  const THEME_IDS = ['olympus', 'marble', 'ember', 'tide'];
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
    if ($('hardcoreModeToggle')) $('hardcoreModeToggle').disabled = !has('hardcore_mode');
    if ($('zeusStyleSelect')) $('zeusStyleSelect').disabled = !has('zeus_style');
    document.querySelector('.panel--achievements')?.classList.toggle('hidden', !has('achievements'));
    if ($('btnDeepWorkMode')) $('btnDeepWorkMode').disabled = false;
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
    const locked = S.userLevel < 3;
    document.querySelectorAll('.panel--markov, .panel--bayes').forEach(panel => {
      let overlay = panel.querySelector('.level-lock-overlay');
      if (locked) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'level-lock-overlay';
          overlay.innerHTML = `
            <div class="lock-icon">🔒</div>
            <div class="lock-title">Zaawansowana Analityka</div>
            <div class="lock-sub">Osiągnij <strong>Poziom 3</strong> (5 000 XP)<br>aby odblokować Bayesian &amp; Markov.</div>
            <div class="lock-progress">
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent4)">${S.totalXP.toLocaleString()} / 5 000 XP</div>
              <div class="lock-progress-track"><div class="lock-progress-fill" style="width:${Math.min(100,Math.round(S.totalXP/5000*100))}%"></div></div>
            </div>`;
          panel.appendChild(overlay);
        }
      } else {
        if (overlay) overlay.remove();
      }
    });
  }

  // ── Welcome Modal (Phase 1) ───────────────────────────────────────────────

  async function maybeShowWelcome() {
    const seen = await DB.getSetting('onboarding_done');
    if (!seen) await DB.setSetting('onboarding_done', true);
  }

  // ── Tutorial (Phase 1) ────────────────────────────────────────────────────

  const TUTORIAL_STEPS = [
    {
      targetSelector: '[data-tab="tracker"]',
      arrow: 'down',
      text: '👋 Witaj w FocusOS. To pełny przewodnik po wszystkich kluczowych opcjach aplikacji.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'taskName',
      arrow: 'down',
      text: '✍️ Tu wpisujesz nazwę aktualnego zadania. Im bardziej konkretna nazwa, tym lepsze analizy.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'taskCategory',
      arrow: 'down',
      text: '🏷️ Wybierz kategorię pracy. Kategorie wpływają na statystyki produktywności, EMA i wnioski.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'btnStart',
      arrow: 'down',
      text: '▶️ START rozpoczyna sesję i timer. STOP zapisuje czas i nalicza XP dla produktywnych kategorii.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'zeusCard',
      arrow: 'up',
      text: '⚡ Zeus jest Twoim przewodnikiem po prawej stronie. Tłumaczy, motywuje i podpowiada następny sensowny ruch.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'btnZeusFocus',
      arrow: 'up',
      text: '🧠 Przyciski Zeusa uruchamiają szybki sprint, ratowanie streaka albo blok regeneracji bez ręcznego klikania po całej aplikacji.',
      before: () => switchTab('tracker'),
    },
    {
      targetId: 'xpBarWrap',
      arrow: 'down',
      text: '🎮 Pasek XP pokazuje progres poziomu. Wyższe poziomy odblokowują zaawansowaną analitykę.',
      before: () => switchTab('tracker'),
    },
    {
      targetSelector: '[data-tab="daily"]',
      arrow: 'down',
      text: '📅 Zakładka Dzienny: analiza jednego dnia, wykresy kategorii i rozkład godzinowy.',
      before: () => switchTab('daily'),
    },
    {
      targetId: 'dailyCatChart',
      arrow: 'up',
      text: '🧩 Ten wykres pokazuje, gdzie realnie znika Twój czas w ciągu dnia.',
      before: () => switchTab('daily'),
    },
    {
      targetSelector: '[data-tab="weekly"]',
      arrow: 'down',
      text: '📊 Zakładka Tygodniowy: trendy 7-dniowe, EMA i sekwencje aktywności.',
      before: () => switchTab('weekly'),
    },
    {
      targetId: 'emaChart',
      arrow: 'up',
      text: '📈 EMA wygładza wahania i pokazuje realny kierunek Twojej produktywności.',
      before: () => switchTab('weekly'),
    },
    {
      targetSelector: '[data-tab="health"]',
      arrow: 'down',
      text: '🩺 Zakładka Zdrowie: nawodnienie, ruch i posiłki, które wspierają jakość pracy.',
      before: () => switchTab('health'),
    },
    {
      targetId: 'waterGlasses',
      arrow: 'up',
      text: '💧 Klikaj szklanki, aby logować wodę i budować nawyk regularnego nawodnienia.',
      before: () => switchTab('health'),
    },
    {
      targetSelector: '[data-tab="sleep"]',
      arrow: 'down',
      text: '🌙 Zakładka Sen: kalkulator cykli, log snu, notatki oraz lokalny budzik.',
      before: () => switchTab('sleep'),
    },
    {
      targetId: 'btnCalcSleep',
      arrow: 'up',
      text: '🛌 Kalkulator snu wylicza najlepsze godziny zaśnięcia na bazie cykli 90 minut + 15 min zasypiania.',
      before: () => switchTab('sleep'),
    },
    {
      targetId: 'btnSetAlarm',
      arrow: 'up',
      text: '⏰ Budzik działa lokalnie: sprawdza czas i uruchamia sygnał + alert bez backendu.',
      before: () => switchTab('sleep'),
    },
    {
      targetSelector: '[data-tab="settings"]',
      arrow: 'down',
      text: '⚙️ Ustawienia: personalizacja aplikacji, instalacja PWA i kopie zapasowe.',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'languageSelect',
      arrow: 'up',
      text: '🌐 Tu zmienisz język interfejsu (PL/EN). Ustawienie zapisuje się lokalnie.',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'themeSelect',
      arrow: 'up',
      text: '🎨 Tutaj zmienisz styl aplikacji: Hologram Olimpu, Marmurowy poranek, Solarny bursztyn albo Lazurowy przypływ.',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'installButton',
      arrow: 'up',
      text: '📲 Ten przycisk pokazuje instalację systemową PWA, gdy przeglądarka zgłosi beforeinstallprompt.',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'btnExportJSON',
      arrow: 'up',
      text: '💾 Eksport/Import JSON służy do lokalnego backupu i odtworzenia danych na innym urządzeniu.',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'btnGoogleBackup',
      arrow: 'up',
      text: '☁️ Backup Google wysyła plik FocusOS_Backup.json na Twój Google Drive (po OAuth).',
      before: () => switchTab('settings'),
    },
    {
      targetId: 'skillTreeGrid',
      arrow: 'up',
      text: '🌳 Drzewko umiejętności daje stałe bonusy do streaka, XP, głębokiego skupienia i trybu hardcore. To Twój progres systemowy.',
      before: () => switchTab('settings'),
    },
    {
      targetSelector: '[data-tab="about"]',
      arrow: 'down',
      text: 'ℹ️ Zakładka O nas opisuje filozofię Local-First i kanały społecznościowe FocusOS.',
      before: () => switchTab('about'),
    },
    {
      targetSelector: '[data-tab="profile"]',
      arrow: 'down',
      text: '👤 Profil to panel pomocniczy: plan dnia, notatki snu, sociale i zarządzanie portfelem.',
      before: () => switchTab('profile'),
    },
    {
      targetId: 'btnRestartOnboarding',
      arrow: 'up',
      text: '🔁 W każdej chwili możesz uruchomić ten przewodnik ponownie z profilu, jeśli chcesz wrócić do funkcji krok po kroku.',
      before: () => switchTab('profile'),
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
      if (localStorage.getItem(ONBOARDING_KEY) !== 'true') {
        setTimeout(startOnboardingIfNeeded, 280);
      }
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

    const glyphs = '01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 14;
    let cols = 0;
    let drops = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -80));
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(4, 7, 4, 0.075)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono')}`;
      ctx.fillStyle = 'rgba(57, 255, 20, 0.55)';

      for (let i = 0; i < drops.length; i++) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(char, x, y);
        if (y > canvas.height && Math.random() > 0.985) drops[i] = 0;
        drops[i] += 0.23; // slow vertical movement
      }

      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  function initTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        const headerInner = document.querySelector('.header-inner');
        if (window.innerWidth <= 980 && headerInner) {
          headerInner.classList.remove('nav-open');
          $('btnNavToggle')?.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function initResponsiveHeader() {
    const toggleBtn = $('btnNavToggle');
    const headerInner = document.querySelector('.header-inner');
    if (!toggleBtn || !headerInner) return;
    toggleBtn.addEventListener('click', () => {
      const isOpen = headerInner.classList.toggle('nav-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) {
        headerInner.classList.remove('nav-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function switchTab(view) {
    S.currentView = view;
    document.querySelectorAll('[data-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === view)
    );
    document.querySelectorAll('[data-view]').forEach(v =>
      v.classList.toggle('hidden', v.dataset.view !== view)
    );
    if (view === 'daily')   loadDailyView();
    if (view === 'weekly')  loadWeeklyView();
    if (view === 'health')  loadHealthView();
    if (view === 'tracker') loadTrackerView();
    if (view === 'sleep')   { initSleepView(); loadSleepHistory(); loadSleepNotes(); }
    if (view === 'settings') loadSettingsView();
    if (view === 'profile') loadProfileView();
  }

  function getLS(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }
  function setLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getZeusVisualState(mood = 'Observing', intensity = 'normal', message = '') {
    const moodKey = String(mood || '').toLowerCase();
    const text = String(message || '').toLowerCase();
    if (intensity === 'high' || /wrath|demanding|triumphant|fired up/.test(moodKey)) return 'wrath';
    if (/disappointed|judging|warning/.test(moodKey) || /failure|skipped|penalty/.test(text)) return 'disappointed';
    if (/approving|proud|success/.test(moodKey)) return 'proud';
    if (/tired|sleep|recovery/.test(moodKey) || /recover/.test(text)) return 'tired';
    return 'neutral';
  }

  function applyZeusVisualState(state) {
    const card = $('zeusCard');
    if (!card) return;
    card.dataset.zeusState = state;
    const states = {
      neutral: { browLeft: 'M150 188 Q183 177 216 184', browRight: 'M296 184 Q329 177 362 188', mouth: 'M228 330 Q256 338 284 330', eyeOpacity: 0.52, eyeCy: 235, eyeRy: 12, sparkCy: 232 },
      proud: { browLeft: 'M150 186 Q183 176 216 182', browRight: 'M296 182 Q329 176 362 186', mouth: 'M226 326 Q256 347 286 326', eyeOpacity: 0.9, eyeCy: 235, eyeRy: 12, sparkCy: 232 },
      disappointed: { browLeft: 'M150 190 Q183 184 216 192', browRight: 'M296 192 Q329 184 362 190', mouth: 'M226 338 Q256 325 286 338', eyeOpacity: 0.28, eyeCy: 236, eyeRy: 11, sparkCy: 234 },
      wrath: { browLeft: 'M150 199 Q183 168 216 174', browRight: 'M296 174 Q329 168 362 199', mouth: 'M220 335 Q256 346 292 335', eyeOpacity: 1, eyeCy: 235, eyeRy: 12, sparkCy: 232 },
      tired: { browLeft: 'M150 190 Q183 186 216 190', browRight: 'M296 190 Q329 186 362 190', mouth: 'M228 333 Q256 331 284 333', eyeOpacity: 0.34, eyeCy: 241, eyeRy: 10, sparkCy: 237 },
    };
    const cfg = states[state] || states.neutral;
    $('zeusBrowLeft')?.setAttribute('d', cfg.browLeft);
    $('zeusBrowRight')?.setAttribute('d', cfg.browRight);
    $('zeusMouth')?.setAttribute('d', cfg.mouth);
    [['zeusEyeLeftBg', 40], ['zeusEyeRightBg', 40]].forEach(([id, rx]) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.eyeCy));
      el.setAttribute('ry', String(cfg.eyeRy + 8));
      el.setAttribute('rx', String(rx));
    });
    ['zeusEyeLeft', 'zeusEyeRight'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.eyeCy));
      el.setAttribute('ry', String(cfg.eyeRy));
      el.setAttribute('fill', `rgba(82,220,255,${cfg.eyeOpacity})`);
    });
    ['zeusEyeLeftSpark', 'zeusEyeRightSpark'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('cy', String(cfg.sparkCy));
      el.setAttribute('opacity', String(Math.min(1, cfg.eyeOpacity + 0.15)));
    });
  }

  function zeusSpeak(message, mood = 'Observing', intensity = 'normal') {
    const negativeMoods = new Set(['Warning', 'Judging', 'Disappointed']);
    const context = negativeMoods.has(mood) ? 'negative' : 'positive';
    message = adaptZeusMessage(message, context);
    const msgEl = $('zeusMessage');
    const moodEl = $('zeusMood');
    const card = $('zeusCard');
    if (!msgEl || !moodEl || !card) return;
    msgEl.textContent = message;
    msgEl.dataset.dynamic = '1';
    moodEl.textContent = localizeZeusMood(mood);
    applyZeusVisualState(getZeusVisualState(mood, intensity, message));
    card.classList.remove('zeus-anim');
    void card.offsetWidth;
    card.classList.add('zeus-anim');
    if (intensity === 'high') {
      const flash = $('zeusLightning');
      flash?.classList.remove('active');
      void flash?.offsetWidth;
      flash?.classList.add('active');
    }
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
  }

  function openModeSplash(message = t('splashSub')) {
    document.body.classList.add('app-locked');
    $('modeSplash')?.classList.remove('hidden');
    if ($('modeSplashStatus')) $('modeSplashStatus').textContent = message;
    if ($('tutorialOverlay')) $('tutorialOverlay').style.display = 'none';
    if ($('onboardingOverlay')) $('onboardingOverlay').style.display = 'none';
    $('welcomeModal')?.classList.remove('open');
    $('headerTabNav')?.classList.remove('open');
    $('btnNavToggle')?.setAttribute('aria-expanded', 'false');
  }

  function applyTheme(themeName) {
    const resolvedTheme = resolveThemeId(themeName);
    S.theme = resolvedTheme;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
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
      web3Panel: 'Panel Web3',
      web3Wallet: 'Portfel',
      web3Network: 'Sieć',
      web3Staked: 'Stakowane',
      web3Stake: 'Stakuj tokeny',
      web3Burn: 'Spal tokeny',
      web3Save: 'Zapisz postęp on-chain',
      trackerPanel: 'Aktywna sesja',
      trackerHeroTitle: 'Buduj prawdziwe tempo skupienia, jedna porządna sesja na raz.',
      trackerHeroSub: 'Śledź pracę, chroń streak i utrzymuj cały system czytelny na każdym ekranie.',
      quickStartTitle: 'Szybki start',
      quickStart1: 'Dodaj zadanie',
      quickStart2: 'Uruchom sesję',
      quickStart3: 'Zamknij pierwszą sesję',
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
      soundOn: 'Dźwięk włączony',
      soundOff: 'Dźwięk wyłączony',
      taskPlaceholder: 'Nad czym teraz pracujesz?',
      fatigueHint: 'Zmęczenie rośnie',
      refreshData: 'Odśwież dane',
      zeusPanel: 'Hologram Zeusa',
      zeusTagline: 'Mentor skupienia',
      zeusDefaultMessage: 'Jestem po Twojej prawej stronie. Prowadzę, tłumaczę i pilnuję rytmu pracy.',
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
      statBenchmark: 'Ty vs średnia',
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
      welcomeSubline: 'Lokalna inteligencja produktywności',
      welcomeEnter: 'Wejdź do aplikacji',
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
        olympus: 'Hologram Olimpu',
        marble: 'Marmurowy poranek',
        ember: 'Solarny bursztyn',
        tide: 'Lazurowy przypływ',
      },
      zeusVoices: {
        strict: 'Dowódca',
        balanced: 'Mentor',
        supportive: 'Iskra',
      },
      tabs: {
        tracker: 'Tracker',
        daily: 'Dzień',
        weekly: 'Tydzień',
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
      web3Panel: 'Web3 dashboard',
      web3Wallet: 'Wallet',
      web3Network: 'Network',
      web3Staked: 'Staked',
      web3Stake: 'Stake tokens',
      web3Burn: 'Burn tokens',
      web3Save: 'Save progress on-chain',
      trackerPanel: 'Active session',
      trackerHeroTitle: 'Build real focus momentum, one clean session at a time.',
      trackerHeroSub: 'Track work, protect your streak, and keep the whole system readable on every screen.',
      quickStartTitle: 'Quick start',
      quickStart1: 'Add a task',
      quickStart2: 'Start a session',
      quickStart3: 'Finish your first session',
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
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      taskPlaceholder: 'What are you working on?',
      fatigueHint: 'Fatigue is rising',
      refreshData: 'Refresh data',
      zeusPanel: 'Zeus hologram',
      zeusTagline: 'Focus sidekick',
      zeusDefaultMessage: 'I stay on your right side to guide, explain, and keep your rhythm steady.',
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
      statBenchmark: 'You vs average',
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
      welcomeSubline: 'Local-first productivity intelligence',
      welcomeEnter: 'Enter the app',
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
        olympus: 'Olympus hologram',
        marble: 'Marble morning',
        ember: 'Solar ember',
        tide: 'Azure tide',
      },
      zeusVoices: {
        strict: 'Commander',
        balanced: 'Mentor',
        supportive: 'Spark',
      },
      tabs: {
        tracker: 'Tracker',
        daily: 'Daily',
        weekly: 'Weekly',
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
    setText('.panel--web3 .panel-label', t('web3Panel'));
    setText('.web3-grid > div:nth-child(1) .web3-k', t('web3Wallet'));
    setText('.web3-grid > div:nth-child(2) .web3-k', t('web3Network'));
    setText('.web3-grid > div:nth-child(3) .web3-k', t('web3Staked'));
    setText('#btnStakeTokens', t('web3Stake'));
    setText('#btnBurnTokens', t('web3Burn'));
    setText('#btnSaveToChain', t('web3Save'));
    setText('.panel--tracker-main .panel-label', t('trackerPanel'));
    setText('.tracker-hero-title', t('trackerHeroTitle'));
    setText('.tracker-hero-sub', t('trackerHeroSub'));
    setText('.tracker-helper', t('trackerHelper'));
    setText('#fatigueHint', t('fatigueHint'));
    setText('.quick-start-title', t('quickStartTitle'));
    const quickStart = document.querySelectorAll('.quick-start-list li');
    if (quickStart[0]) quickStart[0].textContent = t('quickStart1');
    if (quickStart[1]) quickStart[1].textContent = t('quickStart2');
    if (quickStart[2]) quickStart[2].textContent = t('quickStart3');
    setText('.panel--focus-cycle .panel-label', t('focusCyclePanel'));
    setText('.panel--focus-cycle .panel-copy', t('focusCycleCopy'));
    const focusLabels = document.querySelectorAll('.focus-cycle-field span');
    if (focusLabels[0]) focusLabels[0].textContent = t('focusFieldFocus');
    if (focusLabels[1]) focusLabels[1].textContent = t('focusFieldRecovery');
    setPlaceholder('#taskName', t('taskPlaceholder'));
    setText('#btnStart', t('start'));
    setText('#btnStop', t('stop'));
    setText('#btnRefresh', t('refreshData'));
    setText('.panel--zeus .panel-label', t('zeusPanel'));
    setText('.zeus-badge', t('zeusTagline'));
    setText('#zeusMood', localizeZeusMood('Observing'));
    if ($('zeusMessage') && !$('zeusMessage').dataset.dynamic) $('zeusMessage').textContent = t('zeusDefaultMessage');
    setText('#btnZeusFocus', t('zeusActionFocus'));
    setText('#btnZeusStreak', t('zeusActionStreak'));
    setText('#btnZeusRecover', t('zeusActionRecover'));
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
    if (qsKeys[4]) qsKeys[4].textContent = t('statBenchmark');
    setText('.lb-title', t('statBenchmark'));
    setText('.panel--log .panel-label', t('recentSessions'));
    setText('#btnFilterToday', t('filterToday'));
    setText('#btnFilterAll', t('filterAll'));
    setText('#btnSaveGoal', t('saveGoal'));
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
    setText('.welcome-sub', t('welcomeSubline'));
    setText('#btnWelcomeEnter', t('welcomeEnter'));
    const welcomeFeatures = document.querySelectorAll('.welcome-features li div');
    if (welcomeFeatures[0]) welcomeFeatures[0].innerHTML = S.language === 'en'
      ? '<strong>100% offline</strong> - your data never leaves your browser.'
      : '<strong>100% offline</strong> - dane nie opuszczają Twojej przeglądarki.';
    if (welcomeFeatures[1]) welcomeFeatures[1].innerHTML = S.language === 'en'
      ? '<strong>Advanced math</strong> - Bayesian, Markov, EMA, K-Means.'
      : '<strong>Zaawansowana matematyka</strong> - Bayesian, Markov, EMA, K-Means.';
    if (welcomeFeatures[2]) welcomeFeatures[2].innerHTML = S.language === 'en'
      ? '<strong>XP system</strong> - unlock analytics while building discipline.'
      : '<strong>System XP</strong> - odblokowuj analitykę, wzmacniając dyscyplinę.';
    if (welcomeFeatures[3]) welcomeFeatures[3].innerHTML = S.language === 'en'
      ? '<strong>Bio-tracking</strong> - water, sleep, calories, movement.'
      : '<strong>Bio-tracking</strong> - woda, sen, kalorie, ruch.';
    setText('.welcome-footer', S.language === 'en' ? 'Your data: IndexedDB · No cloud · No tracking' : 'Twoje dane: IndexedDB · Brak chmury · Brak trackingu');
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
  }

  function applyPersistedSettings() {
    const settings = getAppSettings();
    applyTheme(settings.theme);
    applyLanguage(settings.language);
  }

  // Apply local-first appearance settings immediately on startup.
  applyPersistedSettings();

  // ─────────────────────────────────────────────────────────────────────────
  // TRACKER VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async function loadTrackerView() {
    await refreshActiveTask();
    await loadRecentLog();
    await loadQuickStats();
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
    $('quickStartChecklist')?.classList.add('hidden');
    updateHardcoreStopState();
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
    $('activeTimer').textContent  = '00:00:00';
    $('fatigueBar').style.width   = '0%';
    $('fatigueLabel').textContent = '';
    $('btnStart').disabled = false;
    $('btnStop').disabled  = true;
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

  function startLocalTimer(startISO) {
    const startTs = new Date(startISO).getTime();
    clearInterval(S.timerInterval);
    S.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
      $('activeTimer').textContent =
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      const fatigue = MATH.fatigueCurve(Math.floor(elapsed / 60));
      const pct     = Math.round(100 - fatigue.currentEfficiency);
      $('fatigueBar').style.width   = `${Math.min(pct, 100)}%`;
      $('fatigueLabel').textContent = `Wydajność: ${fatigue.currentEfficiency}%`;
      $('fatigueBarWrap').classList.toggle('fatigue--warn', fatigue.shouldBreak);
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
      if (stopped) {
        const stoppedMin = Math.round((stopped.duration || 0) / 60);
        const interrupted = stoppedMin < 15;
        const xp = await calcTaskXP(stopped, { interrupted, hardcoreFail: false });
        if (xp > 0) {
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


  async function loadQuickStats() {
    const todayTasks = await DB.getTasksForDay(DB.toDateStr());
    const analysis   = MATH.analyzeDay(todayTasks);
    $('qsTodayTime').textContent  = fmtSec(analysis.totalSec);
    $('qsEfficiency').textContent = analysis.efficiencyPct + '%';
    $('qsTaskCount').textContent  = analysis.taskCount;

    // Streak
    const all  = await DB.getAllCompletedTasks();
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
      const backfillBadge = t.is_backfill ? '<span class="badge-backfill">RETRO</span>' : '';
      return `
        <div class="log-item cat-border--${t.category}">
          <div class="log-item-header">
            <span class="log-item-name">${escH(t.name)}${backfillBadge}</span>
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

    renderWeeklyBars(analysis.timeByDay, S.weekStart);
    renderEMAChart(emaData);
    renderMarkovTable(analysis.markov);
    renderBayesianTable(analysis.bayesian);
    renderWeeklyInsights(analysis.insights);

    const trendEl  = $('weekTrendBadge');
    const trendMap = { improving:'📈 WZROST', declining:'📉 SPADEK', stable:'➡️ STABILNY' };
    trendEl.textContent = trendMap[emaData.trend] || '—';
    trendEl.className   = `trend-badge trend--${emaData.trend}`;
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
    if (!transitions.length) { el.innerHTML = '<tr><td colspan="4" class="empty-row">Za mało danych</td></tr>'; return; }
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

  function renderBayesianTable(bayesian) {
    const el = $('bayesTable');
    if (!el) return;
    const rows = Object.entries(bayesian).sort((a,b) => b[1].totalSeconds - a[1].totalSeconds);
    if (!rows.length) { el.innerHTML = '<tr><td colspan="4" class="empty-row">Za mało danych</td></tr>'; return; }
    el.innerHTML = rows.map(([cat, s]) => `
      <tr>
        <td><span class="log-cat cat-${cat}">${catLabel(cat)}</span></td>
        <td class="mono">${fmtSec(s.bayesMean)}</td>
        <td class="mono text-muted">±${fmtSec(s.bayesStd)}</td>
        <td class="mono">${s.sampleCount}×</td>
      </tr>`).join('');
  }

  function renderWeeklyInsights(insights) {
    const el = $('weeklyInsights');
    if (!el) return;
    el.innerHTML = (insights.length ? insights : [{ icon:'📊', text:'Za mało danych...' }])
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
  }

  function renderWaterTracker(waterLogs) {
    const WATER_CAP    = 12;
    const GOAL         = 8;
    const totalGlasses = waterLogs.reduce((s, l) => s + (l.value || 1), 0);
    const pct          = Math.min(Math.round(totalGlasses / GOAL * 100), 100);

    $('waterCount').textContent       = `${totalGlasses} / ${GOAL} szklanek`;
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
          showToast(`Dzienne sloty nawodnienia wykorzystane: ${WATER_CAP}/${WATER_CAP}`, 'warn', 6000);
          return;
        }
        await DB.logHealth({ type:'water', value:1, unit:'glass', note:'250ml' });
        S.lastWaterLog = new Date();
        await DB.addXP(20);
        await refreshXPBar();
        await loadHealthView();
        showToast('+20 XP za nawodnienie', 'success');
      });
      glasses.appendChild(btn);
    }
    if (totalGlasses > GOAL) {
      const extra = document.createElement('div');
      extra.style.cssText = 'font-family:var(--font-mono);font-size:10px;color:var(--accent4);margin-top:6px';
      extra.textContent   = `+${totalGlasses - GOAL} ponad cel`;
      glasses.appendChild(extra);
    }

    const undoBtn = $('btnWaterUndo');
    if (undoBtn) {
      undoBtn.onclick = async () => {
        const ok = await DB.undoLastWater();
        if (ok) { await loadHealthView(); showToast('Cofnięto ostatnią szklankę (slot pozostaje zużyty)', 'info'); }
        else showToast('Brak wpisów do cofnięcia', 'warn');
      };
    }
  }

  function renderMealLog(mealLogs) {
    const container = $('mealLog');
    const totalCal  = mealLogs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
    const calTotal  = $('mealCalTotal');
    const calSum    = $('mealCalSum');

    if (!mealLogs.length) {
      container.innerHTML = '<div class="health-empty">Brak posiłków dziś</div>';
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
    $('movementTotal').textContent = totalMin + ' min ruchu dziś';
    const container = $('movementLog');
    if (!moveLogs.length) {
      container.innerHTML = '<div class="health-empty">Brak aktywności fizycznej dziś</div>';
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
        if (!date || !bedtime || !wakeTime) { showToast('⚠️ Uzupełnij datę i godziny', 'warn'); return; }
        const [bh,bm] = bedtime.split(':').map(Number);
        const [wh,wm] = wakeTime.split(':').map(Number);
        let bedMin = bh*60+bm, wakeMin = wh*60+wm;
        if (wakeMin <= bedMin) wakeMin += 1440;
        const durationMin = wakeMin - bedMin;
        await DB.logSleep({ date, bedtime, wakeTime, durationMin, quality });
        await DB.addXP(50);
        await refreshXPBar();
        showToast(`🌙 Sen zapisany (${Math.round(durationMin/60*10)/10}h) — +50 XP`, 'success');
        const sleepHours = calculateSleepDurationHours(bedtime, wakeTime);
        if (sleepHours < 6) {
          zeusSpeak(`You slept ${sleepHours.toFixed(1)} hours. Even gods require more.`, 'Warning', 'high');
        } else {
          zeusSpeak(`Recovery logged: ${sleepHours.toFixed(1)}h. A sharper mind returns.`, 'Approving');
        }
        await loadSleepHistory();
        $('sleepDate').value = $('sleepBedtime').value = $('sleepWakeLog').value = $('sleepQuality').value = '';
      });
    }
  }

  async function loadSleepHistory() {
    const logs = await DB.getSleepLogs(7);
    const el   = $('sleepHistory');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<div class="health-empty">Brak danych snu</div>'; return; }
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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS, ALARM, PWA INSTALL, GOOGLE BACKUP
  // ─────────────────────────────────────────────────────────────────────────

  function loadSettingsView() {
    const languageSelect = $('languageSelect');
    const themeSelect = $('themeSelect');
    if (languageSelect) languageSelect.value = S.language;
    if (themeSelect) themeSelect.value = S.theme;
    refreshConnectionViews();
  }

  function initSettingsView() {
    $('languageSelect')?.addEventListener('change', e => {
      const lang = e.target.value === 'en' ? 'en' : 'pl';
      applyLanguage(lang);
      saveAppSettings({ language: lang });
      showToast(t('languageSwitched'), 'success');
    });

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
      $('web3Panel')?.classList.remove('hidden');
      updateModeIndicator();
      refreshConnectionViews();
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
    const ctx = new AudioCtx();
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

  function initDeepWorkMode() {
    $('btnDeepWorkMode')?.addEventListener('click', async () => {
      document.body.classList.toggle('deep-work');
      const enabled = document.body.classList.contains('deep-work');
      if (enabled) {
        zeusSpeak('Now you work. No excuses.', 'Demanding', 'high');
        if (document.documentElement.requestFullscreen) {
          try { await document.documentElement.requestFullscreen(); } catch {}
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch {}
      }
      updatePomodoroUI();
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
        const meta = S.language === 'en'
          ? `Tier ${n.tier} · Lv ${n.levelReq}+`
          : `Tier ${n.tier} · Poziom ${n.levelReq}+`;
        return `<button class="skill-node ${unlocked ? 'unlocked' : ''} ${canUnlock ? 'can-unlock' : ''}" data-skill="${n.id}">
          <div class="skill-name">${skillInfo.name}</div>
          <div class="skill-desc">${skillInfo.desc}</div>
          <div class="skill-meta">${meta}</div>
        </button>`;
      }).join('');
      return `<div class="skill-branch">
        <div class="skill-branch-title">${branchName}</div>
        ${items}
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

    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') showToast(`🔔 ${t('notificationsEnabled')}`, 'success');
    }

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
    document.body.classList.remove('app-locked');
    $('modeSplash')?.classList.add('hidden');
    switchTab('tracker');
    await loadTrackerView();
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
    $('stakedAmountView').textContent = `${S.stakedFCS} FCS`;
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

  async function initModeSplash() {
    $('btnStakeTokens')?.addEventListener('click', stakeTokens);
    $('btnBurnTokens')?.addEventListener('click', burnTokens);
    $('btnSaveToChain')?.addEventListener('click', saveProgressToChain);
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

  function renderList(containerId, items, emptyText, onDelete) {
    const containerIds = Array.isArray(containerId) ? containerId : [containerId];
    const html = !items.length
      ? `<div class="health-empty">${emptyText}</div>`
      : items.map((it, idx) => `
      <div class="health-log-item">
        <span style="${it.done ? 'text-decoration:line-through;opacity:.7' : ''}">${escH(it.text)}</span>
        <span class="log-time">${new Date(it.ts).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span>
        <button class="log-del" data-del="${idx}">×</button>
      </div>
    `).join('');
    containerIds.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = html;
      el.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', e => onDelete(Number(e.currentTarget.dataset.del))));
    });
  }

  function loadDayPlan() {
    const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
    const items = getLS(key, []);
    renderList(['dayPlanList', 'dayPlanListProfile'], items, t('dayPlanEmpty'), idx => {
      items.splice(idx, 1);
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
      <div class="adv-row"><strong>Best day</strong><span>${bestDay.day} · ${fmtSec(bestDay.sec)}</span></div>
      <div class="adv-row"><strong>Longest session</strong><span>${fmtSec(longest)}</span></div>
      <div class="adv-row"><strong>Most productive hour</strong><span>${String(topHour).padStart(2, '0')}:00</span></div>
    `;
  }

  function initExtendedSections() {
    const bindAddDayPlan = (btnId, inputId) => $(btnId)?.addEventListener('click', () => {
      const input = $(inputId);
      const text = input.value.trim();
      if (!text) return;
      const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
      const items = getLS(key, []);
      items.unshift({ text, ts: Date.now(), done: false });
      setLS(key, items);
      input.value = '';
      loadDayPlan();
    });
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
      $('web3Panel')?.classList.remove('hidden');
      updateModeIndicator();
      refreshConnectionViews();
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

  const ONBOARDING_STEPS = [
    {
      title: 'Pasek boczny',
      text: 'Tutaj szybko przełączasz sekcje dashboardu: Plan, notatki, sociale i portfel.',
      before: () => { switchTab('profile'); },
      target: () => document.querySelector('.profile-sidebar'),
    },
    {
      title: 'Przycisk portfela',
      text: 'W tej sekcji możesz sprawdzić status portfela i bezpiecznie go rozłączyć.',
      before: () => {
        switchTab('profile');
        const btn = document.querySelector('[data-dashboard-section="wallet"]');
        btn && btn.click();
      },
      target: () => $('btnDisconnectWallet'),
    },
    {
      title: 'Sekcja planu dnia',
      text: 'Dodawaj punkty planu dnia i śledź wykonanie z poziomu kart.',
      before: () => {
        switchTab('profile');
        const btn = document.querySelector('[data-dashboard-section="dayplan"]');
        btn && btn.click();
      },
      target: () => $('dayPlanInputProfile') || $('dayPlanInput'),
    },
  ];

  const GUIDED_ENTRY_KEY = 'focusos_guided_entry_requested';

  function startOnboardingIfNeeded() {
    if (document.body.classList.contains('app-locked')) return;
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return;
    let step = 0;
    const overlay = $('onboardingOverlay');
    const tooltip = $('onboardingTooltip');
    if (!overlay || !tooltip) return;

    const placeTooltip = targetEl => {
      const r = targetEl.getBoundingClientRect();
      const top = Math.min(window.innerHeight - 180, r.bottom + 10);
      const left = Math.min(window.innerWidth - 340, Math.max(12, r.left));
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    };

    const complete = () => {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      overlay.style.display = 'none';
    };

    const render = () => {
      const s = ONBOARDING_STEPS[step];
      if (!s) return complete();
      s.before && s.before();
      $('onboardingTitle').textContent = s.title;
      $('onboardingText').textContent = s.text;
      const target = s.target();
      if (target) placeTooltip(target);
      $('btnOnboardingNext').textContent = step === ONBOARDING_STEPS.length - 1 ? t('onboardingFinish') : t('onboardingNext');
    };

    $('btnOnboardingSkip').onclick = complete;
    $('btnOnboardingNext').onclick = () => { step++; render(); };
    overlay.style.display = 'block';
    render();
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
    setTimeout(startTutorial, 350);
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
      $('web3Panel')?.classList.add('hidden');
    }
    updateModeIndicator();
    refreshConnectionViews();
    loadProfileView();
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
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────────────────

  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Enter' && !$('btnStart').disabled) handleStart();
      if (e.key === 'Escape' && !$('btnStop').disabled) handleStop();
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

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────

  async function init() {
    await registerServiceWorker();
    await recoverHardcoreFailureIfNeeded();
    await initHardcoreMode();
    await initLevelProgression();
    S.zeusStyle = getLS(LS_KEYS.zeusStyle, 'balanced');
    S.walletAddress = localStorage.getItem(LS_KEYS.wallet) || null;
    S.googleConnected = localStorage.getItem(LS_KEYS.google) === '1';
    await initModeSplash();
    initMatrixRain();
    startClock();
    initTabs();
    initResponsiveHeader();
    initDateNav();
    initKeyboard();
    initBackfillModal();
    await initNotifications();
    initHealthButtons();
    initExtendedSections();
    initSleepView();
    initSettingsView();
    initRoutines();
    initDeepWorkMode();
    initZeusActions();
    renderMissions();
    renderAchievements();
    await renderAdvancedStats();
    await initPomodoro();
    await initDailyGoal();
    initHistoryFilters();
    initAlarmClock();
    initPwaInstall();
    initGoogleBackup();
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
    if (!document.body.classList.contains('app-locked')) {
      await maybeStartGuidedEntry();
    }

    setInterval(async () => {
      if (S.currentView === 'tracker') await loadQuickStats();
    }, 30000);

    console.log('%c⚡ FocusOS 2.0 PWA — no backend required', 'color:#63ffb4;font-family:monospace;font-size:14px;');
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
