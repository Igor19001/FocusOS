import { useState } from "react";
import { Minus, Plus, Trash2, X, Zap } from "lucide-react";
import { Button3D, Chip } from "./ui/Button3D";
import { CATEGORIES, fmt, hours, xpFor } from "../lib/routine";

export function LogSheet({ nowMin, initial = null, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cat, setCat] = useState(initial?.cat ?? "focus");
  const [start, setStart] = useState(initial?.start ?? Math.floor(nowMin / 30) * 30);
  const [duration, setDuration] = useState(initial?.duration ?? 60);
  const draft = { title: title.trim() || CATEGORIES[cat].label, cat, start, duration, done: initial?.done ?? false };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="dq-rise relative w-full max-w-md rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Plan dnia</p><h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{initial ? "Edytuj blok" : "Dodaj blok"}</h3></div>
          <button onClick={onClose} aria-label="Zamknij" className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"><X className="h-5 w-5 stroke-[3]" /></button>
        </div>

        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Co robisz?</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Przebudowa cennika" className="mt-1.5 w-full rounded-2xl border-2 border-b-4 border-slate-200 px-4 py-3 font-bold text-slate-800 placeholder:font-semibold placeholder:text-slate-300 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600" />

        <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Kategoria</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, c]) => <Chip key={key} active={cat === key} onClick={() => setCat(key)} activeClass={`${c.solid} ${c.edge}`}><span className="flex items-center gap-1.5"><c.Icon className="h-4 w-4 stroke-[2.5]" /> {c.label}</span></Chip>)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Start</p><div className="mt-1.5 flex items-center gap-1"><Button3D variant="ghost" className="px-3 py-2" onClick={() => setStart((s) => Math.max(0, s - 30))}><Minus className="h-4 w-4 stroke-[3]" /></Button3D><span className="flex-1 text-center text-lg font-black text-slate-800 dark:text-slate-100">{fmt(start)}</span><Button3D variant="ghost" className="px-3 py-2" onClick={() => setStart((s) => Math.min(1410, s + 30))}><Plus className="h-4 w-4 stroke-[3]" /></Button3D></div></div>
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Długość</p><div className="mt-1.5 flex items-center gap-1"><Button3D variant="ghost" className="px-3 py-2" onClick={() => setDuration((d) => Math.max(15, d - 15))}><Minus className="h-4 w-4 stroke-[3]" /></Button3D><span className="flex-1 text-center text-lg font-black text-slate-800 dark:text-slate-100">{hours(duration)}</span><Button3D variant="ghost" className="px-3 py-2" onClick={() => setDuration((d) => Math.min(480, d + 15))}><Plus className="h-4 w-4 stroke-[3]" /></Button3D></div></div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-yellow-50 px-4 py-3 dark:bg-yellow-950"><span className="text-sm font-black text-yellow-800 dark:text-yellow-200">{initial ? "Wartość bloku" : "Do zgarnięcia"}</span><span className="flex items-center gap-1 text-lg font-black text-yellow-700 dark:text-yellow-300"><Zap className="h-5 w-5 fill-yellow-400 text-yellow-500" />{xpFor(draft)} XP</span></div>

        <div className="mt-4 flex gap-2">
          {initial && onDelete && <Button3D variant="danger" className="px-4" onClick={() => onDelete(initial.id)}><Trash2 className="h-4 w-4 stroke-[3]" /></Button3D>}
          <Button3D className="flex-1" onClick={() => onSave(draft)}>{initial ? "Zapisz zmiany" : "Dodaj do dnia"}</Button3D>
        </div>
      </div>
    </div>
  );
}
