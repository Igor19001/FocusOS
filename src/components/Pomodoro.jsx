import { useEffect, useState } from "react";
import { Play, Square, SkipForward, Coffee, Brain, Settings, X, Minus, Plus } from "lucide-react";
import { Button3D, Chip } from "./ui/Button3D";
import { CATEGORIES } from "../lib/routine";
import { PHASES, durationFor, mmss, remainingMs } from "../lib/pomodoro";

function Ring({ pct, phase }) {
  const r = 84;
  const c = 2 * Math.PI * r;
  const stroke =
    phase === "focus" ? "stroke-sky-500" : phase === "longBreak" ? "stroke-violet-500" : "stroke-teal-500";
  return (
    <svg viewBox="0 0 200 200" className="h-56 w-56 -rotate-90">
      <circle cx="100" cy="100" r={r} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="14" />
      <circle
        cx="100" cy="100" r={r}
        className={`fill-none ${stroke} transition-all duration-1000 ease-linear`}
        strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
      />
    </svg>
  );
}

function Stepper({ label, value, onChange, step, min, max, unit = "min" }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <Button3D variant="ghost" className="px-3 py-2" onClick={() => onChange(Math.max(min, value - step))}>
          <Minus className="h-4 w-4 stroke-[3]" />
        </Button3D>
        <span className="flex-1 text-center text-lg font-black text-slate-800 dark:text-slate-100">
          {value} {unit}
        </span>
        <Button3D variant="ghost" className="px-3 py-2" onClick={() => onChange(Math.min(max, value + step))}>
          <Plus className="h-4 w-4 stroke-[3]" />
        </Button3D>
      </div>
    </div>
  );
}

function PomodoroSettings({ cfg, onChange, onClose }) {
  const set = (patch) => onChange({ ...cfg, ...patch });
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="dq-rise relative w-full max-w-md rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Ustawienia sesji</h3>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Skupienie" value={cfg.focusMin} step={5} min={10} max={90} onChange={(v) => set({ focusMin: v })} />
          <Stepper label="Przerwa" value={cfg.breakMin} step={1} min={1} max={30} onChange={(v) => set({ breakMin: v })} />
          <Stepper label="Długa przerwa" value={cfg.longBreakMin} step={5} min={5} max={60} onChange={(v) => set({ longBreakMin: v })} />
          <Stepper label="Co ile sesji" value={cfg.untilLongBreak} step={1} min={2} max={8} unit="sesji" onChange={(v) => set({ untilLongBreak: v })} />
        </div>
        <Button3D className="mt-4 w-full" onClick={onClose}>Gotowe</Button3D>
      </div>
    </div>
  );
}

export function Pomodoro({ session, cfg, focusDone, onStart, onStop, onSkip, onChangeCfg }) {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const [cat, setCat] = useState("focus");
  const [title, setTitle] = useState("");

  // Interwał tylko odświeża widok. Czas i tak liczymy z Date.now().
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [session]);

  if (session) {
    const left = remainingMs(session);
    const total = session.plannedMin * 60_000;
    const pct = total ? ((total - left) / total) * 100 : 0;
    const isFocus = session.phase === "focus";

    return (
      <section className="flex flex-col items-center pt-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {PHASES[session.phase].label}
        </p>

        <div className="relative mt-4 grid place-items-center">
          <Ring pct={pct} phase={session.phase} />
          <div className="absolute text-center">
            <p className="font-mono text-5xl font-black tabular-nums text-slate-800 dark:text-slate-100">
              {mmss(left)}
            </p>
            {isFocus && session.title && (
              <p className="mt-2 max-w-[10rem] truncate text-sm font-bold text-slate-400">{session.title}</p>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm font-bold text-slate-400 dark:text-slate-500">
          Sesje skupienia dzisiaj: {focusDone}
        </p>

        <div className="mt-4 flex w-full max-w-xs gap-2">
          <Button3D variant="ghost" className="flex-1" onClick={onStop}>
            <span className="flex items-center justify-center gap-2">
              <Square className="h-4 w-4 stroke-[3]" /> Przerwij
            </span>
          </Button3D>
          <Button3D variant="gold" className="flex-1" onClick={onSkip}>
            <span className="flex items-center justify-center gap-2">
              <SkipForward className="h-4 w-4 stroke-[3]" /> Zalicz
            </span>
          </Button3D>
        </div>

        <p className="mt-6 max-w-xs text-center text-xs font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
          Możesz zgasić ekran. Licznik liczy od znacznika czasu, nie od tykania, więc się nie rozjedzie.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Skupienie</h2>
        <Button3D variant="ghost" className="px-3 py-2 text-xs" onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Settings className="h-4 w-4 stroke-[3]" /> Ustaw
          </span>
        </Button3D>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nad czym siadasz?"
        className="w-full rounded-2xl border-2 border-b-4 border-slate-200 px-4 py-3 font-bold text-slate-800 placeholder:font-semibold placeholder:text-slate-300 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <Chip key={key} active={cat === key} onClick={() => setCat(key)} activeClass={`${c.solid} ${c.edge}`}>
            <span className="flex items-center gap-1.5">
              <c.Icon className="h-4 w-4 stroke-[2.5]" /> {c.label}
            </span>
          </Chip>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-5xl font-black text-slate-800 dark:text-slate-100">{cfg.focusMin}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">minut skupienia</p>
        <p className="mt-3 text-xs font-bold text-slate-400 dark:text-slate-500">
          Potem {cfg.breakMin} min przerwy, a co {cfg.untilLongBreak} sesji {cfg.longBreakMin} min.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button3D onClick={() => onStart("focus", { title: title.trim(), cat })}>
          <span className="flex items-center justify-center gap-2">
            <Brain className="h-5 w-5 stroke-[3]" /> Start
          </span>
        </Button3D>
        <Button3D variant="ghost" onClick={() => onStart("break", { title: "", cat: "care" })}>
          <span className="flex items-center justify-center gap-2">
            <Coffee className="h-5 w-5 stroke-[3]" /> Przerwa
          </span>
        </Button3D>
      </div>

      <p className="mt-4 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
        Sesje skupienia dzisiaj: {focusDone}
      </p>

      {open && <PomodoroSettings cfg={cfg} onChange={onChangeCfg} onClose={() => setOpen(false)} />}
    </section>
  );
}
