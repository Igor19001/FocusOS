import { AnimatePresence, motion } from "framer-motion";
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

  // ============= UI STATE =============
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [taskDescription, setTaskDescription] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedNavSection, setSelectedNavSection] = useState<NavSection | null>(
    null
  );
  const [selectedSecondaryPanel, setSelectedSecondaryPanel] =
    useState<SecondarySection | null>(null);

  // ============= HEALTH/WEB3 STATE =============
  const [waterSlotsUsed, setWaterSlotsUsed] = useState(0);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [totalSessions, setTotalSessions] = useState(47);
  const [buyAmount, setBuyAmount] = useState(50);
  const [sellAmount, setSellAmount] = useState(20);

  // ============= FEEDBACK STATE =============
  const [txMessage, setTxMessage] = useState("");
  const [txTone, setTxTone] = useState<"success" | "error" | "idle">("idle");

  // ============= ZEUS AVATAR STATE =============
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

  // ============= SESSION TIMER LOGIC =============
  useEffect(() => {
    if (!sessionRunning) return;
    const timer = window.setInterval(() => {
      setSessionMinutes((value) => value + 1);
    }, 60000); // Update every minute

    return () => window.clearInterval(timer);
  }, [sessionRunning]);

  // ============= RESPONSIVE DETECTION =============
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ============= WEB3 HANDLERS =============
  const setSuccess = (message: string) => {
    setTxTone("success");
    setTxMessage(message);
    setTimeout(() => setTxTone("idle"), 3000);
  };

  const setError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    setTxTone("error");
    setTxMessage(message);
    setTimeout(() => setTxTone("idle"), 4000);
  };

  const handleDemoMode = async () => {
    try {
      await activateDemoMode();
      setSuccess("Demo mode activated!");
    } catch (error) {
      setError(error);
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setSuccess("Wallet connected!");
    } catch (error) {
      setError(error);
    }
  };

  const handleGmailConnect = async (email: string) => {
    try {
      await connectGmail(email);
      setSuccess("Gmail connected!");
    } catch (error) {
      setError(error);
    }
  };

  const handleBuyFCS = async (amount: number) => {
    try {
      await buyFCS(amount);
      setSuccess(`Purchased ${amount} FCS!`);
    } catch (error) {
      setError(error);
    }
  };

  const handleSellFCS = async (amount: number) => {
    try {
      await sellFCS(amount);
      setSuccess(`Sold ${amount} FCS!`);
    } catch (error) {
      setError(error);
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
    // Can add reward logic here (FCS earned, etc.)
    setSuccess(`Session complete! +${Math.ceil(sessionMinutes / 25)} FCS earned`);
  };

  const handleResetSession = () => {
    setSessionRunning(false);
    setSessionMinutes(0);
    setTaskDescription("");
    setWaterSlotsUsed(0);
  };

  // ============= RESPONSIVE NAVIGATION TOGGLING =============
  useEffect(() => {
    if (sessionRunning) {
      setIsNavOpen(false);
    }
  }, [sessionRunning]);

  // ============= RENDER LOGIC =============

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

  // 2. MAIN APP - Mode selected (demo, wallet, or gmail)
  return (
    <main className="min-h-screen bg-slate-950 overflow-hidden">
      <BackgroundScene />

      {/* Desktop Sidebar Layout */}
      {!isMobile && (
        <div className="flex h-screen">
          {/* Navigation Sidebar (20% width when open) */}
          <NavigationDrawer
            isOpen={true}
            onToggle={() => {}}
            currentSection={selectedNavSection}
            onSelectSection={(section) => {
              setSelectedNavSection(section);
              setSelectedSecondaryPanel(section as SecondarySection);
            }}
            isMobile={false}
            isSessionRunning={sessionRunning}
          />

          {/* Main Content Area */}
          <div className="flex-1 ml-20 lg:ml-72 overflow-y-auto">
            <Home
              sessionRunning={sessionRunning}
              sessionMinutes={sessionMinutes}
              taskDescription={taskDescription}
              onSessionToggle={
                sessionRunning ? handleSessionEnd : handleSessionStart
              }
              onTaskChange={setTaskDescription}
              onResetSession={handleResetSession}
              isZenMode={sessionRunning}
            />
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="h-screen flex flex-col pb-24">
          {/* Top Bar - Only visible when NOT in zen mode */}
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

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <Home
              sessionRunning={sessionRunning}
              sessionMinutes={sessionMinutes}
              taskDescription={taskDescription}
              onSessionToggle={
                sessionRunning ? handleSessionEnd : handleSessionStart
              }
              onTaskChange={setTaskDescription}
              onResetSession={handleResetSession}
              isZenMode={sessionRunning}
            />
          </div>

          {/* Bottom Navigation */}
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
          />
        </div>
      )}

      {/* Secondary Panel (Stats, Health, Web3, Settings) */}
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
        address={address}
        fcsBalance={fcsBalance}
        onBuyFCS={handleBuyFCS}
        onSellFCS={handleSellFCS}
        onConnectWallet={handleWalletConnect}
        onDisconnectWallet={disconnectWallet}
        gmailAddress={gmailAddress}
        onConnectGmail={handleGmailConnect}
        onDisconnectGmail={disconnectGmail}
      />

      {/* Status Toast */}
      <AnimatePresence>
        {txMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl border z-20 ${
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
