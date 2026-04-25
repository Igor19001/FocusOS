/* ═══════════════════════════════════════════════════════════════════════════
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
    stakedFCS:         0,
    resetConfirmStep:  0,
    alarm: {
      time: null,
      intervalId: null,
      triggeredForDate: null,
    },
    deferredInstallPrompt: null,
    installAvailable: false,
    language: 'en',
    theme: 'cyberpunk',
    googleTokenClient: null,
  };
  const LS_KEYS = {
    sleepNotes: 'focusos_sleep_notes',
    dayPlan: 'focusos_day_plan',
    socials: 'focusos_socials',
    wallet: 'focusos_wallet_address',
  };
  const ONBOARDING_KEY = 'hasCompletedOnboarding';
  const TUTORIAL_COMPLETED_KEY = 'tutorialCompleted';
  const APP_SETTINGS_KEY = 'focusos_app_settings';
  const GOOGLE_CLIENT_ID = '236650961782-14eb0ahioado9bedd7mq8frs8heuao1m.apps.googleusercontent.com';
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
  const FALLBACK_WALLET_ADDRESS = 'YOUR_MONAD_WALLET_ADDRESS_HERE';

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
  const catLabel    = cat => DB.CAT_LABELS[cat] || cat;
  const catColor    = cat => DB.CAT_COLORS[cat] || '#888';
  const FATIGUE_ZERO_XP_THRESHOLD = 40;

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

  const XP_LEVELS = [
    { level:1, min:0,     max:999,      title:'Novice'      },
    { level:2, min:1000,  max:4999,     title:'Apprentice'  },
    { level:3, min:5000,  max:11999,    title:'Analyst'     },
    { level:4, min:12000, max:24999,    title:'Architect'   },
    { level:5, min:25000, max:Infinity, title:'Master'      },
  ];

  function getLevelInfo(totalXP) {
    const l = XP_LEVELS.find(l => totalXP >= l.min && totalXP <= l.max) || XP_LEVELS[0];
    const nextLevel = XP_LEVELS.find(x => x.level === l.level + 1);
    const pct = nextLevel
      ? Math.min(100, Math.round((totalXP - l.min) / (nextLevel.min - l.min) * 100))
      : 100;
    return { ...l, pct, nextMin: nextLevel ? nextLevel.min : l.max, totalXP };
  }

  function calcTaskXP(task) {
    if (!task || task.is_backfill === 1 || task.is_backfill === true) return 0;
    if (!task.duration || !DB.PRODUCTIVE.has(task.category)) return 0;
    const sessionMin = task.duration / 60;
    const fatigue = MATH.fatigueCurve(sessionMin);
    if (fatigue.currentEfficiency <= FATIGUE_ZERO_XP_THRESHOLD) return 0;
    // XP = productive_minutes × efficiency_factor (0.5–1.0)
    return Math.round(sessionMin * (fatigue.currentEfficiency / 100) * 1.2);
  }

  async function refreshXPBar() {
    S.totalXP  = await DB.getTotalXP();
    S.userLevel = getLevelInfo(S.totalXP).level;
    const info  = getLevelInfo(S.totalXP);
    if ($('xpLevel')) $('xpLevel').textContent  = `Lv.${info.level}`;
    if ($('xpTitle')) $('xpTitle').textContent  = info.title;
    if ($('xpLabel')) $('xpLabel').textContent  = `${info.totalXP.toLocaleString()} / ${info.nextMin.toLocaleString()} XP`;
    if ($('xpFill'))  $('xpFill').style.width   = info.pct + '%';
    applyLevelLocks();
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
    if (seen) return;
    const empty = await DB.isEmpty();
    if (!empty) { await DB.setSetting('onboarding_done', true); return; }
    $('welcomeModal').classList.add('open');
    $('btnWelcomeEnter').addEventListener('click', async () => {
      $('welcomeModal').classList.remove('open');
      await DB.setSetting('onboarding_done', true);
      setTimeout(startTutorial, 600);
    }, { once: true });
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
      text: '🎨 Tu przełączysz motyw (Cyberpunk / Light / Retro) oparty o CSS variables.',
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
      targetSelector: '[data-tab="about"]',
      arrow: 'down',
      text: 'ℹ️ Zakładka O nas opisuje filozofię Local-First i kanały społecznościowe FocusOS.',
      before: () => switchTab('about'),
    },
    {
      targetSelector: '[data-tab="profile"]',
      arrow: 'down',
      text: '👤 Profil to panel pomocniczy: plan dnia, notatki snu, socials i zarządzanie portfelem.',
      before: () => switchTab('profile'),
    },
  ];

  async function startTutorial() {
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

    $('tutText').innerHTML = step.text;
    $('tutStep').textContent = `${S.tutorialStep + 1} / ${steps.length}`;
    const isLast = S.tutorialStep === steps.length - 1;
    $('tutNext').textContent = isLast
      ? (S.language === 'en' ? 'Done ✓' : 'Rozumiem ✓')
      : (S.language === 'en' ? 'Next →' : 'Dalej →');

    const arrow = $('tutArrow');
    arrow.className = `tut-arrow tut-arrow--${step.arrow}`;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const bw = 288;
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
      const bubble = $('tutBubble');
      bubble.style.top  = Math.max(8, top)  + 'px';
      bubble.style.left = Math.max(8, left) + 'px';
    } else {
      const bubble = $('tutBubble');
      bubble.style.top = '18vh';
      bubble.style.left = 'max(8px, calc(50vw - 144px))';
    }

    $('tutNext').onclick = () => { S.tutorialStep++; showTutorialStep(); };
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

  function getAppSettings() {
    const saved = getLS(APP_SETTINGS_KEY, {});
    return {
      language: saved.language || 'en',
      theme: saved.theme || 'cyberpunk',
    };
  }

  function saveAppSettings(partial) {
    const merged = { ...getAppSettings(), ...partial };
    setLS(APP_SETTINGS_KEY, merged);
    return merged;
  }

  function applyTheme(themeName) {
    S.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
  }

  const I18N = {
    pl: {
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
      tabs: {
        tracker: '⏱ Tracker',
        daily: '📅 Dzienny',
        weekly: '📊 Tygodniowy',
        health: '🩺 Zdrowie',
        sleep: '🌙 Sen',
        settings: '⚙ Ustawienia',
        about: 'ℹ O nas',
        profile: '👤 Profil',
      },
    },
    en: {
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
      tabs: {
        tracker: '⏱ Tracker',
        daily: '📅 Daily',
        weekly: '📊 Weekly',
        health: '🩺 Health',
        sleep: '🌙 Sleep',
        settings: '⚙ Settings',
        about: 'ℹ About',
        profile: '👤 Profile',
      },
    },
  };

  const t = key => {
    const langPack = I18N[S.language] || I18N.pl;
    return langPack[key] || I18N.pl[key] || key;
  };

  function applyLanguage(lang) {
    S.language = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (I18N[lang]?.tabs?.[tabId]) btn.textContent = I18N[lang].tabs[tabId];
    });
    const nextBtn = $('tutNext');
    if (nextBtn) {
      nextBtn.textContent = lang === 'en' ? 'Next →' : 'Dalej →';
    }
    const installHint = $('installHint');
    if (installHint && !S.installAvailable) {
      installHint.textContent = lang === 'en'
        ? 'PWA install appears when browser allows it.'
        : 'Instalacja PWA będzie dostępna, gdy przeglądarka zgłosi możliwość instalacji.';
    }
    if ($('alarmStatus') && !S.alarm.time) {
      updateAlarmStatus(t('alarmIdle'));
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
    $('statusLabel').textContent = 'Tracking';
    $('activeCard').style.display = 'block';
    $('activeCard').classList.add('timer-emphasis');
    setTimeout(() => $('activeCard')?.classList.remove('timer-emphasis'), 220);
    $('activeName').textContent = task.name;
    $('activeCat').textContent = catLabel(task.category);
    $('btnStart').disabled = true;
    $('btnStop').disabled  = false;
    $('taskName').value    = '';
    $('quickStartChecklist')?.classList.add('hidden');
  }

  function clearActiveUI() {
    S.activeTask   = null;
    S.sessionStart = null;
    clearInterval(S.timerInterval); S.timerInterval = null;
    $('statusDot').className     = 'status-dot idle';
    $('statusLabel').textContent = 'Idle';
    $('activeCard').style.display = 'block';
    $('activeCard').classList.remove('timer-emphasis');
    $('activeName').textContent   = 'Ready to focus';
    $('activeCat').textContent    = 'Focus Session';
    $('activeTimer').textContent  = '00:00:00';
    $('fatigueBar').style.width   = '0%';
    $('fatigueLabel').textContent = '';
    $('btnStart').disabled = false;
    $('btnStop').disabled  = true;
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
    if (!name) { showToast('⚠️ Wpisz nazwę zadania', 'warn'); $('taskName').focus(); return; }
    try {
      const task = await DB.startTask(name, category);
      S.sessionStart = new Date(task.start_time);
      S.lastActivity = Date.now();
      setActiveUI(task);
      startLocalTimer(task.start_time);
      showToast(`▶ Start: "${name}"`, 'success');
      await loadRecentLog(); await loadQuickStats();
    } catch (e) { showToast('❌ Błąd: ' + e.message, 'error'); }
  }

  async function handleStop() {
    try {
      const stopped = await DB.stopActiveTask();
      clearActiveUI();
      if (stopped) {
        const xp = calcTaskXP(stopped);
        if (xp > 0) {
          const prevLevel  = getLevelInfo(S.totalXP).level;
          const newTotal   = await DB.addXP(xp);
          const nextLevel  = getLevelInfo(newTotal).level;
          await refreshXPBar();
          if (nextLevel > prevLevel) {
            showToast(`🎉 LEVEL UP! Osiągnąłeś Poziom ${nextLevel} — ${getLevelInfo(newTotal).title}!`, 'success', 6000);
          } else {
            showToast(`⏹ Zatrzymano: "${stopped.name}" (+${xp} XP)`, 'info');
          }
        } else {
          showToast(`⏹ Zatrzymano: "${stopped.name}"`, 'info');
        }
      }
      S.lastActivity = Date.now();
      await loadRecentLog(); await loadQuickStats();
    } catch (e) { showToast('❌ Błąd: ' + e.message, 'error'); }
  }

  async function loadQuickStats() {
    const todayTasks = await DB.getTasksForDay(DB.toDateStr());
    const analysis   = MATH.analyzeDay(todayTasks);
    $('qsTodayTime').textContent  = fmtSec(analysis.totalSec);
    $('qsEfficiency').textContent = analysis.efficiencyPct + '%';
    $('qsTaskCount').textContent  = analysis.taskCount;

    // Streak
    const all  = await DB.getAllCompletedTasks();
    const days = new Set(all.map(t => t.start_time.slice(0,10)));
    let streak = 0, d = new Date();
    while (days.has(DB.toDateStr(d))) { streak++; d.setDate(d.getDate()-1); }
    $('qsStreak').textContent = streak;

    // EMA badge
    const ema = MATH.emaProductivityTrend(all);
    const trendMap = { improving:'📈 Wzrost', declining:'📉 Spadek', stable:'➡️ Stabilny' };
    $('qsEMA').textContent = `${trendMap[ema.trend] || '—'} (${ema.currentScore}%)`;
    $('qsEMA').className   = `qs-ema ema--${ema.trend}`;

    // XP bar
    await refreshXPBar();

    // Leaderboard
    renderLeaderboard(all);
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
    const tasks     = await DB.getTasks({ limit: 40 });
    const container = $('recentLog');
    if (!tasks.length) {
      container.innerHTML = '<div class="log-empty">No sessions yet. Start your first focus session.</div>';
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
          { label:'EMA (α=0.3)', data:emaData.smoothed, borderColor:'#63ffb4', backgroundColor:'rgba(99,255,180,0.06)', borderWidth:2, pointRadius:3, fill:true, tension:0.4 },
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
  }

  function initSettingsView() {
    $('languageSelect')?.addEventListener('change', e => {
      const lang = e.target.value === 'en' ? 'en' : 'pl';
      applyLanguage(lang);
      saveAppSettings({ language: lang });
      showToast(lang === 'en' ? 'Language switched to English.' : 'Zmieniono język na polski.', 'success');
    });

    $('themeSelect')?.addEventListener('change', e => {
      const theme = e.target.value;
      applyTheme(theme);
      saveAppSettings({ theme });
      showToast(`Motyw: ${theme}`, 'success');
    });
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

  function initGoogleBackup() {
    $('btnGoogleBackup')?.addEventListener('click', async () => {
      if (!window.google?.accounts?.oauth2) {
        showToast('Google Identity Services not loaded.', 'error');
        return;
      }
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE')) {
        showToast(t('backupMissingClient'), 'warn', 7000);
        return;
      }
      if (!S.googleTokenClient) {
        S.googleTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES,
          callback: async (resp) => {
            if (!resp?.access_token) {
              showToast(t('backupFailed') + 'Missing access token.', 'error');
              return;
            }
            try {
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
                  Authorization: `Bearer ${resp.access_token}`,
                  'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body,
              });
              if (!upload.ok) throw new Error(`HTTP ${upload.status}`);
              showToast(t('backupDone'), 'success', 6000);
            } catch (err) {
              showToast(t('backupFailed') + err.message, 'error', 7000);
            }
          },
        });
      }
      S.googleTokenClient.requestAccessToken();
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
      if (perm === 'granted') showToast('🔔 Powiadomienia włączone!', 'success');
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
      showToast('✅ Ustawienia zapisane', 'success');
      $('notifModal').classList.remove('open');
    });

    S.alertInterval = setInterval(checkSmartAlerts, 60000);
  }

  async function checkSmartAlerts() {
    const now = Date.now();

    // ── Idle Alert (Phase 4): 2h without any tracked activity ─────────────
    const idleMs = now - S.lastActivity;
    if (idleMs >= 2 * 3600 * 1000 && !S.activeTask) {
      sendAlert('👋 Żyjesz?', 'Brak aktywności od 2h. Pamiętaj o uruchomieniu trackera!');
      S.lastActivity = now;
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
    if (mode === 'monad') {
      await connectMonadWallet();
      $('web3Panel')?.classList.remove('hidden');
    } else {
      S.walletAddress = null;
      $('web3Panel')?.classList.add('hidden');
    }
    updateModeIndicator();
    document.body.classList.remove('app-locked');
    $('modeSplash')?.classList.add('hidden');
  }

  function updateModeIndicator() {
    const el = $('modeIndicator');
    if (!el) return;
    if (S.appMode === 'monad') {
      const short = S.walletAddress ? `${S.walletAddress.slice(0, 6)}...${S.walletAddress.slice(-4)}` : 'Not connected';
      el.textContent = `Mode: Monad Network connected to ${short}`;
      return;
    }
    el.textContent = 'Mode: Local Offline';
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
    if ($('walletAddressView')) $('walletAddressView').textContent = S.walletAddress || 'Not connected';
  }

  async function stakeTokens() {
    if (S.appMode !== 'monad') return showToast('Staking is available in Monad mode only', 'warn');
    S.stakedFCS += 25;
    $('stakedAmountView').textContent = `${S.stakedFCS} FCS`;
    showToast(`Staked 25 FCS. Total staked: ${S.stakedFCS} FCS`, 'success');
  }

  async function burnTokens() {
    if (S.appMode !== 'monad') return showToast('Burn is available in Monad mode only', 'warn');
    showToast('Burn simulation complete. Fatigue-penalty bypass hook can be implemented on-chain.', 'info');
  }

  async function saveProgressToChain() {
    if (S.appMode !== 'monad') return showToast('On-chain save is available in Monad mode only', 'warn');
    const payload = { day: DB.toDateStr(), xp: S.totalXP, ts: Date.now() };
    if (window.ethereum && S.walletAddress) {
      try {
        await window.ethereum.request({
          method: 'personal_sign',
          params: [JSON.stringify(payload), S.walletAddress],
        });
        showToast('Progress signed and submitted (simulation)', 'success');
        return;
      } catch (e) {
        showToast(`Signature canceled: ${e.message}`, 'warn');
        return;
      }
    }
    showToast('No wallet detected, local chain-save simulation completed', 'info');
  }

  async function initModeSplash() {
    $('btnStakeTokens')?.addEventListener('click', stakeTokens);
    $('btnBurnTokens')?.addEventListener('click', burnTokens);
    $('btnSaveToChain')?.addEventListener('click', saveProgressToChain);
    // Calm default experience: boot directly in Local mode.
    await selectMode('local');
  }

  function renderList(containerId, items, emptyText, onDelete) {
    const containerIds = Array.isArray(containerId) ? containerId : [containerId];
    const html = !items.length
      ? `<div class="health-empty">${emptyText}</div>`
      : items.map((it, idx) => `
      <div class="health-log-item">
        <span>${escH(it.text)}</span>
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
    renderList(['dayPlanList', 'dayPlanListProfile'], items, 'Brak punktów planu na dziś', idx => {
      items.splice(idx, 1);
      setLS(key, items);
      loadDayPlan();
    });
    updateDashboardCounters();
  }

  function loadSleepNotes() {
    const key = `${LS_KEYS.sleepNotes}:${DB.toDateStr()}`;
    const items = getLS(key, []);
    renderList(['sleepNotesList', 'sleepNotesListProfile'], items, 'Brak notatek snów', idx => {
      items.splice(idx, 1);
      setLS(key, items);
      loadSleepNotes();
    });
    updateDashboardCounters();
  }

  function initExtendedSections() {
    const bindAddDayPlan = (btnId, inputId) => $(btnId)?.addEventListener('click', () => {
      const input = $(inputId);
      const text = input.value.trim();
      if (!text) return;
      const key = `${LS_KEYS.dayPlan}:${DB.toDateStr()}`;
      const items = getLS(key, []);
      items.unshift({ text, ts: Date.now() });
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
      showToast('Socials zapisane', 'success');
      loadProfileView();
    });
    $('btnDisconnectWallet')?.addEventListener('click', () => disconnectWalletFlow());
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
      text: 'Tutaj szybko przełączasz sekcje dashboardu: Plan, Notes, Socials i Portfel.',
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

  function startOnboardingIfNeeded() {
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
      $('btnOnboardingNext').textContent = step === ONBOARDING_STEPS.length - 1 ? 'Zakończ' : 'Dalej';
    };

    $('btnOnboardingSkip').onclick = complete;
    $('btnOnboardingNext').onclick = () => { step++; render(); };
    overlay.style.display = 'block';
    render();
  }

  function restartOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
    startOnboardingIfNeeded();
  }

  function loadProfileView() {
    const socials = getLS(LS_KEYS.socials, { twitter: '', discord: '' });
    if ($('socialTwitter')) $('socialTwitter').value = socials.twitter || '';
    if ($('socialDiscord')) $('socialDiscord').value = socials.discord || '';
    const preview = [];
    if (socials.twitter) preview.push(`Twitter: ${socials.twitter}`);
    if (socials.discord) preview.push(`Discord: ${socials.discord}`);
    if ($('socialsPreview')) $('socialsPreview').textContent = preview.length ? preview.join(' | ') : 'Brak zapisanych linków.';
    if ($('walletProfileInfo')) {
      $('walletProfileInfo').textContent = S.walletAddress
        ? `Połączony portfel: ${S.walletAddress}`
        : 'Brak połączonego portfela';
    }
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
      showToast('Brak aktywnego portfela', 'warn');
      return;
    }
    if (!window.confirm('Krok 1/2: Czy na pewno chcesz rozpocząć rozłączanie portfela?')) return;
    if (!window.confirm('Krok 2/2: Potwierdź ostatecznie rozłączenie portfela.')) return;
    S.walletAddress = null;
    localStorage.removeItem(LS_KEYS.wallet);
    if ($('walletAddressView')) $('walletAddressView').textContent = 'Not connected';
    updateModeIndicator();
    loadProfileView();
    showToast('Portfel rozłączony', 'success');
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
    S.walletAddress = localStorage.getItem(LS_KEYS.wallet) || null;
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
    initAlarmClock();
    initPwaInstall();
    initGoogleBackup();

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
    loadProfileView();
    updateModeIndicator();
    await maybeShowWelcome();
    setTimeout(startTutorial, 900);
    setTimeout(startOnboardingIfNeeded, 450);

    setInterval(async () => {
      if (S.currentView === 'tracker') await loadQuickStats();
    }, 30000);

    console.log('%c⚡ FocusOS 2.0 PWA — no backend required', 'color:#63ffb4;font-family:monospace;font-size:14px;');
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
