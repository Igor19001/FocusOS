import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BackgroundScene from "./BackgroundScene";
import FocusTutorial from "./FocusTutorial";
import Home from "./components/Home";
import NavigationDrawer, { NavSection } from "./components/NavigationDrawer";
import Onboarding from "./components/Onboarding";
import SecondaryPanel, { SecondarySection } from "./components/SecondaryPanel";
import { useWeb3 } from "./Web3Provider";
import ZeusAvatar, { ZeusAvatarState, zeusAvatarStates } from "./ZeusAvatar";

/**
 * 🎯 ARCHITECTURE: "THE VOID" MINIMALIST MODE
 * 
 * PRINCIPLE: Sidebar/Menu HIDDEN BY DEFAULT
 * - User sees: Timer + Input + START button
 * - Everything else: Behind "Menu" button
 * - When session active: Menu completely disappears (aggressive Zen Mode)
 * - isPro mode: Progressive Disclosure - unlocks Health & Web3 widgets
 */

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

  // ==================== STATE ====================
  // Session
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [taskDescription, setTaskDescription] = useState("");

  // UI
  const [isNavOpen, setIsNavOpen] = useState(false); // ← DEFAULT CLOSED
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedNavSection, setSelectedNavSection] = useState<NavSection | null>(null);
  const [selectedSecondaryPanel, setSelectedSecondaryPanel] = useState<SecondarySection | null>(null);
  const [isProMode, setIsProMode] = useState(false); // ← Progressive Disclosure

  // Health/Web3
  const [waterSlotsUsed, setWaterSlotsUsed] = useState(0);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [totalSessions, setTotalSessions] = useState(47);
  const [buyAmount, setBuyAmount] = useState(50);
  const [sellAmount, setSellAmount] = useState(20);

  // Feedback
  const [txMessage, setTxMessage] = useState("");
  const [txTone, setTxTone] = useState<"success" | "error" | "idle">("idle");

  // ==================== ZEUS AVATAR ====================
  const fatigueEfficiency = useMemo(() => {
    const lambda = -Math.log(0.75) / 90;
    return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
  }, [sessionMinutes]);

  const recommendedZeusState = useMemo<ZeusAvatarState>(() => {
    if (txTone === "error") return "disappointed";
    if (fatigueEfficiency <= 40) return "wrath";
    if (fatigueEfficiency <= 74) return "tired";
    if (txTone === "success" || mode === "monad") return "proud";
    return "neutral";
  }, [fatigueEfficiency, mode, txTone]);

  // ==================== EFFECTS ====================
  // Session timer
  useEffect(() => {
    if (!sessionRunning) return;
    const timer = window.setInterval(() => {
      setSessionMinutes((v) => v + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [sessionRunning]);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // AGGRESSIVE: Close nav when session starts
  useEffect(() => {
    if (sessionRunning) {
      setIsNavOpen(false);
      setSelectedSecondaryPanel(null);
    }
  }, [sessionRunning]);

  // ==================== HANDLERS ====================
  const setSuccess = (msg: string) => {
    setTxTone("success");
    setTxMessage(msg);
    setTimeout(() => setTxTone("idle"), 3000);
  };

  const setError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    setTxTone("error");
    setTxMessage(msg);
    setTimeout(() => setTxTone("idle"), 4000);
  };

  const handleDemoMode = async () => {
    try {
      await activateDemoMode();
      setSuccess("Demo mode activated!");
    } catch (e) {
      setError(e);
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setSuccess("Wallet connected!");
    } catch (e) {
      setError(e);
    }
  };

  const handleGmailConnect = async (email: string) => {
    try {
      await connectGmail(email);
      setSuccess("Gmail connected!");
    } catch (e) {
      setError(e);
    }
  };

  const handleBuyFCS = async (amount: number) => {
    try {
      await buyFCS(amount);
      setSuccess(`Purchased ${amount} FCS!`);
    } catch (e) {
      setError(e);
    }
  };

  const handleSellFCS = async (amount: number) => {
    try {
      await sellFCS(amount);
      setSuccess(`Sold ${amount} FCS!`);
    } catch (e) {
      setError(e);
    }
  };

  const handleSessionStart = () => {
    if (taskDescription.trim()) {
      setSessionRunning(true);
      setIsNavOpen(false);
      setSelectedSecondaryPanel(null);
    }
  };

  const handleSessionEnd = () => {
    setSessionRunning(false);
    setTotalSessions((s) => s + 1);
    setSuccess(`Session complete! +${Math.ceil(sessionMinutes / 25)} FCS earned`);
  };

  const handleResetSession = () => {
    setSessionRunning(false);
    setSessionMinutes(0);
    setTaskDescription("");
    setWaterSlotsUsed(0);
  };

  // 1. ONBOARDING - No mode selected
  if (!mode) {
    return (
      <main className="min-h-screen bg-slate-950 overflow-hidden">
        <BackgroundScene />
        <FocusTutorial />
        <Onboarding
          onDemoMode={handleDemoMode}
          onWalletConnect={handleWalletConnect}
          onGmailConnect={handleGmailConnect}
        />
      </main>
    );
  }

  // ==================== RENDER ====================

  // 1. ONBOARDING
  if (!mode) {
    return (
      <main className="min-h-screen bg-slate-950 overflow-hidden">
        <BackgroundScene />
        <FocusTutorial />
        <Onboarding
          onDemoMode={handleDemoMode}
          onWalletConnect={handleWalletConnect}
          onGmailConnect={handleGmailConnect}
        />
      </main>
    );
  }

  // 2. DESKTOP APP
  if (!isMobile) {
    return (
      <main className="min-h-screen bg-slate-950 overflow-hidden">
        <BackgroundScene />

        <div className="flex h-screen">
          {/* TOP BAR with Menu toggle - HIDDEN WHEN SESSION RUNNING */}
          {!sessionRunning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-slate-950/80 backdrop-blur border-b border-slate-800/30"
            >
              <div className="text-sm font-mono text-slate-500">FocusOS</div>
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="p-2 rounded-lg hover:bg-slate-900 transition text-slate-400 hover:text-slate-100"
                title="Toggle menu"
              >
                {isNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </motion.div>
          )}

          {/* SIDEBAR - TOGGLABLE, DEFAULT CLOSED */}
          <NavigationDrawer
            isOpen={isNavOpen && !sessionRunning}
            onToggle={() => setIsNavOpen(!isNavOpen)}
            currentSection={selectedNavSection}
            onSelectSection={(section) => {
              setSelectedNavSection(section);
              setSelectedSecondaryPanel(section as SecondarySection);
            }}
            isMobile={false}
            isSessionRunning={sessionRunning}
            isProMode={isProMode}
          />

          {/* MAIN CONTENT - CENTERED "THE VOID" */}
          <div className="flex-1 overflow-y-auto pt-20">
            <Home
              sessionRunning={sessionRunning}
              sessionMinutes={sessionMinutes}
              taskDescription={taskDescription}
              onSessionToggle={sessionRunning ? handleSessionEnd : handleSessionStart}
              onTaskChange={setTaskDescription}
              onResetSession={handleResetSession}
              isZenMode={sessionRunning}
            />
          </div>
        </div>

        {/* SECONDARY PANEL MODAL */}
        <SecondaryPanel
          isOpen={selectedSecondaryPanel !== null}
          section={selectedSecondaryPanel}
          onClose={() => {
            setSelectedSecondaryPanel(null);
            setSelectedNavSection(null);
          }}
          totalSessions={totalSessions}
          totalMinutes={sessionMinutes}
          bestStreak={12}
          address={address || undefined}
          fcsBalance={fcsBalance}
          onBuyFCS={handleBuyFCS}
          onSellFCS={handleSellFCS}
          onConnectWallet={handleWalletConnect}
          onDisconnectWallet={disconnectWallet}
          gmailAddress={gmailAddress || undefined}
          onConnectGmail={handleGmailConnect}
          onDisconnectGmail={disconnectGmail}
          isProMode={isProMode}
          onToggleProMode={() => setIsProMode((p) => !p)}
        />

        {/* TOAST */}
        <AnimatePresence>
          {txMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl border z-40 ${
                txTone === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
              }`}
            >
              {txMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // 3. MOBILE APP
  return (
    <main className="min-h-screen bg-slate-950 overflow-hidden">
      <BackgroundScene />

      <div className="h-screen flex flex-col pb-24">
        {/* TOP BAR - HIDDEN WHEN SESSION RUNNING */}
        <AnimatePresence>
          {!sessionRunning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-950/80"
            >
              <h1 className="font-bold text-slate-100">FocusOS</h1>
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="p-2 hover:bg-slate-900 rounded-lg transition"
              >
                ≡
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <Home
            sessionRunning={sessionRunning}
            sessionMinutes={sessionMinutes}
            taskDescription={taskDescription}
            onSessionToggle={sessionRunning ? handleSessionEnd : handleSessionStart}
            onTaskChange={setTaskDescription}
            onResetSession={handleResetSession}
            isZenMode={sessionRunning}
          />
        </div>

        {/* BOTTOM NAV */}
        <NavigationDrawer
          isOpen={isNavOpen}
          onToggle={() => setIsNavOpen(!isNavOpen)}
          currentSection={selectedNavSection}
          onSelectSection={(section) => {
            setSelectedNavSection(section);
            setSelectedSecondaryPanel(section as SecondarySection);
          }}
          isMobile={true}
          isSessionRunning={sessionRunning}
          isProMode={isProMode}
        />
      </div>

      {/* SECONDARY PANEL MODAL */}
      <SecondaryPanel
        isOpen={selectedSecondaryPanel !== null}
        section={selectedSecondaryPanel}
        onClose={() => {
          setSelectedSecondaryPanel(null);
          setSelectedNavSection(null);
        }}
        totalSessions={totalSessions}
        totalMinutes={sessionMinutes}
        bestStreak={12}
        address={address || undefined}
        fcsBalance={fcsBalance}
        onBuyFCS={handleBuyFCS}
        onSellFCS={handleSellFCS}
        onConnectWallet={handleWalletConnect}
        onDisconnectWallet={disconnectWallet}
        gmailAddress={gmailAddress || undefined}
        onConnectGmail={handleGmailConnect}
        onDisconnectGmail={disconnectGmail}
        isProMode={isProMode}
        onToggleProMode={() => setIsProMode((p) => !p)}
      />

      {/* TOAST */}
      <AnimatePresence>
        {txMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl border z-40 ${
              txTone === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
            }`}
          >
            {txMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
