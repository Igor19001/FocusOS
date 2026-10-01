import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Moon, NotebookPen, Target, Timer, Trophy, Wallet } from "lucide-react";

import { TopBar } from "./components/TopBar";
import { DayPath } from "./components/DayPath";
import { Quests } from "./components/Quests";
import { Insights } from "./components/Insights";
import { LogSheet } from "./components/LogSheet";
import { SleepCard } from "./components/SleepCard";
import { CycleCard } from "./components/CycleCard";
import { WindDown } from "./components/WindDown";
import { Pomodoro } from "./components/Pomodoro";
import { HistoryCalendar } from "./components/HistoryCalendar";
import { Networth } from "./components/Networth";
import { Notes } from "./components/Notes";
import { Intro } from "./components/Intro";
import { Mascot, mascotState } from "./components/Mascot";
import { ProfileSheet } from "./components/ProfileSheet";

import { dayStats, xpFor, CATEGORIES, STREAK_THRESHOLD } from "./lib/routine";
import { dayKey, shiftDay, useNow, nowMinutes } from "./lib/time";
import { loadState, saveState } from "./lib/storage";
import {
  clearCloudSession, cloudMe, cloudState, deleteCloudAccount, hasMeaningfulData,
  loadCloudSession, loginCloud, logoutCloud, putCloudState, registerCloud,
  sameState, saveCloudSession,
} from "./lib/cloud";
import { PHASE, sleepInfo } from "./lib/sleep";
import { rescheduleDaily, schedulePomodoroEnd, cancelPomodoro } from "./lib/notifications";
import { isDone, minutesOfDay, startSession } from "./lib/pomodoro";

const EMPTY_DAY = { blocks: [], claimed: [], score: 0, focusDone: 0 };

const qualifies = (day) => !!day && day.score >= STREAK_THRESHOLD;

function computeStreak(history, todayKey) {
  let streak = 0;
  // Dzisiaj jeszcze trwa, więc brak wyniku nie zeruje serii do północy.
  let key = qualifies(history[todayKey]) ? todayKey : shiftDay(todayKey, -1);
  while (qualifies(history[key])) {
    streak += 1;
    key = shiftDay(key, -1);
  }
  return streak;
}

/**
 * Pięć zakładek to sufit na telefonie — przy szóstej etykiety zaczynają się łamać.
 * Historia siedzi więc pod dotknięciem serii w pasku górnym, tam gdzie i tak
 * jej szukasz.
 */
const TABS = [
  { id: "day", label: "Dzień", Icon: Target },
  { id: "focus", label: "Skupienie", Icon: Timer },
  { id: "notes", label: "Notatki", Icon: NotebookPen },
  { id: "sleep", label: "Sen", Icon: Moon },
  { id: "money", label: "Majątek", Icon: Wallet },
];

export default function DayQuest() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("day");
  const [sheet, setSheet] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [burst, setBurst] = useState(null);
  const [toast, setToast] = useState(null);
  const [dark, setDark] = useState(false);
  const [nightDismissed, setNightDismissed] = useState(false);
  const [intro, setIntro] = useState(true);
  const [profile, setProfile] = useState(false);
  const [cloud, setCloud] = useState({ status: "local", session: null, user: null, rev: 0, conflict: null });
  const cloudRef = useRef(cloud);
  const cloudReady = useRef(false);
  const lastSynced = useRef("");
  const syncTimer = useRef(null);

  const now = useNow();
  const nowMin = nowMinutes(now);
  const today = dayKey(now);

  useEffect(() => { cloudRef.current = cloud; }, [cloud]);

  // Lokalny magazyn jest zawsze źródłem awaryjnym. Chmura dochodzi dopiero po nim.
  useEffect(() => {
    let alive = true;
    (async () => {
      const local = await loadState();
      if (!alive) return;
      setState(local);

      const session = await loadCloudSession();
      if (!session?.token) {
        cloudReady.current = true;
        return;
      }

      setCloud({ status: "connecting", session, user: session.user ?? null, rev: 0, conflict: null });
      try {
        const [meRes, remote] = await Promise.all([cloudMe(session.token), cloudState(session.token)]);
        const user = meRes.user;
        const nextSession = { token: session.token, user };
        await saveCloudSession(nextSession);

        if (remote.state) {
          if (!hasMeaningfulData(local) || sameState(local, remote.state)) {
            setState(remote.state);
            await saveState(remote.state);
            lastSynced.current = JSON.stringify(remote.state);
            setCloud({ status: "synced", session: nextSession, user, rev: remote.rev, conflict: null });
          } else {
            // Pierwsze wejście z danymi na obu końcach: nie zgadujemy, co skasować.
            setCloud({ status: "conflict", session: nextSession, user, rev: remote.rev, conflict: remote });
          }
        } else {
          const pushed = await putCloudState(session.token, local, 0, false);
          lastSynced.current = JSON.stringify(local);
          setCloud({ status: "synced", session: nextSession, user, rev: pushed.rev, conflict: null });
        }
      } catch (err) {
        if (!alive) return;
        if (err.status === 401) {
          await clearCloudSession();
          setCloud({ status: "local", session: null, user: null, rev: 0, conflict: null });
        } else {
          setCloud((c) => ({ ...c, status: "offline" }));
        }
      } finally {
        cloudReady.current = true;
      }
    })();
    return () => { alive = false; };
  }, []);

  // Każda zmiana najpierw trafia do Preferences, potem (z debounce) do chmury.
  useEffect(() => {
    if (!state) return;
    saveState(state);
    if (!cloudReady.current) return;
    const current = cloudRef.current;
    if (!current.session?.token || current.status === "conflict" || current.status === "connecting") return;
    const json = JSON.stringify(state);
    if (json === lastSynced.current) return;

    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const c = cloudRef.current;
      if (!c.session?.token || c.status === "conflict") return;
      setCloud((x) => ({ ...x, status: "syncing" }));
      try {
        const result = await putCloudState(c.session.token, state, c.rev, false);
        lastSynced.current = JSON.stringify(state);
        setCloud((x) => ({ ...x, status: "synced", rev: result.rev, conflict: null }));
      } catch (err) {
        if (err.status === 409) {
          setCloud((x) => ({ ...x, status: "conflict", rev: err.body?.rev ?? x.rev, conflict: err.body }));
        } else if (err.status === 401) {
          await clearCloudSession();
          setCloud({ status: "local", session: null, user: null, rev: 0, conflict: null });
        } else {
          setCloud((x) => ({ ...x, status: "offline" }));
        }
      }
    }, 700);

    return () => clearTimeout(syncTimer.current);
  }, [state]);

  /* ── motyw ───────────────────────────────────────────────────────── */
  const theme = state?.settings.theme ?? "system";
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", isDark);
      setDark(isDark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  /* ── codzienne przypomnienia ─────────────────────────────────────── */
  const notifKey = state
    ? [state.settings.bedtime, state.settings.wake, state.settings.warnBefore,
       state.settings.logReminder, state.settings.notifications].join("|")
    : null;
  const lastNotifKey = useRef(null);
  useEffect(() => {
    if (!state || notifKey === lastNotifKey.current) return;
    lastNotifKey.current = notifKey;
    rescheduleDaily(state.settings);
  }, [notifKey, state]);

  const day = state?.history[today] ?? EMPTY_DAY;
  const blocks = day.blocks;
  const stats = useMemo(() => dayStats(blocks), [blocks]);

  useEffect(() => {
    if (!state) return;
    if ((state.history[today]?.score ?? -1) === stats.score) return;
    setState((s) => ({
      ...s,
      history: { ...s.history, [today]: { ...(s.history[today] ?? EMPTY_DAY), score: stats.score } },
    }));
  }, [stats.score, today, state]);

  const patchDay = useCallback(
    (fn) => setState((s) => ({
      ...s,
      history: { ...s.history, [today]: fn(s.history[today] ?? EMPTY_DAY) },
    })),
    [today]
  );

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  const fire = (amount, message) => {
    setState((s) => ({ ...s, xp: s.xp + amount }));
    setBurst({ id: Date.now(), amount });
    setTimeout(() => setBurst(null), 900);
    notify(message);
  };

  const toggle = (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    patchDay((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, done: !b.done } : b)) }));
    if (block.done) setState((s) => ({ ...s, xp: Math.max(0, s.xp - xpFor(block)) }));
    else fire(xpFor(block), `${block.title} — odhaczone.`);
  };

  const saveBlock = (draft) => {
    if (editingBlock) {
      patchDay((d) => ({
        ...d,
        blocks: d.blocks.map((b) => (b.id === editingBlock.id ? { ...b, ...draft, id: b.id } : b)),
      }));
      notify("Blok zaktualizowany.");
    } else {
      patchDay((d) => ({ ...d, blocks: [...d.blocks, { ...draft, id: Date.now() }] }));
      notify("Dodane do dnia.");
    }
    setEditingBlock(null);
    setSheet(false);
  };

  const deleteBlock = (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || !confirm(`Usunąć blok „${block.title}”?`)) return;
    patchDay((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    if (block.done) setState((s) => ({ ...s, xp: Math.max(0, s.xp - xpFor(block)) }));
    setEditingBlock(null);
    setSheet(false);
    notify("Blok usunięty.");
  };

  /* ── pomodoro ────────────────────────────────────────────────────── */

  /** Domknięcie sesji: wpisuje blok na ścieżkę dnia i przyznaje XP. */
  const completeSession = useCallback((session) => {
    cancelPomodoro();
    setState((s) => ({ ...s, session: null }));
    if (session.phase !== "focus") {
      notify("Przerwa skończona.");
      return;
    }
    const block = {
      id: session.startedAt,
      title: session.title || `Sesja ${session.plannedMin} min`,
      cat: session.cat in CATEGORIES ? session.cat : "focus",
      start: minutesOfDay(session.startedAt),
      duration: session.plannedMin,
      done: true,
    };
    patchDay((d) => ({
      ...d,
      blocks: [...d.blocks, block],
      focusDone: (d.focusDone ?? 0) + 1,
    }));
    fire(xpFor(block), "Sesja zaliczona. Blok wpadł na ścieżkę.");
  }, [patchDay]);

  /**
   * Domknięcie działa też po fakcie: jeśli apka była ubita, przy starcie
   * zobaczy, że endsAt już minął, i zaliczy sesję wstecz.
   */
  useEffect(() => {
    if (state?.session && isDone(state.session, now.getTime())) completeSession(state.session);
  }, [state?.session, now, completeSession]);

  const startPomodoro = (phase, opts) => {
    const session = startSession(phase, state.settings.pomodoro, opts);
    setState((s) => ({ ...s, session }));
    schedulePomodoroEnd(session);
    setTab("focus");
  };

  const stopPomodoro = () => {
    cancelPomodoro();
    setState((s) => ({ ...s, session: null }));
    notify("Sesja przerwana. Bez XP.");
  };

  /* ── zadania dnia ────────────────────────────────────────────────── */
  const quests = [
    { id: "q1", label: "Zamknij 4 bloki", Icon: Target, goal: 4, value: stats.doneCount, reward: 40 },
    { id: "q2", label: "Zbierz 3h skupienia", Icon: Brain, goal: 180, value: stats.focus, reward: 60, unit: "min" },
    { id: "q3", label: "Dobij do 80 punktów dnia", Icon: Trophy, goal: 80, value: stats.score, reward: 80 },
  ];

  const claim = (id) => {
    const q = quests.find((x) => x.id === id);
    patchDay((d) => ({ ...d, claimed: [...d.claimed, id] }));
    fire(q.reward, `Zadanie zaliczone: ${q.label}`);
  };

  const sleep = state ? sleepInfo(nowMin, state.settings) : null;
  useEffect(() => {
    if (sleep && sleep.phase !== PHASE.NIGHT) setNightDismissed(false);
  }, [sleep?.phase]);

  const connectAccount = async (kind, credentials) => {
    try {
      setCloud((c) => ({ ...c, status: "connecting" }));
      const auth = kind === "register" ? await registerCloud(credentials) : await loginCloud(credentials);
      const session = { token: auth.token, user: auth.user };
      await saveCloudSession(session);
      const remote = await cloudState(auth.token);

      if (!remote.state) {
        const pushed = await putCloudState(auth.token, state, 0, false);
        lastSynced.current = JSON.stringify(state);
        setCloud({ status: "synced", session, user: auth.user, rev: pushed.rev, conflict: null });
      } else if (!hasMeaningfulData(state) || sameState(state, remote.state)) {
        setState(remote.state);
        await saveState(remote.state);
        lastSynced.current = JSON.stringify(remote.state);
        setCloud({ status: "synced", session, user: auth.user, rev: remote.rev, conflict: null });
      } else {
        setCloud({ status: "conflict", session, user: auth.user, rev: remote.rev, conflict: remote });
      }
      notify(kind === "register" ? "Konto utworzone. Synchronizacja włączona." : "Zalogowano.");
    } catch (err) {
      setCloud((c) => ({ ...c, status: c.session ? "offline" : "local" }));
      notify(err.message || "Nie udało się połączyć z chmurą.");
      throw err;
    }
  };

  const pullCloud = async () => {
    const c = cloudRef.current;
    if (!c.session?.token) return;
    try {
      const remote = c.conflict?.state ? c.conflict : await cloudState(c.session.token);
      if (!remote.state) return notify("Chmura jest pusta.");
      setState(remote.state);
      await saveState(remote.state);
      lastSynced.current = JSON.stringify(remote.state);
      setCloud((x) => ({ ...x, status: "synced", rev: remote.rev, conflict: null }));
      notify("Pobrano dane z chmury.");
    } catch (err) { notify(err.message || "Nie udało się pobrać danych."); }
  };

  const pushCloud = async () => {
    const c = cloudRef.current;
    if (!c.session?.token) return;
    try {
      setCloud((x) => ({ ...x, status: "syncing" }));
      const result = await putCloudState(c.session.token, state, c.rev, true);
      lastSynced.current = JSON.stringify(state);
      setCloud((x) => ({ ...x, status: "synced", rev: result.rev, conflict: null }));
      notify("To urządzenie zapisane w chmurze.");
    } catch (err) { setCloud((x) => ({ ...x, status: "offline" })); notify(err.message || "Nie udało się wysłać danych."); }
  };

  const logoutAccount = async () => {
    const c = cloudRef.current;
    try { if (c.session?.token) await logoutCloud(c.session.token); } catch {}
    await clearCloudSession();
    lastSynced.current = "";
    setCloud({ status: "local", session: null, user: null, rev: 0, conflict: null });
    notify("Wylogowano. Dane lokalne zostały na telefonie.");
  };

  const deleteAccount = async () => {
    const c = cloudRef.current;
    if (!c.session?.token || !confirm("Usunąć konto i kopię danych z chmury? Dane lokalne zostaną na tym urządzeniu.")) return;
    try {
      await deleteCloudAccount(c.session.token);
      await clearCloudSession();
      lastSynced.current = "";
      setCloud({ status: "local", session: null, user: null, rev: 0, conflict: null });
      notify("Konto i dane w chmurze usunięte.");
    } catch (err) { notify(err.message || "Nie udało się usunąć konta."); }
  };

  if (!state) return <Intro ready={false} onDone={() => setIntro(false)} />;

  const streak = computeStreak(state.history, today);
  const showWindDown = state.settings.windDown && sleep.phase === PHASE.NIGHT && !nightDismissed;
  const mascot = mascotState({
    phase: sleep.phase,
    focusRunning: !!state.session && state.session.phase === "focus",
    score: stats.score,
    streak,
    doneCount: stats.doneCount,
    nowMin,
    bedtime: state.settings.bedtime,
  });

  return (
    <>
    {intro && <Intro ready onDone={() => setIntro(false)} />}
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
      <TopBar
        streak={streak}
        xp={state.xp}
        pct={stats.pct}
        bump={!!burst}
        now={now}
        dark={dark}
        cloud={cloud}
        onToggleTheme={() =>
          setState((s) => ({ ...s, settings: { ...s.settings, theme: dark ? "light" : "dark" } }))
        }
        onOpenHistory={() => setTab("history")}
        onOpenProfile={() => setProfile(true)}
      />

      {burst && (
        <div
          key={burst.id}
          className="dq-fly pointer-events-none fixed left-1/2 top-20 z-30 -translate-x-1/2 rounded-2xl bg-yellow-400 px-4 py-2 text-lg font-black text-yellow-950 shadow-lg"
        >
          +{burst.amount} XP
        </div>
      )}

      <main className="mx-auto max-w-2xl space-y-8 px-4 pb-28 pt-6">
        {tab === "day" && (
          <>
            <section className="flex items-center gap-4">
              <Mascot mood={mascot.mood} size={84} className="shrink-0" />
              <div className="min-w-0 flex-1 rounded-3xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Limek
                </p>
                <p className="mt-1 font-black leading-snug text-slate-800 dark:text-slate-100">
                  {mascot.line}
                </p>
              </div>
            </section>
            <DayPath
              blocks={blocks}
              nowMin={nowMin}
              onToggle={toggle}
              onOpenLog={() => { setEditingBlock(null); setSheet(true); }}
              onEdit={(block) => { setEditingBlock(block); setSheet(true); }}
            />
            <Quests quests={quests} claimed={day.claimed} onClaim={claim} />
            <Insights blocks={blocks} score={stats.score} focusShare={stats.focusShare} doneMin={stats.done} />
          </>
        )}

        {tab === "focus" && (
          <Pomodoro
            session={state.session}
            cfg={state.settings.pomodoro}
            focusDone={day.focusDone ?? 0}
            onStart={startPomodoro}
            onStop={stopPomodoro}
            onSkip={() => completeSession(state.session)}
            onChangeCfg={(pomodoro) =>
              setState((s) => ({ ...s, settings: { ...s.settings, pomodoro } }))
            }
          />
        )}

        {tab === "sleep" && (
          <>
            <SleepCard
              nowMin={nowMin}
              settings={state.settings}
              onChangeSettings={(settings) => setState((s) => ({ ...s, settings }))}
            />
            <CycleCard nowMin={nowMin} settings={state.settings} />
          </>
        )}

        {tab === "notes" && (
          <Notes notes={state.notes} onChange={(notes) => setState((s) => ({ ...s, notes }))} />
        )}

        {tab === "money" && (
          <Networth
            finance={state.finance}
            onChange={(finance) => setState((s) => ({ ...s, finance }))}
          />
        )}

        {tab === "history" && <HistoryCalendar history={state.history} today={today} />}
      </main>

      {/* dolna nawigacja */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id || (id === "day" && tab === "history");
            const busy = id === "focus" && !!state.session;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5",
                  "focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300",
                  active ? "text-lime-600 dark:text-lime-400" : "text-slate-400 dark:text-slate-500",
                ].join(" ")}
              >
                <Icon className="h-6 w-6 stroke-[2.5]" />
                <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>
                {busy && !active && (
                  <span className="absolute right-1/2 top-1.5 h-2 w-2 translate-x-4 rounded-full bg-sky-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {toast && (
        <div className="dq-rise fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-sm rounded-2xl border-b-4 border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-white dark:border-slate-600 dark:bg-slate-700">
          {toast}
        </div>
      )}

      {sheet && <LogSheet
        nowMin={nowMin}
        initial={editingBlock}
        onClose={() => { setEditingBlock(null); setSheet(false); }}
        onSave={saveBlock}
        onDelete={deleteBlock}
      />}

      {profile && (
        <ProfileSheet
          cloud={cloud}
          onClose={() => setProfile(false)}
          onLogin={(data) => connectAccount("login", data)}
          onRegister={(data) => connectAccount("register", data)}
          onLogout={logoutAccount}
          onPull={pullCloud}
          onPush={pushCloud}
          onDeleteAccount={deleteAccount}
        />
      )}

      {showWindDown && (
        <WindDown
          minutesToWake={sleep.minutesToWake}
          wake={state.settings.wake}
          fallAsleep={state.settings.fallAsleep}
          cycleMin={state.settings.cycleMin}
          onDismiss={() => setNightDismissed(true)}
        />
      )}
    </div>
    </>
  );
}
