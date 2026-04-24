import { AnimatePresence, motion } from "framer-motion";
import { Gauge, LayoutDashboard, Settings, ShieldCheck, ShoppingBag, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BackgroundScene from "./BackgroundScene";
import FocusTutorial from "./FocusTutorial";
import GameHUD from "./GameHUD";
import { useWeb3 } from "./Web3Provider";

type LiveLogItem = { id: number; text: string; ts: number };
type Tab = "dashboard" | "shop" | "admin" | "settings";

export default function App() {
  const { t, i18n } = useTranslation();
  const { mode, address, fcsBalance, setMode, claimTestFCS, buyFCS, sellFCS, adminMint, adminWallet } = useWeb3();
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [liveLog, setLiveLog] = useState<LiveLogItem[]>([]);
  const [waterSlotsUsed, setWaterSlotsUsed] = useState(0);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [buyAmount, setBuyAmount] = useState(50);
  const [sellAmount, setSellAmount] = useState(20);
  const [mintAmount, setMintAmount] = useState(200);
  const [txMessage, setTxMessage] = useState("");

  const fatigueEfficiency = useMemo(() => {
    const lambda = -Math.log(0.75) / 90;
    return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
  }, [sessionMinutes]);
  const isAdmin = Boolean(address && address.toLowerCase() === adminWallet.toLowerCase());

  const addLiveEntry = () => {
    if (!liveText.trim()) return;
    setLiveLog((prev) => [{ id: Date.now(), text: liveText.trim(), ts: Date.now() }, ...prev]);
    setLiveText("");
  };

  const resetProgress = () => {
    localStorage.clear();
    window.location.reload();
  };

  const runBuy = async () => {
    await buyFCS(buyAmount);
    setTxMessage(`Zakupiono ${buyAmount} FCS`);
  };

  const runSell = async () => {
    await sellFCS(sellAmount);
    setTxMessage(`Sprzedano ${sellAmount} FCS`);
  };

  const runMint = async () => {
    await adminMint(address || adminWallet, mintAmount);
    setTxMessage(`Admin mint: ${mintAmount} FCS`);
  };

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "shop" as const, label: "Sklep", icon: ShoppingBag },
    { key: "admin" as const, label: "Admin", icon: ShieldCheck },
    { key: "settings" as const, label: "Ustawienia", icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <BackgroundScene />
      <FocusTutorial />
      {!mode && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-16 max-w-3xl rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-8"
        >
          <h1 className="text-3xl font-semibold text-cyan-300">FocusOS Dual Mode</h1>
          <p className="mt-2 text-sm text-slate-400">{t("landingDescription")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button onClick={() => setMode("local")} className="rounded-md border border-slate-600 px-4 py-3 hover:border-cyan-400">{t("localDemo")}</button>
            <button onClick={() => setMode("monad")} className="rounded-md border border-cyan-500 px-4 py-3 text-cyan-300 hover:bg-cyan-500/10">{t("connectMonad")}</button>
          </div>
        </motion.section>
      )}

      {mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto max-w-6xl space-y-4"
        >
          <header className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Wallet size={14} />
              Mode: {mode === "monad" ? `Monad ${address?.slice(0, 8)}...` : "Local Offline"}
            </div>
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

          <nav className="flex flex-wrap gap-2">
            {tabs.filter((x) => x.key !== "admin" || isAdmin).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm ${tab === item.key ? "border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-300"}`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <AnimatePresence mode="wait">
            {tab === "dashboard" && (
              <motion.section
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
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
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400"><Gauge size={13} /> Fatigue efficiency uses existing model unchanged.</div>
                </section>
              </motion.section>
            )}

            {tab === "shop" && (
              <motion.section
                key="shop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-slate-400">Sklep FCS</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-slate-700 p-3">
                    <label className="mb-1 block text-xs text-slate-400">Kup FCS</label>
                    <input type="number" min={1} value={buyAmount} onChange={(e) => setBuyAmount(Number(e.target.value))} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5" />
                    <button onClick={runBuy} className="mt-2 rounded border border-cyan-500 px-3 py-2 text-cyan-300">Kup tokeny</button>
                  </div>
                  <div className="rounded border border-slate-700 p-3">
                    <label className="mb-1 block text-xs text-slate-400">Sprzedaj FCS</label>
                    <input type="number" min={1} value={sellAmount} onChange={(e) => setSellAmount(Number(e.target.value))} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5" />
                    <button onClick={runSell} className="mt-2 rounded border border-cyan-500 px-3 py-2 text-cyan-300">Sprzedaj tokeny</button>
                  </div>
                </div>
              </motion.section>
            )}

            {tab === "admin" && isAdmin && (
              <motion.section
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-slate-400">Admin Contract Controls</h3>
                <div className="max-w-sm rounded border border-slate-700 p-3">
                  <label className="mb-1 block text-xs text-slate-400">Mint FCS</label>
                  <input type="number" min={1} value={mintAmount} onChange={(e) => setMintAmount(Number(e.target.value))} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5" />
                  <button onClick={runMint} className="mt-2 rounded border border-cyan-500 px-3 py-2 text-cyan-300">Mint</button>
                </div>
              </motion.section>
            )}

            {tab === "settings" && (
              <motion.section
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-slate-400">Zarzadzanie danymi</h3>
                <button onClick={resetProgress} className="rounded border border-rose-500/70 px-3 py-2 text-rose-300">Resetuj progres</button>
              </motion.section>
            )}
          </AnimatePresence>

          {txMessage && <div className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300">{txMessage}</div>}
        </motion.div>
      )}
    </main>
  );
}
