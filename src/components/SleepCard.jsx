import { useState } from "react";
import { Moon, Sunrise, Settings, X, BellRing, BellOff, Minus, Plus } from "lucide-react";
import { Button3D } from "./ui/Button3D";
import { fmt, hours } from "../lib/routine";
import { PHASE, sleepInfo } from "../lib/sleep";

const TONE = {
  [PHASE.DAY]: {
    wrap: "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950",
    text: "text-indigo-800 dark:text-indigo-200",
    dim: "text-indigo-500 dark:text-indigo-400",
  },
  [PHASE.WARNING]: {
    wrap: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
    text: "text-amber-900 dark:text-amber-100",
    dim: "text-amber-600 dark:text-amber-400",
  },
  [PHASE.NIGHT]: {
    wrap: "border-slate-700 bg-slate-900",
    text: "text-slate-100",
    dim: "text-slate-400",
  },
};

function Stepper({ label, value, onChange, step = 15, format = fmt }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <Button3D variant="ghost" className="px-3 py-2" onClick={() => onChange(value - step)}>
          <Minus className="h-4 w-4 stroke-[3]" />
        </Button3D>
        <span className="flex-1 text-center text-lg font-black text-slate-800 dark:text-slate-100">
          {format(value)}
        </span>
        <Button3D variant="ghost" className="px-3 py-2" onClick={() => onChange(value + step)}>
          <Plus className="h-4 w-4 stroke-[3]" />
        </Button3D>
      </div>
    </div>
  );
}

function SleepSettings({ settings, onChange, onClose }) {
  const wrap = (m) => ((m % 1440) + 1440) % 1440;
  const set = (patch) => onChange({ ...settings, ...patch });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="dq-rise relative w-full max-w-md rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Sen i przypomnienia</h3>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Sen" value={settings.bedtime} onChange={(v) => set({ bedtime: wrap(v) })} />
          <Stepper label="Pobudka" value={settings.wake} onChange={(v) => set({ wake: wrap(v) })} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stepper
            label="Ostrzeżenie"
            value={settings.warnBefore}
            step={15}
            format={(v) => hours(v) + " przed"}
            onChange={(v) => set({ warnBefore: Math.min(180, Math.max(15, v)) })}
          />
          <Stepper
            label="Przypomnienie o logowaniu"
            value={settings.logReminder}
            step={30}
            onChange={(v) => set({ logReminder: wrap(v) })}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stepper
            label="Zasypianie"
            value={settings.fallAsleep}
            step={5}
            format={(v) => `${v} min`}
            onChange={(v) => set({ fallAsleep: Math.min(60, Math.max(0, v)) })}
          />
          <Stepper
            label="Długość cyklu"
            value={settings.cycleMin}
            step={5}
            format={(v) => `${v} min`}
            onChange={(v) => set({ cycleMin: Math.min(120, Math.max(60, v)) })}
          />
        </div>

        <label className="mt-4 flex items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Wygaszanie po godzinie snu</span>
          <input
            type="checkbox"
            checked={settings.windDown}
            onChange={(e) => set({ windDown: e.target.checked })}
            className="h-6 w-6 accent-lime-500"
          />
        </label>

        <label className="mt-2 flex items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600">
          <span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            {settings.notifications ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Powiadomienia
          </span>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => set({ notifications: e.target.checked })}
            className="h-6 w-6 accent-lime-500"
          />
        </label>

        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
          Powiadomienia działają offline, bez serwera. Jeśli przestaną przychodzić, wyłącz
          optymalizację baterii dla DayQuest w ustawieniach Androida.
        </p>

        <Button3D className="mt-4 w-full" onClick={onClose}>
          Gotowe
        </Button3D>
      </div>
    </div>
  );
}

export function SleepCard({ nowMin, settings, onChangeSettings }) {
  const [open, setOpen] = useState(false);
  const info = sleepInfo(nowMin, settings);
  const tone = TONE[info.phase];

  const headline =
    info.phase === PHASE.NIGHT
      ? "Powinieneś już spać"
      : info.phase === PHASE.WARNING
      ? "Zwijaj się"
      : "Do snu";

  const value =
    info.phase === PHASE.NIGHT ? hours(info.minutesToWake) : hours(info.minutesToBed);

  const sub =
    info.phase === PHASE.NIGHT
      ? `Pobudka ${fmt(settings.wake)}. Tyle snu zostało, jeśli położysz się teraz.`
      : `Sen ${fmt(settings.bedtime)}, pobudka ${fmt(settings.wake)}. Pełne okno to ${hours(info.windowLength)}.`;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Zegar snu</h2>
        <Button3D variant="ghost" className="px-3 py-2 text-xs" onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Settings className="h-4 w-4 stroke-[3]" /> Ustaw
          </span>
        </Button3D>
      </div>

      <div className={`rounded-3xl border-2 border-b-4 p-4 ${tone.wrap}`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/60 dark:bg-white/10 ${tone.text}`}>
            {info.phase === PHASE.NIGHT ? (
              <Sunrise className="h-6 w-6 stroke-[2.5]" />
            ) : (
              <Moon className="h-6 w-6 stroke-[2.5]" />
            )}
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-black uppercase tracking-widest ${tone.dim}`}>{headline}</p>
            <p className={`text-3xl font-black leading-tight ${tone.text}`}>{value}</p>
          </div>
        </div>
        <p className={`mt-3 text-xs font-bold leading-relaxed ${tone.dim}`}>{sub}</p>
      </div>

      {open && (
        <SleepSettings settings={settings} onChange={onChangeSettings} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
