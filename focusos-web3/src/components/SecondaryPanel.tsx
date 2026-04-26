import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Award,
  BarChart3,
  Droplet,
  Moon,
  Clock,
  Zap,
  Wallet,
  Send,
  ReceiptText,
  Settings as SettingsIcon,
  LogOut,
  Mail,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type SecondarySection = "stats" | "health" | "web3" | "settings";

interface SecondaryPanelProps {
  isOpen: boolean;
  section: SecondarySection | null;
  onClose: () => void;
  // Stats data
  totalSessions?: number;
  totalMinutes?: number;
  bestStreak?: number;
  // Web3 data
  address?: string;
  fcsBalance?: number;
  // Web3 actions
  onBuyFCS?: (amount: number) => void;
  onSellFCS?: (amount: number) => void;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  // Gmail data
  gmailAddress?: string;
  onConnectGmail?: (email: string) => void;
  onDisconnectGmail?: () => void;
  // Progressive Disclosure
  isProMode?: boolean;
  onToggleProMode?: () => void;
}

export default function SecondaryPanel({
  isOpen,
  section,
  onClose,
  totalSessions = 47,
  totalMinutes = 2340,
  bestStreak = 12,
  address,
  fcsBalance = 1250,
  onBuyFCS,
  onSellFCS,
  onConnectWallet,
  onDisconnectWallet,
  gmailAddress,
  onConnectGmail,
  onDisconnectGmail,
  isProMode = false,
  onToggleProMode,
}: SecondaryPanelProps) {
  const { t } = useTranslation();

  const panelVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const renderContent = () => {
    switch (section) {
      case "stats":
        return (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 size={24} className="text-cyan-400" />
              Your Focus Statistics
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{totalSessions}</div>
                <div className="text-xs text-slate-400 mt-1">Total Sessions</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{Math.floor(totalMinutes / 60)}h</div>
                <div className="text-xs text-slate-400 mt-1">Total Hours</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{bestStreak}</div>
                <div className="text-xs text-slate-400 mt-1">Day Streak</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="font-semibold text-slate-200 mb-3">Weekly Breakdown</h4>
              <div className="space-y-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-slate-400">{day}</span>
                    <div className="flex-1 h-6 rounded bg-slate-800 relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded"
                        style={{ width: `${Math.random() * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{Math.floor(Math.random() * 120)}min</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100 transition text-sm font-semibold">
              View Detailed Analytics →
            </button>
          </motion.div>
        );

      case "health":
        return (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Droplet size={24} className="text-blue-400" />
              Health & Wellness
            </h3>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Droplet size={16} className="text-blue-400" />
                    Water Intake
                  </label>
                  <span className="text-lg font-bold text-blue-400">8/12</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 flex-1 rounded ${
                        i < 8 ? "bg-blue-500" : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <button className="w-full mt-3 py-2 rounded-lg border border-blue-600 text-blue-300 hover:bg-blue-500/20 transition text-sm font-semibold">
                  Log Water Intake
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <label className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                  <Moon size={16} className="text-purple-400" />
                  Last Night Sleep
                </label>
                <div className="text-3xl font-bold text-purple-400">7.5h</div>
                <p className="text-sm text-slate-400 mt-1">Great sleep score! Keep it up 🌙</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <label className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                  <Clock size={16} className="text-orange-400" />
                  Next Break Due
                </label>
                <div className="text-3xl font-bold text-orange-400">12 min</div>
                <p className="text-sm text-slate-400 mt-1">You've been focusing for 48 minutes</p>
                <button className="w-full mt-3 py-2 rounded-lg border border-orange-600 text-orange-300 hover:bg-orange-500/20 transition text-sm font-semibold">
                  Take a Break
                </button>
              </div>
            </div>
          </motion.div>
        );

      case "web3":
        return (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Wallet size={24} className="text-yellow-400" />
              Web3 & Tokens
            </h3>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400 mb-1">Wallet Status</div>
              {address ? (
                <>
                  <div className="font-mono text-sm text-cyan-400 break-all">
                    {address.slice(0, 10)}...{address.slice(-8)}
                  </div>
                  <button
                    onClick={onDisconnectWallet}
                    className="w-full mt-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-red-600 hover:text-red-300 transition text-sm font-semibold"
                  >
                    Disconnect Wallet
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnectWallet}
                  className="w-full mt-2 py-2 rounded-lg border border-cyan-500 text-cyan-300 hover:bg-cyan-500/20 transition text-sm font-semibold"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-slate-300 font-semibold">FCS Balance</label>
                <span className="text-2xl font-bold text-yellow-400">{fcsBalance}</span>
              </div>
              <p className="text-xs text-slate-400">Earn tokens by completing focus sessions</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onBuyFCS?.(50)}
                className="p-3 rounded-lg border border-green-600 text-green-400 hover:bg-green-500/20 transition flex items-center justify-center gap-2 font-semibold"
              >
                <Send size={16} />
                Buy FCS
              </button>
              <button
                onClick={() => onSellFCS?.(20)}
                className="p-3 rounded-lg border border-red-600 text-red-400 hover:bg-red-500/20 transition flex items-center justify-center gap-2 font-semibold"
              >
                <ReceiptText size={16} />
                Sell FCS
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400 leading-5">
                💡 <strong>Tip:</strong> Connect your wallet to earn and trade tokens. Your focus sessions generate FCS!
              </p>
            </div>
          </motion.div>
        );

      case "settings":
        return (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <SettingsIcon size={24} className="text-slate-400" />
              Settings
            </h3>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <label className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                <Wallet size={16} className="text-cyan-400" />
                Wallet Connection
              </label>
              {address ? (
                <>
                  <div className="font-mono text-xs text-cyan-400 break-all bg-slate-950 p-2 rounded mb-2">
                    {address}
                  </div>
                  <button
                    onClick={onDisconnectWallet}
                    className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-red-600 hover:text-red-300 transition text-sm"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnectWallet}
                  className="w-full py-2 rounded-lg border border-cyan-500 text-cyan-300 hover:bg-cyan-500/20 transition text-sm font-semibold"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <label className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                <Mail size={16} className="text-blue-400" />
                Gmail Connection
              </label>
              {gmailAddress ? (
                <>
                  <div className="text-sm text-blue-400 mb-2">{gmailAddress}</div>
                  <button
                    onClick={onDisconnectGmail}
                    className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-red-600 hover:text-red-300 transition text-sm"
                  >
                    Disconnect Gmail
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onConnectGmail?.("")}
                  className="w-full py-2 rounded-lg border border-blue-500 text-blue-300 hover:bg-blue-500/20 transition text-sm font-semibold"
                >
                  Connect Gmail
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <label className="flex items-center justify-between gap-2 text-slate-300 font-semibold mb-2">
                  <span>Advanced Mode (Pro)</span>
                  <button
                    onClick={() => onToggleProMode?.()}
                    className="px-3 py-1 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-900/50 transition"
                  >
                    {isProMode ? "ENABLED" : "DISABLED"}
                  </button>
                </label>
                <p className="text-xs text-slate-400">When enabled, Health & Web3 widgets become available in the menu.</p>
              </div>
              <button className="w-full py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900/50 transition text-sm font-semibold flex items-center justify-center gap-2">
                <Shield size={16} />
                Privacy & Security
              </button>
              <button className="w-full py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900/50 transition text-sm font-semibold">
                About FocusOS
              </button>
              <button className="w-full py-3 rounded-lg border border-red-600 text-red-400 hover:bg-red-500/10 transition text-sm font-semibold flex items-center justify-center gap-2">
                <LogOut size={16} />
                Log Out
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && section && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col max-h-[90vh] md:max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div />
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-900 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
