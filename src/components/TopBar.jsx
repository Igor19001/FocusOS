import { Cloud, CloudOff, Flame, Moon, Sun, UserRound, Zap } from "lucide-react";
import { fmt } from "../lib/routine";

export function DayRing({ pct }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
        <circle cx="24" cy="24" r={r} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="7" />
        <circle
          cx="24" cy="24" r={r}
          className="fill-none stroke-lime-500 transition-all duration-500"
          strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-black text-slate-700 dark:text-slate-200">
        {pct}%
      </span>
    </div>
  );
}

const DNI = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

export function TopBar({ streak, xp, pct, bump, now, dark, cloud, onToggleTheme, onOpenHistory, onOpenProfile }) {
  const connected = !!cloud?.user;
  const syncOk = cloud?.status === "synced";
  const SyncIcon = connected ? Cloud : CloudOff;

  return (
    <header className="sticky top-0 z-20 border-b-2 border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <DayRing pct={pct} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {DNI[now.getDay()]} · {fmt(now.getHours() * 60 + now.getMinutes())}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-black text-slate-800 dark:text-slate-100">DayQuest</h1>
            <span className="rounded-lg bg-lime-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-lime-700 dark:bg-lime-950 dark:text-lime-300">v5</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
            className="hidden h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-800 dark:text-slate-400 sm:grid"
          >
            {dark ? <Sun className="h-4 w-4 stroke-[2.5]" /> : <Moon className="h-4 w-4 stroke-[2.5]" />}
          </button>
          <button
            onClick={onOpenHistory}
            aria-label="Pokaż historię"
            className="flex items-center gap-1.5 rounded-2xl border-2 border-b-4 border-orange-200 bg-orange-50 px-2.5 py-1.5 transition-transform active:translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:border-orange-900 dark:bg-orange-950"
          >
            <Flame className="dq-flame h-5 w-5 fill-orange-400 text-orange-500" />
            <b className="text-base font-black text-orange-600 dark:text-orange-300">{streak}</b>
          </button>
          <span className="flex items-center gap-1.5 rounded-2xl border-2 border-b-4 border-yellow-200 bg-yellow-50 px-2.5 py-1.5 dark:border-yellow-900 dark:bg-yellow-950">
            <Zap className="h-5 w-5 fill-yellow-400 text-yellow-500" />
            <b className={`text-base font-black text-yellow-700 dark:text-yellow-300 ${bump ? "dq-bump" : ""}`}>{xp}</b>
          </span>
          <button
            onClick={onOpenProfile}
            aria-label={connected ? "Konto i synchronizacja" : "Zaloguj i włącz synchronizację"}
            className="relative grid h-10 w-10 place-items-center rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-slate-500 transition-transform active:translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <UserRound className="h-4 w-4 stroke-[2.7]" />
            <span className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white dark:border-slate-900 ${syncOk ? "bg-lime-500" : connected ? "bg-amber-400" : "bg-slate-300 dark:bg-slate-600"}`}>
              <SyncIcon className="h-2.5 w-2.5 text-white" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
