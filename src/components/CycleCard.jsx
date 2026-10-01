import { useState } from "react";
import { AlarmClock, Bed, TriangleAlert } from "lucide-react";
import { Chip } from "./ui/Button3D";
import { fmt, hours } from "../lib/routine";
import { bedOptions, cycleLabel, scheduleFit, wakeOptions } from "../lib/cycles";

function Row({ highlight, cycles, at, totalMin, prefix }) {
  return (
    <li
      className={[
        "flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-colors",
        highlight
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="text-xl font-black leading-none text-slate-800 dark:text-slate-100">
          {prefix} {fmt(at)}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
          {cycleLabel(cycles)} · {hours(totalMin)} w łóżku
        </p>
      </div>
      {highlight && (
        <span className="shrink-0 rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-black text-white">
          celuj tu
        </span>
      )}
    </li>
  );
}

export function CycleCard({ nowMin, settings }) {
  const [mode, setMode] = useState("wake"); // "wake" = kładę się teraz, "bed" = wstaję o
  const cfg = { fallAsleep: settings.fallAsleep, cycleMin: settings.cycleMin };

  const fit = scheduleFit(settings.bedtime, settings.wake, cfg);
  const rows =
    mode === "wake"
      ? wakeOptions(nowMin, cfg).map((o) => ({ ...o, prefix: "Wstań" }))
      : bedOptions(settings.wake, cfg).map((o) => ({ ...o, prefix: "Połóż się" }));

  // Podświetlamy 5 cykli — 7,5 h to najczęściej trafiony wybór dla dorosłego.
  const best = 5;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Cykle snu</h2>
        <div className="flex gap-1.5">
          <Chip active={mode === "wake"} onClick={() => setMode("wake")} activeClass="bg-indigo-500 border-indigo-700">
            <span className="flex items-center gap-1.5">
              <Bed className="h-3.5 w-3.5 stroke-[2.5]" /> Kładę się teraz
            </span>
          </Chip>
          <Chip active={mode === "bed"} onClick={() => setMode("bed")} activeClass="bg-indigo-500 border-indigo-700">
            <span className="flex items-center gap-1.5">
              <AlarmClock className="h-3.5 w-3.5 stroke-[2.5]" /> Wstaję {fmt(settings.wake)}
            </span>
          </Chip>
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map((o) => (
          <Row key={o.cycles} highlight={o.cycles === best} {...o} />
        ))}
      </ul>

      {!fit.onCycle && (
        <div className="mt-3 flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 stroke-[2.5] text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold leading-relaxed text-amber-900 dark:text-amber-200">
            Twój plan {fmt(settings.bedtime)}–{fmt(settings.wake)} to {cycleLabel(fit.cycles)}, czyli budzik
            wypada w środku cyklu. Przesuń pobudkę na {fit.nearest.map((m) => fmt(m)).join(" albo ")}, żeby
            trafić w koniec.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
        Liczone od zaśnięcia: {settings.fallAsleep} min na zaśnięcie plus cykle po {settings.cycleMin} min.
        Obie liczby zmienisz w ustawieniach snu.
      </p>
    </section>
  );
}
