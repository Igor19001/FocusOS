import { motion } from "framer-motion";
import { Wallet, Mail, Zap, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailStep, setGmailStep] = useState<"input" | "loading">("input");

  const handleGmail = () => {
    if (gmailEmail && gmailEmail.includes("@")) {
      setGmailStep("loading");
      onGmailConnect(gmailEmail);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
          >
            FocusOS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg"
          >
            Deep focus, simplified.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-500 text-sm leading-relaxed"
          >
            Start a focus session in 2 seconds. Everything else is optional.
          </motion.p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Demo Mode */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onDemoMode}
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            className="w-full group px-6 py-4 rounded-2xl border border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900 transition flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <div>
                <div className="font-semibold text-slate-100">Quick Start</div>
                <div className="text-xs text-slate-400">Try offline, no login needed</div>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-600 group-hover:text-slate-400 transition" />
          </motion.button>

          {/* Wallet Connect */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={onWalletConnect}
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            className="w-full group px-6 py-4 rounded-2xl border border-cyan-500/50 bg-cyan-500/10 hover:border-cyan-400 hover:bg-cyan-500/15 transition flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
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
