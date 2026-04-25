import { AnimatePresence, motion } from "framer-motion";
import {
  Gauge,
  LayoutDashboard,
  Mail,
  Pause,
  Play,
  RefreshCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TimerReset,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BackgroundScene from "./BackgroundScene";
import FocusTutorial from "./FocusTutorial";
import GameHUD from "./GameHUD";
import { useWeb3 } from "./Web3Provider";
import ZeusAvatar, { ZeusAvatarState, zeusAvatarStates } from "./ZeusAvatar";

type LiveLogItem = { id: number; text: string; ts: number };
type Tab = "dashboard" | "shop" | "admin" | "settings";

const zeusStateMeta: Record<ZeusAvatarState, { title: string; subtitle: string }> = {
  neutral: { title: "Neutral", subtitle: "Calm focus for daily planning." },
  proud: { title: "Proud", subtitle: "Positive glow for successful sessions." },
  disappointed: { title: "Disappointed", subtitle: "Dimmed feedback for failed goals." },
  wrath: { title: "Wrath", subtitle: "High-voltage mode for hardcore runs." },
  tired: { title: "Tired", subtitle: "Low-energy readout for sleep debt days." },
};

export default function App() {
  const { t, i18n } = useTranslation();
  const {
    mode,
    address,
    gmailAddress,
    fcsBalance,
    activateDemoMode,
    connectWallet,
    disconnectWallet,
    connectGmail,
    disconnectGmail,
    claimTestFCS,
    buyFCS,
    sellFCS,
    adminMint,
    adminWallet,
  } = useWeb3();

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
  const [txTone, setTxTone] = useState<"success" | "error" | "idle">("idle");
  const [gmailInput, setGmailInput] = useState(gmailAddress ?? "");
  const [selectedAvatarState, setSelectedAvatarState] = useState<ZeusAvatarState | null>(null);

  const fatigueEfficiency = useMemo(() => {
    const lambda = -Math.log(0.75) / 90;
    return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
  }, [sessionMinutes]);

  const isAdmin = Boolean(address && adminWallet && address.toLowerCase() === adminWallet.toLowerCase());

  const recommendedZeusState = useMemo<ZeusAvatarState>(() => {
    if (txTone === "error") return "disappointed";
    if (fatigueEfficiency <= 40) return "wrath";
    if (fatigueEfficiency <= 74) return "tired";
    if (txTone === "success" || mode === "monad") return "proud";
    return "neutral";
  }, [fatigueEfficiency, mode, txTone]);

  const activeZeusState = selectedAvatarState ?? recommendedZeusState;

  const identityLabel = mode === "monad" ? `Wallet ${address?.slice(0, 8)}...` : mode === "gmail" ? gmailAddress ?? "Gmail linked" : "Local Demo";
  const sessionStatus = sessionRunning ? "In focus session" : "Idle";
  const formattedSessionTime = `${Math.floor(sessionMinutes / 60)
    .toString()
    .padStart(2, "0")}:${(sessionMinutes % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (!sessionRunning) return undefined;
    const timer = window.setInterval(() => {
      setSessionMinutes((value) => value + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [sessionRunning]);

  const setSuccess = (message: string) => {
    setTxTone("success");
    setTxMessage(message);
  };

  const setError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    setTxTone("error");
    setTxMessage(message);
  };

  const addLiveEntry = () => {
    if (!liveText.trim()) return;
    setLiveLog((prev) => [{ id: Date.now(), text: liveText.trim(), ts: Date.now() }, ...prev]);
    setLiveText("");
  };

  const resetProgress = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleDemoMode = async () => {
    try {
      await activateDemoMode();
      setSuccess("Demo mode is ready.");
    } catch (error) {
      setError(error);
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setSuccess("Wallet connected.");
    } catch (error) {
      setError(error);
    }
  };

  const handleGmailConnect = async () => {
    try {
      await connectGmail(gmailInput);
      setSuccess("Gmail connected.");
    } catch (error) {
      setError(error);
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setSuccess("Wallet disconnected.");
  };

  const handleGmailDisconnect = () => {
    disconnectGmail();
    setGmailInput("");
    setSuccess("Gmail disconnected.");
  };

  const runBuy = async () => {
    try {
      await buyFCS(buyAmount);
      setSuccess(`Bought ${buyAmount} FCS.`);
    } catch (error) {
      setError(error);
    }
  };

  const runSell = async () => {
    try {
      await sellFCS(sellAmount);
      setSuccess(`Sold ${sellAmount} FCS.`);
    } catch (error) {
      setError(error);
    }
  };

  const runMint = async () => {
    try {
      await adminMint(address || adminWallet, mintAmount);
      setSuccess(`Admin minted ${mintAmount} FCS.`);
    } catch (error) {
      setError(error);
    }
  };

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "shop" as const, label: "Shop", icon: ShoppingBag },
    { key: "admin" as const, label: "Admin", icon: ShieldCheck },
    { key: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <BackgroundScene />
      <FocusTutorial />

      {!mode && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-4 grid max-w-6xl gap-4 lg:mt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6"
        >
          <div className="rounded-3xl border border-cyan-400/30 bg-slate-900/82 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.4)] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100 sm:text-xs">
                <Sparkles size={14} />
                Zeus Identity Pack
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold text-cyan-100 sm:text-4xl">FocusOS</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">{t("landingDescription")}</p>

            <div className="mt-6 grid gap-3 lg:mt-8 md:grid-cols-3">
              <button
                onClick={handleDemoMode}
                className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-left transition hover:border-cyan-400 hover:bg-slate-950"
              >
                <div className="text-base font-medium text-slate-100">{t("localDemo")}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Offline workspace for trying the full UI fast.</div>
              </button>

              <button
                onClick={handleWalletConnect}
                className="rounded-2xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-500/15"
              >
                <div className="inline-flex items-center gap-2 text-base font-medium text-cyan-100">
                  <Wallet size={16} />
                  {t("connectMonad")}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">Use your EVM wallet for Monad mode and token actions.</div>
              </button>

              <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
                <div className="inline-flex items-center gap-2 text-base font-medium text-slate-100">
                  <Mail size={16} />
                  {t("connectGmail")}
                </div>
                <input
                  value={gmailInput}
                  onChange={(event) => setGmailInput(event.target.value)}
                  placeholder="name@gmail.com"
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                />
                <button
                  onClick={handleGmailConnect}
                  className="mt-3 w-full rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  Continue with Gmail
                </button>
              </div>
            </div>

            {txMessage && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                  txTone === "error"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                    : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                }`}
              >
                {txMessage}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avatar Preview</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100 sm:text-2xl">Modern Zeus portrait system</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  One face, five UI states. Expression and lighting shift while the portrait stays stable for small avatar sizes.
                </p>
              </div>
              <ZeusAvatar state={activeZeusState} size={104} className="mx-auto sm:mx-0" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {zeusAvatarStates.map((state) => (
                <div key={state} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-3 sm:block">
                    <ZeusAvatar state={state} size={84} className="mx-auto shrink-0 sm:mx-auto" />
                    <div className="sm:text-center">
                      <div className="text-sm font-medium text-slate-100">{zeusStateMeta[state].title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-300">{zeusStateMeta[state].subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {mode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-4">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/78 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <ZeusAvatar state={activeZeusState} size={76} />
              <div>
                <div className="inline-flex flex-wrap items-center gap-2 text-sm text-slate-200">
                  {mode === "monad" ? <Wallet size={14} /> : <Mail size={14} />}
                  <span>{identityLabel}</span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">Active Zeus State: {zeusStateMeta[activeZeusState].title}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {sessionStatus} · Session {formattedSessionTime}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <select
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={i18n.language}
                onChange={(event) => i18n.changeLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
                <option value="es">Espanol</option>
              </select>

              <button
                onClick={() => {
                  setTxMessage("");
                  setTxTone("idle");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 hover:text-cyan-100"
              >
                <RefreshCcw size={14} />
                Clear Status
              </button>
            </div>
          </header>

          <nav className="flex flex-wrap gap-2">
            {tabs
              .filter((item) => item.key !== "admin" || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`inline-flex min-w-[110px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      tab === item.key ? "border-cyan-500 bg-cyan-500/10 text-cyan-100" : "border-slate-700 text-slate-200"
                    }`}
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
                <GameHUD
                  mode={mode}
                  address={address}
                  gmailAddress={gmailAddress}
                  fcsBalance={fcsBalance}
                  fatigueEfficiency={fatigueEfficiency}
                  onClaimFaucet={claimTestFCS}
                />

                <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                    <h3 className="mb-2 text-sm uppercase tracking-[0.14em] text-slate-300">Live Log</h3>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={liveText}
                        onChange={(event) => setLiveText(event.target.value)}
                        placeholder={t("liveLogPlaceholder")}
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                      />
                      <button onClick={addLiveEntry} className="rounded-xl border border-cyan-500 px-4 py-2 text-cyan-100">
                        Add
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      {liveLog.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-slate-300">Session notes will appear here.</div>}
                      {liveLog.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-800 p-3">
                          {entry.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Avatar State Rack</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">Pick a portrait manually or leave it on automatic mood sync.</p>
                      </div>
                      <ZeusAvatar state={activeZeusState} size={80} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedAvatarState(null);
                          setTxTone("idle");
                          setTxMessage("Avatar is following live mood again.");
                        }}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400"
                      >
                        Auto mood
                      </button>
                      {selectedAvatarState && (
                        <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                          Manual preview: {zeusStateMeta[selectedAvatarState].title}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {zeusAvatarStates.map((state) => (
                        <button
                          key={state}
                          onClick={() => {
                            setSelectedAvatarState(state);
                            setTxTone("idle");
                            setTxMessage(`${zeusStateMeta[state].title} portrait selected.`);
                          }}
                          className={`rounded-2xl border p-2 ${
                            activeZeusState === state ? "border-cyan-400 bg-cyan-500/10" : "border-slate-800 bg-slate-950/80"
                          }`}
                          aria-pressed={activeZeusState === state}
                        >
                          <ZeusAvatar state={state} size={56} />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Session status</div>
                        <div className="mt-2 text-lg font-medium text-slate-100">{sessionStatus}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Tracked time</div>
                        <div className="mt-2 text-lg font-medium text-cyan-100">{formattedSessionTime}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Water slots</div>
                        <div className="mt-2 text-lg font-medium text-slate-100">{waterSlotsUsed}/12</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSessionRunning((value) => !value)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-slate-100"
                      >
                        {sessionRunning ? <Pause size={14} /> : <Play size={14} />}
                        {sessionRunning ? "Pause session" : "Start session"}
                      </button>
                      <button onClick={() => setSessionMinutes((value) => value + 15)} className="rounded-xl border border-slate-600 px-3 py-2 text-slate-100">
                        Add +15 min
                      </button>
                      <button
                        onClick={() => setWaterSlotsUsed((value) => Math.min(12, value + 1))}
                        className="rounded-xl border border-slate-600 px-3 py-2 text-slate-100"
                      >
                        Drink water
                      </button>
                      <button
                        onClick={() => {
                          setSessionRunning(false);
                          setSessionMinutes(0);
                          setWaterSlotsUsed(0);
                          setTxTone("idle");
                          setTxMessage("Session metrics reset.");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-slate-100"
                      >
                        <TimerReset size={14} />
                        Reset session
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
                    <Gauge size={14} />
                    Fatigue efficiency uses the existing curve and now also drives Zeus avatar mood.
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    A running session now tracks time continuously while the timer is active.
                  </div>
                </section>
              </motion.section>
            )}

            {tab === "shop" && (
              <motion.section
                key="shop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4"
              >
                <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-300">FCS Shop</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 p-3">
                    <label className="mb-2 block text-sm text-slate-300">Buy FCS</label>
                    <input
                      type="number"
                      min={1}
                      value={buyAmount}
                      onChange={(event) => setBuyAmount(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                    <button onClick={runBuy} className="mt-3 rounded-xl border border-cyan-500 px-3 py-2 text-cyan-100">
                      Buy tokens
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-700 p-3">
                    <label className="mb-2 block text-sm text-slate-300">Sell FCS</label>
                    <input
                      type="number"
                      min={1}
                      value={sellAmount}
                      onChange={(event) => setSellAmount(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                    <button onClick={runSell} className="mt-3 rounded-xl border border-cyan-500 px-3 py-2 text-cyan-100">
                      Sell tokens
                    </button>
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
                className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4"
              >
                <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-300">Admin Contract Controls</h3>
                <div className="max-w-sm rounded-2xl border border-slate-700 p-3">
                  <label className="mb-2 block text-sm text-slate-300">Mint FCS</label>
                  <input
                    type="number"
                    min={1}
                    value={mintAmount}
                    onChange={(event) => setMintAmount(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                  <button onClick={runMint} className="mt-3 rounded-xl border border-cyan-500 px-3 py-2 text-cyan-100">
                    Mint
                  </button>
                </div>
              </motion.section>
            )}

            {tab === "settings" && (
              <motion.section
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid gap-4 xl:grid-cols-2"
              >
                <section className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                  <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-300">Wallet Connection</h3>
                  <p className="text-sm leading-6 text-slate-200">
                    {address ? `Connected wallet: ${address}` : "No wallet connected yet. You can connect it here at any time."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={handleWalletConnect} className="rounded-xl border border-cyan-500 px-3 py-2 text-cyan-100">
                      {address ? "Reconnect wallet" : "Connect wallet"}
                    </button>
                    {address && (
                      <button onClick={handleWalletDisconnect} className="rounded-xl border border-slate-600 px-3 py-2 text-slate-100">
                        Disconnect wallet
                      </button>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                  <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-300">Gmail Connection</h3>
                  <input
                    value={gmailInput}
                    onChange={(event) => setGmailInput(event.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={handleGmailConnect} className="rounded-xl border border-cyan-500 px-3 py-2 text-cyan-100">
                      {gmailAddress ? "Update Gmail" : "Connect Gmail"}
                    </button>
                    {gmailAddress && (
                      <button onClick={handleGmailDisconnect} className="rounded-xl border border-slate-600 px-3 py-2 text-slate-100">
                        Disconnect Gmail
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">This is a local Gmail identity flow for now, so the UI works without a Google OAuth setup.</p>
                </section>

                <section className="rounded-3xl border border-slate-700 bg-slate-900/68 p-4">
                  <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-300">Data Management</h3>
                  <button onClick={resetProgress} className="rounded-xl border border-rose-500/70 px-3 py-2 text-rose-200">
                    Reset progress
                  </button>
                </section>
              </motion.section>
            )}
          </AnimatePresence>

          {txMessage && (
            <div
              className={`rounded-2xl border px-3 py-2 text-sm ${
                txTone === "error" ? "border-rose-500/40 bg-rose-500/12 text-rose-100" : "border-cyan-500/40 bg-cyan-500/12 text-cyan-100"
              }`}
            >
              {txMessage}
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}
