import { useMemo, useState } from "react";
import { Pin, PinOff, Search, Trash2, X, Plus } from "lucide-react";
import { Button3D } from "./ui/Button3D";

const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Pierwsza linia robi za tytuł — bez osobnego pola na tytuł. */
const titleOf = (text) => (text.split("\n")[0] || "Bez tytułu").slice(0, 80);

function Editor({ note, onSave, onDelete, onClose }) {
  const [text, setText] = useState(note.text ?? "");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="dq-rise relative w-full max-w-md rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Notatka</h3>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        <textarea
          autoFocus
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pierwsza linia zrobi za tytuł."
          className="w-full resize-none rounded-2xl border-2 border-b-4 border-slate-200 px-4 py-3 font-semibold leading-relaxed text-slate-800 placeholder:text-slate-300 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
        />

        <div className="mt-4 flex gap-2">
          {onDelete && (
            <Button3D variant="danger" className="px-4" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-4 w-4 stroke-[3]" />
            </Button3D>
          )}
          <Button3D
            className="flex-1"
            disabled={!text.trim()}
            onClick={() => onSave({ ...note, text: text.trim(), updatedAt: Date.now() })}
          >
            Zapisz
          </Button3D>
        </div>
      </div>
    </div>
  );
}

export function Notes({ notes, onChange }) {
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...notes]
      .filter((n) => !needle || n.text.toLowerCase().includes(needle))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  }, [notes, q]);

  const save = (note) => {
    onChange(notes.some((n) => n.id === note.id) ? notes.map((n) => (n.id === note.id ? note : n)) : [note, ...notes]);
    setEditing(null);
  };

  const remove = (id) => {
    onChange(notes.filter((n) => n.id !== id));
    setEditing(null);
  };

  const togglePin = (id) =>
    onChange(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Notatki</h2>
        <Button3D
          variant="ghost"
          className="px-3 py-2 text-xs"
          onClick={() => setEditing({ id: Date.now(), text: "", createdAt: Date.now(), updatedAt: Date.now(), pinned: false })}
        >
          <span className="flex items-center gap-1.5"><Plus className="h-4 w-4 stroke-[3]" /> Nowa</span>
        </Button3D>
      </div>

      {notes.length > 3 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj"
            className="w-full rounded-2xl border-2 border-slate-200 py-2.5 pl-9 pr-3 font-bold text-slate-800 placeholder:font-semibold placeholder:text-slate-300 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-600">
          <p className="font-black text-slate-700 dark:text-slate-200">
            {q ? "Nic nie pasuje" : "Pusto"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">
            {q ? "Spróbuj innego słowa." : "Wrzuć tu myśl, zanim ucieknie."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <button onClick={() => setEditing(n)} className="min-w-0 flex-1 text-left focus:outline-none">
                <p className="truncate font-black text-slate-800 dark:text-slate-100">{titleOf(n.text)}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-400 dark:text-slate-500">
                  {fmtDate(n.updatedAt)}
                  {n.text.includes("\n") ? ` · ${n.text.split("\n").length} linii` : ""}
                </p>
              </button>
              <button
                onClick={() => togglePin(n.id)}
                aria-label={n.pinned ? "Odepnij" : "Przypnij"}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 ${
                  n.pinned ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" : "text-slate-300 dark:text-slate-600"
                }`}
              >
                {n.pinned ? <Pin className="h-4 w-4 stroke-[2.5]" /> : <PinOff className="h-4 w-4 stroke-[2.5]" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor
          note={editing}
          onSave={save}
          onDelete={notes.some((n) => n.id === editing.id) ? remove : null}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
