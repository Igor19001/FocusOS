import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GameHUD from "./GameHUD";
import { useWeb3 } from "./Web3Provider";

type LiveLogItem = { id: number; text: string; ts: number };

export default function App() {
  const { t, i18n } = useTranslation();
  const { mode, address, fcsBalance, setMode, claimTestFCS } = useWeb3();
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [liveLog, setLiveLog] = useState<LiveLogItem[]>([]);
  const [waterSlotsUsed, setWaterSlotsUsed] = useState(0);

  const fatigueEfficiency = useMemo(() => {
    const lambda = -Math.log(0.75) / 90;
    return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
  }, [sessionMinutes]);

  const addLiveEntry = () => {
    if (!liveText.trim()) return;
    setLiveLog((prev) => [{ id: Date.now(), text: liveText.trim(), ts: Date.now() }, ...prev]);
    setLiveText("");
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      {!mode && (
        <section className="mx-auto mt-16 max-w-3xl rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-cyan-300">FocusOS Dual Mode</h1>
          <p className="mt-2 text-sm text-slate-400">{t("landingDescription")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button onClick={() => setMode("local")} className="rounded-md border border-slate-600 px-4 py-3 hover:border-cyan-400">{t("localDemo")}</button>
            <button onClick={() => setMode("monad")} className="rounded-md border border-cyan-500 px-4 py-3 text-cyan-300 hover:bg-cyan-500/10">{t("connectMonad")}</button>
          </div>
        </section>
      )}

      {mode && (
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Mode: {mode === "monad" ? `Monad ${address?.slice(0, 8)}...` : "Local Offline"}</div>
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="pl">Polski</option>
              <option value="es">Español</option>
            </select>
          </header>

          <GameHUD mode={mode} address={address} fcsBalance={fcsBalance} fatigueEfficiency={fatigueEfficiency} onClaimFaucet={claimTestFCS} />

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h3 className="mb-2 text-sm uppercase tracking-[0.18em] text-slate-400">Live Log</h3>
            <div className="flex gap-2">
              <input
                value={liveText}
                onChange={(e) => setLiveText(e.target.value)}
                placeholder={t("liveLogPlaceholder")}
                className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2"
              />
              <button onClick={addLiveEntry} className="rounded border border-cyan-500 px-3 py-2 text-cyan-300">Add</button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {liveLog.map((entry) => <div key={entry.id} className="rounded border border-slate-800 p-2">{entry.text}</div>)}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <button onClick={() => setSessionRunning((v) => !v)} className="rounded border border-slate-600 px-3 py-2">
              {sessionRunning ? "Stop Session" : "Start Session"}
            </button>
            <button
              onClick={() => setSessionMinutes((v) => v + 15)}
              className="ml-2 rounded border border-slate-600 px-3 py-2"
            >
              Simulate +15 min
            </button>
            <button
              onClick={() => setWaterSlotsUsed((v) => Math.min(12, v + 1))}
              className="ml-2 rounded border border-slate-600 px-3 py-2"
            >
              Water Slot {waterSlotsUsed}/12
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
