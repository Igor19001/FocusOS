import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Lock, Pencil, Plus, Trash2, X, TriangleAlert, Wallet, Target,
} from "lucide-react";
import { Button3D, Chip } from "./ui/Button3D";
import { fetchFx, fetchPrices } from "../lib/prices";
import {
  MODES, SEED_ACCOUNTS, goalPlan, plnExact, plnFmt, summarize, symbolsNeeded,
} from "../lib/networth";

const CURRENCIES = ["PLN", "EUR", "USD"];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "mt-1 w-full rounded-2xl border-2 border-b-4 border-slate-200 px-3 py-2.5 font-bold text-slate-800 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function AccountEditor({ acc, onSave, onDelete, onClose }) {
  const [d, setD] = useState({ ...acc });
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const num = (v) => (v === "" ? "" : Number(v));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="dq-rise relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Pozycja</h3>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        <Field label="Nazwa">
          <input className={inputCls} value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Sposób liczenia
        </p>
        <div className="mt-1.5 flex gap-2">
          {Object.entries(MODES).map(([key, label]) => (
            <Chip key={key} active={d.mode === key} onClick={() => set({ mode: key })} activeClass="bg-lime-500 border-lime-700">
              {label}
            </Chip>
          ))}
        </div>

        {d.mode === "amount" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Kwota">
              <input
                className={inputCls} type="number" inputMode="decimal" step="0.01"
                value={d.amount ?? ""} onChange={(e) => set({ amount: num(e.target.value) })}
              />
            </Field>
            <Field label="Waluta">
              <select className={inputCls} value={d.currency ?? "PLN"} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Symbol">
                <input
                  className={inputCls} value={d.symbol ?? ""}
                  onChange={(e) => set({ symbol: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Ilość">
                <input
                  className={inputCls} type="number" inputMode="decimal" step="any"
                  value={d.qty ?? ""} onChange={(e) => set({ qty: num(e.target.value) })}
                />
              </Field>
            </div>

            <label className="mt-3 flex items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">Cena ręcznie</span>
              <input
                type="checkbox" className="h-6 w-6 accent-lime-500"
                checked={d.manualPrice != null}
                onChange={(e) => set({ manualPrice: e.target.checked ? (d.manualPrice ?? 0) : null })}
              />
            </label>

            {d.manualPrice != null && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Cena za sztukę">
                  <input
                    className={inputCls} type="number" inputMode="decimal" step="any"
                    value={d.manualPrice ?? ""} onChange={(e) => set({ manualPrice: num(e.target.value) })}
                  />
                </Field>
                <Field label="Waluta ceny">
                  <select
                    className={inputCls} value={d.priceCurrency ?? "PLN"}
                    onChange={(e) => set({ priceCurrency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </>
        )}

        <label className="mt-4 flex items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Dostępne od ręki</span>
          <input
            type="checkbox" className="h-6 w-6 accent-lime-500"
            checked={!!d.liquid} onChange={(e) => set({ liquid: e.target.checked })}
          />
        </label>

        {!d.liquid && (
          <Field label="Odblokowanie (opcjonalnie)">
            <input
              className={inputCls} type="date" value={d.unlockDate ?? ""}
              onChange={(e) => set({ unlockDate: e.target.value })}
            />
          </Field>
        )}

        <div className="mt-5 flex gap-2">
          {onDelete && (
            <Button3D variant="danger" className="px-4" onClick={() => onDelete(acc.id)}>
              <Trash2 className="h-4 w-4 stroke-[3]" />
            </Button3D>
          )}
          <Button3D className="flex-1" onClick={() => onSave(d)}>Zapisz</Button3D>
        </div>
      </div>
    </div>
  );
}

function Row({ row, onEdit }) {
  const { value } = row;
  return (
    <li>
      <button
        onClick={() => onEdit(row)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 text-left transition-transform active:translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-black text-slate-800 dark:text-slate-100">
            {!row.liquid && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            {row.name}
          </p>
          <p className="truncate text-xs font-bold text-slate-400 dark:text-slate-500">
            {row.mode === "amount"
              ? `${row.amount ?? 0} ${row.currency}`
              : `${row.qty ?? 0} ${row.symbol}${value.manual ? " · cena ręczna" : value.source ? ` · ${value.source}` : ""}`}
            {row.unlockDate ? ` · do ${row.unlockDate}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-black ${value.pln == null ? "text-rose-500" : "text-slate-800 dark:text-slate-100"}`}>
            {value.pln == null ? "—" : plnFmt(value.pln)}
          </p>
          <Pencil className="ml-auto mt-1 h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
        </div>
      </button>
    </li>
  );
}

export function Networth({ finance, onChange }) {
  const accounts = finance.accounts?.length ? finance.accounts : SEED_ACCOUNTS;
  const [prices, setPrices] = useState(finance.prices ?? {});
  const [fx, setFx] = useState(finance.fx ?? { PLN: 1 });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hideGoal, setHideGoal] = useState(false);

  const { rows, total, liquid, locked, missing } = useMemo(
    () => summarize(accounts, prices, fx),
    [accounts, prices, fx]
  );

  const refresh = async () => {
    setBusy(true);
    const [newFx, newPrices] = await Promise.all([
      fetchFx(),
      fetchPrices(symbolsNeeded(accounts), { demoKey: finance.coingeckoKey }),
    ]);
    setFx(newFx);
    setPrices(newPrices);
    onChange({ ...finance, accounts, fx: newFx, prices: newPrices, fetchedAt: Date.now() });
    setBusy(false);
  };

  // Pierwsze wejście: pobierz kursy, żeby suma nie była pusta.
  useEffect(() => {
    if (!finance.fetchedAt) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAccount = (acc) => {
    const next = accounts.some((a) => a.id === acc.id)
      ? accounts.map((a) => (a.id === acc.id ? acc : a))
      : [...accounts, acc];
    onChange({ ...finance, accounts: next });
    setEditing(null);
  };

  const deleteAccount = (id) => {
    onChange({ ...finance, accounts: accounts.filter((a) => a.id !== id) });
    setEditing(null);
  };

  const goal = finance.goals ?? {};
  const plan = goalPlan({ target: goal.netWorth, current: total, deadline: goal.deadline });

  return (
    <div className="space-y-6">
      {/* suma */}
      <section className="rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Majątek razem
            </p>
            <p className="mt-1 text-4xl font-black leading-none text-slate-800 dark:text-slate-100">
              {plnExact(total)}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={busy}
            aria-label="Odśwież ceny"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`h-5 w-5 stroke-[2.5] ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-lime-50 p-3 dark:bg-lime-950">
            <p className="text-xs font-black uppercase tracking-wide text-lime-700 dark:text-lime-400">
              Od ręki
            </p>
            <p className="mt-0.5 text-xl font-black text-lime-800 dark:text-lime-200">{plnFmt(liquid)}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-700">
            <p className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Lock className="h-3 w-3" /> Zablokowane
            </p>
            <p className="mt-0.5 text-xl font-black text-slate-700 dark:text-slate-200">{plnFmt(locked)}</p>
          </div>
        </div>

        {finance.fetchedAt && (
          <p className="mt-3 text-xs font-bold text-slate-400 dark:text-slate-500">
            Ceny z {new Date(finance.fetchedAt).toLocaleString("pl-PL")} · kursy NBP
          </p>
        )}
      </section>

      {missing.length > 0 && (
        <div className="flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 stroke-[2.5] text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold leading-relaxed text-amber-900 dark:text-amber-200">
            Nie policzyłem: {missing.map((m) => `${m.name} (${m.reason})`).join(", ")}. Wejdź w pozycję
            i włącz cenę ręczną — reszta sumy jest poprawna.
          </p>
        </div>
      )}

      {/* cel */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">
            <Target className="h-5 w-5 stroke-[2.5]" /> Cel
          </h2>
          <Button3D variant="ghost" className="px-3 py-2 text-xs" onClick={() => setHideGoal((v) => !v)}>
            {hideGoal ? "Pokaż" : "Ustaw"}
          </Button3D>
        </div>

        {!hideGoal && (
          <div className="grid grid-cols-2 gap-3 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Field label="Cel majątku (PLN)">
              <input
                className={inputCls} type="number" inputMode="decimal"
                value={goal.netWorth ?? ""}
                onChange={(e) =>
                  onChange({ ...finance, goals: { ...goal, netWorth: e.target.value === "" ? null : Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Termin">
              <input
                className={inputCls} type="date" value={goal.deadline ?? ""}
                onChange={(e) => onChange({ ...finance, goals: { ...goal, deadline: e.target.value || null } })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Cel zarobkowy miesięcznie (PLN)">
                <input
                  className={inputCls} type="number" inputMode="decimal"
                  value={goal.monthlyIncome ?? ""}
                  onChange={(e) =>
                    onChange({ ...finance, goals: { ...goal, monthlyIncome: e.target.value === "" ? null : Number(e.target.value) } })
                  }
                />
              </Field>
            </div>
          </div>
        )}

        {plan && !plan.done && plan.days && (
          <div className="mt-3 rounded-3xl border-2 border-b-4 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950">
            <div className="h-3 overflow-hidden rounded-full bg-white/60 dark:bg-slate-800">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${plan.pct}%` }} />
            </div>
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              {plan.pct}% celu · brakuje {plnFmt(plan.gap)} w {plan.days} dni
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Rocznie", plan.perYear], ["Miesięcznie", plan.perMonth], ["Dziennie", plan.perDay],
              ].map(([label, v]) => (
                <div key={label}>
                  <p className="text-lg font-black leading-none text-indigo-900 dark:text-indigo-100">{plnFmt(v)}</p>
                  <p className="mt-1 text-xs font-bold text-indigo-500 dark:text-indigo-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {plan?.done && (
          <p className="mt-3 rounded-2xl bg-lime-100 p-3 text-sm font-black text-lime-800 dark:bg-lime-950 dark:text-lime-200">
            Cel osiągnięty. Ustaw wyższy.
          </p>
        )}
      </section>

      {/* konta */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">
            <Wallet className="h-5 w-5 stroke-[2.5]" /> Konta
          </h2>
          <Button3D
            variant="ghost" className="px-3 py-2 text-xs"
            onClick={() => setEditing({ id: `acc-${Date.now()}`, name: "", mode: "amount", currency: "PLN", amount: 0, liquid: true })}
          >
            <span className="flex items-center gap-1.5"><Plus className="h-4 w-4 stroke-[3]" /> Dodaj</span>
          </Button3D>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 px-6 py-8 text-center dark:border-slate-600">
            <p className="font-black text-slate-700 dark:text-slate-200">Nie ma jeszcze żadnych pozycji</p>
            <p className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">DayQuest 5 nie wpisuje prywatnych sald na sztywno. Dodaj tylko to, co chcesz śledzić.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => <Row key={r.id} row={r} onEdit={setEditing} />)}
          </ul>
        )}
      </section>

      <p className="text-xs font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
        Ceny bez żadnego klucza: Binance, a czego Binance nie notuje — CoinGecko. Kursy walut z NBP.
        Każdą kwotę i każdą cenę możesz nadpisać ręcznie.
      </p>

      {editing && (
        <AccountEditor
          acc={editing}
          onSave={saveAccount}
          onDelete={accounts.some((a) => a.id === editing.id) ? deleteAccount : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
