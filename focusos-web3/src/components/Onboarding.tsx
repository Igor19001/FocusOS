/**
 * 🚀 Improved Onboarding Component
 * 3-step idiot-proof flow with Zeus avatar
 * 
 * Step 1: Welcome with Zeus
 * Step 2: First task input
 * Step 3: Start session preview
 */

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Wallet, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ZeusAvatar from "../ZeusAvatar";
import { storage, STORAGE_KEYS } from "../../constants/storageKeys";

interface OnboardingProps {
  onDemoMode: () => void;
  onWalletConnect: () => void;
  onGmailConnect: (email: string) => void;
  isLoading?: boolean;
}

export default function Onboarding({
  onDemoMode,
  onWalletConnect,
  onGmailConnect,
  isLoading = false,
}: OnboardingProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [taskInput, setTaskInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<"demo" | "wallet" | "gmail" | null>(null);

  // Auto-skip onboarding if already completed
  useEffect(() => {
    const completed = storage.getBoolean("ONBOARDING_DONE");
    if (completed) {
      // This will trigger mode selection in parent
      onDemoMode();
    }
  }, [onDemoMode]);

  const handleModeSelect = (mode: "demo" | "wallet" | "gmail") => {
    setSelectedMode(mode);
    if (mode === "demo") {
      localStorage.setItem(STORAGE_KEYS.FIRST_TASK_COMPLETED, "");
      setStep(2);
    } else {
      setStep(2);
    }
  };

  const handleTaskSubmit = () => {
    if (taskInput.trim() || selectedMode === "demo") {
      if (taskInput.trim()) {
        localStorage.setItem(STORAGE_KEYS.FIRST_TASK_COMPLETED, taskInput);
      }
      setStep(3);
    }
  };

  const handleSessionStart = () => {
    storage.set("ONBOARDING_DONE", "true");

    if (selectedMode === "demo") {
      onDemoMode();
    } else if (selectedMode === "wallet") {
      onWalletConnect();
    } else if (selectedMode === "gmail") {
      const email = taskInput; // Reuse input for email
      if (email.includes("@")) {
        onGmailConnect(email);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedMode(null);
    } else if (step === 3) {
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center px-4 py-8 z-50">
      {/* Backdrop blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-950/80 border border-slate-800/50 rounded-3xl p-8 relative z-10"
      >
        <AnimatePresence mode="wait">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Zeus Avatar */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <ZeusAvatar state="proud" size={120} />
                </motion.div>
              </div>

              {/* Welcome Text */}
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-cyan-400">
                  {t("onboarding_welcome_title")}
                </h1>
                <p className="text-lg text-slate-300">
                  {t("onboarding_welcome_subtitle")}
                </p>
              </div>

              {/* Call to Action */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg transition"
              >
                {t("onboarding_welcome_button")}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: Choose Connection Mode OR First Task */}
          {step === 2 && !selectedMode && (
            <motion.div
              key="step2a"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  How do you want to start?
                </h2>
                <p className="text-sm text-slate-400">
                  Choose your preferred way to connect and begin focusing
                </p>
              </div>

              <div className="space-y-3">
                {/* Quick Start */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect("demo")}
                  className="w-full px-6 py-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-400 hover:bg-cyan-500/15 text-left transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Zap size={20} className="text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-cyan-100">Quick Start</div>
                        <div className="text-xs text-slate-400">Try offline, no login</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-cyan-400" />
                  </div>
                </motion.button>

                {/* Wallet */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect("wallet")}
                  className="w-full px-6 py-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:border-blue-400 hover:bg-blue-500/15 text-left transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Wallet size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-blue-100">Connect Wallet</div>
                        <div className="text-xs text-slate-400">Earn FCS tokens</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-blue-400" />
                  </div>
                </motion.button>

                {/* Gmail */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect("gmail")}
                  className="w-full px-6 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:border-purple-400 hover:bg-purple-500/15 text-left transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Mail size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-purple-100">Connect Gmail</div>
                        <div className="text-xs text-slate-400">Sync your calendar</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-purple-400" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: First Task */}
          {step === 2 && selectedMode && (
            <motion.div
              key="step2b"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-100">
                  {t("onboarding_task_title")}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {t("onboarding_task_subtitle")}
                </p>
              </div>

              <div>
                <input
                  type={selectedMode === "gmail" ? "email" : "text"}
                  placeholder={
                    selectedMode === "gmail"
                      ? "your@email.com"
                      : t("onboarding_task_placeholder")
                  }
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleTaskSubmit()}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  {t("onboarding_task_hint")}
                </p>
              </div>

              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTaskSubmit}
                  disabled={!taskInput.trim() && selectedMode !== "demo"}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("onboarding_task_button")}
                </motion.button>

                <button
                  onClick={handleBack}
                  className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  {t("onboarding_task_skip")}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Start Session */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Zeus Avatar */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ZeusAvatar state="proud" size={100} />
                </motion.div>
              </div>

              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-100">
                  {t("onboarding_session_title")}
                </h2>

                {/* Timer Preview */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 py-8">
                  <div className="text-6xl font-black text-cyan-400 font-mono mb-2">
                    25:00
                  </div>
                  <p className="text-sm text-slate-400">Default session duration</p>
                </div>

                <p className="text-slate-300 text-sm">
                  {t("onboarding_session_description")}
                </p>
              </div>

              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSessionStart}
                  disabled={isLoading}
                  className="w-full py-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("onboarding_session_button")}
                </motion.button>

                <button
                  onClick={handleBack}
                  className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                💡 Tip: You can always change this later in settings
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
              <div className="w-10 h-10 rounded-lg bg-cyan-500/30 flex items-center justify-center">
                <Wallet size={20} className="text-cyan-400" />
              </div>
              <div>
                <div className="font-semibold text-cyan-100">Connect Wallet</div>
                <div className="text-xs text-cyan-300/70">Earn FCS tokens</div>
              </div>
            </div>
            <ArrowRight size={18} className="text-cyan-400/60" />
          </motion.button>

          {/* Gmail Connect */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-2"
          >
            {gmailStep === "input" ? (
              <div className="px-6 py-4 rounded-2xl border border-blue-500/50 bg-blue-500/10">
                <label className="block text-sm font-semibold text-blue-100 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    Continue with Gmail
                  </div>
                </label>
                <input
                  type="email"
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGmail()}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 rounded-lg border border-blue-500/30 bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400 text-sm mb-3"
                  autoFocus
                />
                <button
                  onClick={handleGmail}
                  disabled={!gmailEmail.includes("@") || isLoading}
                  className="w-full py-2 rounded-lg border border-blue-500 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-4 rounded-2xl border border-blue-500/50 bg-blue-500/10 text-center text-blue-100 font-semibold"
              >
                Connecting to Gmail...
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center space-y-2 pt-4 border-t border-slate-800"
        >
          <p className="text-xs text-slate-500">
            All modes sync to the same focus timer.
          </p>
          <p className="text-xs text-slate-600">
            No commitments, cancel anytime.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
