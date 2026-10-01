import { Check, Clock, Pencil, Plus, Zap } from "lucide-react";
import { Button3D } from "./ui/Button3D";
import { CATEGORIES, fmt, xpFor } from "../lib/routine";

function BlockNode({ block, isNext, nowMin, onToggle, onEdit }) {
  const cat = CATEGORIES[block.cat] ?? CATEGORIES.focus;
  const { Icon } = cat;
  const overdue = !block.done && block.start + block.duration < nowMin;

  return (
    <li className="dq-pop relative flex items-stretch gap-4 pb-3">
      <div className="relative z-10 flex w-14 shrink-0 justify-center">
        <button
          onClick={() => onToggle(block.id)}
          aria-pressed={block.done}
          aria-label={`${block.done ? "Cofnij" : "Odhacz"} ${block.title}`}
          className={[
            "mt-1 grid h-14 w-14 place-items-center rounded-3xl border-b-4 transition-all duration-150",
            "hover:-translate-y-0.5 active:translate-y-1 active:border-b-0",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300",
            block.done ? "border-lime-700 bg-lime-500 text-white" : `${cat.solid} ${cat.edge} text-white`,
            isNext && !block.done ? "dq-halo" : "",
          ].join(" ")}
        >
          {block.done ? <Check className="h-7 w-7 stroke-[3.5]" /> : <Icon className="h-6 w-6 stroke-[2.5]" />}
        </button>
      </div>

      <div
        className={[
          "group flex min-w-0 flex-1 items-start gap-2 rounded-3xl border-2 border-b-4 px-4 py-3 transition-all duration-150",
          block.done
            ? "border-lime-200 bg-lime-50 dark:border-lime-900 dark:bg-lime-950"
            : overdue
            ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950"
            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`truncate font-black ${
                block.done
                  ? "text-lime-800 line-through decoration-2 dark:text-lime-300"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {block.title}
            </p>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-xs font-black ${
                block.done
                  ? "bg-lime-500 text-white"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              {xpFor(block)}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmt(block.start)}–{fmt(block.start + block.duration)}</span>
            <span className={`rounded-full px-2 py-0.5 ${cat.soft} ${cat.text}`}>{cat.label}</span>
            {isNext && !block.done && <span className="rounded-full bg-lime-500 px-2 py-0.5 text-white">Teraz</span>}
            {overdue && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-white">Przepadło</span>}
          </p>
        </div>
        <button
          onClick={() => onEdit(block)}
          aria-label={`Edytuj ${block.title}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <Pencil className="h-4 w-4 stroke-[2.7]" />
        </button>
      </div>
    </li>
  );
}

export function DayPath({ blocks, nowMin, onToggle, onOpenLog, onEdit }) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const nextId = sorted.find((b) => !b.done)?.id;
  const doneRatio = blocks.length ? blocks.filter((b) => b.done).length / blocks.length : 0;

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Dzisiejsza ścieżka</h2>
          {blocks.length > 0 && <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Dotknij ołówka, żeby zmienić plan.</p>}
        </div>
        <Button3D variant="ghost" className="px-3 py-2 text-xs" onClick={onOpenLog}>
          <span className="flex items-center gap-1.5"><Plus className="h-4 w-4 stroke-[3]" /> Dodaj blok</span>
        </Button3D>
      </div>

      <div className="relative">
        <div className="absolute bottom-6 left-7 top-6 w-2 -translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="absolute left-7 top-6 w-2 -translate-x-1/2 rounded-full bg-lime-500 transition-all duration-500" style={{ height: `calc((100% - 48px) * ${doneRatio})` }} />

        {sorted.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="font-black text-slate-700 dark:text-slate-200">Dzień jest jeszcze pusty</p>
            <p className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">Dodaj pierwszy blok i zacznij zbierać XP.</p>
          </div>
        ) : (
          <ul className="relative">
            {sorted.map((b) => <BlockNode key={b.id} block={b} nowMin={nowMin} isNext={b.id === nextId} onToggle={onToggle} onEdit={onEdit} />)}
          </ul>
        )}
      </div>
    </section>
  );
}
