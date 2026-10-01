import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { dayKey, shiftDay } from "../lib/time";
import { hours } from "../lib/routine";
import { STREAK_THRESHOLD } from "../lib/routine";

const MIESIACE = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DNI = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** Cztery progi zamiast gradientu — na siatce 7×5 odcienie i tak są nieczytelne. */
function tone(score) {
  if (score == null) return "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600";
  if (score >= 80) return "bg-lime-500 text-white";
  if (score >= STREAK_THRESHOLD) return "bg-lime-300 text-lime-900 dark:bg-lime-700 dark:text-lime-50";
  if (score > 0) return "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-50";
  return "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-50";
}

export function HistoryCalendar({ history, today }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState(null);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    // getDay(): 0 = niedziela. W Polsce tydzień zaczyna się w poniedziałek.
    const lead = (first.getDay() + 6) % 7;
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(dayKey(new Date(cursor.y, cursor.m, d)));
    }
    return out;
  }, [cursor]);

  const monthStats = useMemo(() => {
    const keys = cells.filter(Boolean).filter((k) => history[k]);
    const scored = keys.map((k) => history[k].score ?? 0);
    const hit = scored.filter((s) => s >= STREAK_THRESHOLD).length;
    const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
    return { logged: keys.length, hit, avg };
  }, [cells, history]);

  const shift = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setPicked(null);
  };

  const detail = picked ? history[picked] : null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label="Poprzedni miesiąc"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-800 dark:text-slate-400"
        >
          <ChevronLeft className="h-5 w-5 stroke-[3]" />
        </button>
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
          {MIESIACE[cursor.m]} {cursor.y}
        </h2>
        <button
          onClick={() => shift(1)}
          aria-label="Następny miesiąc"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-800 dark:text-slate-400"
        >
          <ChevronRight className="h-5 w-5 stroke-[3]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DNI.map((d) => (
          <p key={d} className="pb-1 text-center text-xs font-black uppercase text-slate-400 dark:text-slate-600">
            {d}
          </p>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`x${i}`} />;
          const day = history[key];
          const score = day ? day.score ?? 0 : null;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => setPicked(picked === key ? null : key)}
              className={[
                "aspect-square rounded-xl text-sm font-black transition-transform active:scale-95",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300",
                tone(score),
                isToday ? "ring-2 ring-slate-800 dark:ring-slate-200" : "",
                picked === key ? "ring-2 ring-indigo-500" : "",
              ].join(" ")}
            >
              {Number(key.slice(-2))}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Dni zalogowanych", value: monthStats.logged },
          { label: "Dni na serię", value: monthStats.hit },
          { label: "Średni wynik", value: monthStats.avg },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-2xl font-black leading-none text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {picked && (
        <div className="dq-pop mt-4 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{picked}</p>
          {detail ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                Wynik {detail.score ?? 0}
                {(detail.score ?? 0) >= STREAK_THRESHOLD && (
                  <Flame className="h-4 w-4 fill-orange-400 text-orange-500" />
                )}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-400 dark:text-slate-500">
                {(detail.blocks ?? []).filter((b) => b.done).length} z {(detail.blocks ?? []).length} bloków ·{" "}
                {hours((detail.blocks ?? []).filter((b) => b.done).reduce((s, b) => s + b.duration, 0))}
                {detail.focusDone ? ` · ${detail.focusDone} sesji skupienia` : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-slate-400 dark:text-slate-500">Nic nie zalogowane.</p>
          )}
        </div>
      )}
    </section>
  );
}
