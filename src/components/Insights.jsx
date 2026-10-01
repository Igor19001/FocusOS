import { useMemo } from "react";
import { BarChart3, Brain, Clock, TrendingUp } from "lucide-react";
import { CATEGORIES, hours } from "../lib/routine";

function StatCard({ Icon, label, value, sub, tone }) {
  return (
    <div className={`rounded-3xl border-2 border-b-4 p-3 ${tone}`}>
      <Icon className="h-5 w-5 stroke-[2.5] opacity-70" />
      <p className="mt-2 text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide opacity-60">{label}</p>
      {sub && <p className="mt-0.5 text-xs font-bold opacity-50">{sub}</p>}
    </div>
  );
}

function CategoryBar({ cat, planned, done, max }) {
  const meta = CATEGORIES[cat];
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${meta.soft} ${meta.text}`}>
        <meta.Icon className="h-4 w-4 stroke-[2.5]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400">
          <span>{meta.label}</span>
          <span>
            {hours(done)} <span className="text-slate-300 dark:text-slate-600">/ {hours(planned)}</span>
          </span>
        </div>
        <div className="mt-1 h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={`h-full rounded-full ${meta.faint}`} style={{ width: `${(planned / max) * 100}%` }}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${meta.solid}`}
              style={{ width: planned ? `${(done / planned) * 100}%` : 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Insights({ blocks, score, focusShare, doneMin }) {
  const byCat = useMemo(() => {
    const acc = {};
    blocks.forEach((b) => {
      acc[b.cat] ??= { planned: 0, done: 0 };
      acc[b.cat].planned += b.duration;
      if (b.done) acc[b.cat].done += b.duration;
    });
    return acc;
  }, [blocks]);

  const max = Math.max(1, ...Object.values(byCat).map((v) => v.planned));

  return (
    <section>
      <h2 className="mb-3 text-lg font-black text-slate-800 dark:text-slate-100">Jak leci dzień</h2>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          Icon={TrendingUp}
          label="Wynik dnia"
          value={score}
          sub={score >= 80 ? "Równo" : score >= 50 ? "Idzie" : "Słabo"}
          tone="border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-900 dark:bg-lime-950 dark:text-lime-200"
        />
        <StatCard
          Icon={Brain}
          label="Skupienie"
          value={`${focusShare}%`}
          sub="zalogowanego czasu"
          tone="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
        />
        <StatCard
          Icon={Clock}
          label="Zrobione"
          value={hours(doneMin)}
          sub="dzisiaj"
          tone="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200"
        />
      </div>

      <div className="mt-3 space-y-3 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <BarChart3 className="h-4 w-4" /> Plan kontra wykonanie
        </p>
        {Object.keys(byCat).length === 0 ? (
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
            Dodaj blok, żeby zobaczyć rozbicie.
          </p>
        ) : (
          Object.entries(byCat).map(([cat, v]) => (
            <CategoryBar key={cat} cat={cat} planned={v.planned} done={v.done} max={max} />
          ))
        )}
      </div>
    </section>
  );
}
