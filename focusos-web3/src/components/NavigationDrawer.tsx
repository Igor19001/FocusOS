import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Menu,
  BarChart3,
  Settings,
  Wallet,
  HelpCircle,
  Gauge,
  Droplet,
  LogOut,
} from "lucide-react";
import { useState } from "react";

export type NavSection = "stats" | "health" | "web3" | "settings" | "help";

interface NavigationDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSection: NavSection | null;
  onSelectSection: (section: NavSection) => void;
  isMobile: boolean;
  isSessionRunning: boolean;
}

export default function NavigationDrawer({
  isOpen,
  onToggle,
  currentSection,
  onSelectSection,
  isMobile,
  isSessionRunning,
}: NavigationDrawerProps) {
  const menuItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: "stats",
      label: "Statistics",
      icon: <BarChart3 size={20} />,
      description: "Session history & trends",
    },
    {
      id: "health",
      label: "Health Tracker",
      icon: <Droplet size={20} />,
      description: "Water, sleep & breaks",
    },
    {
      id: "web3",
      label: "Web3 & Tokens",
      icon: <Wallet size={20} />,
      description: "Wallet & FCS tokens",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={20} />,
      description: "Preferences & connections",
    },
    {
      id: "help",
      label: "Help & Guides",
      icon: <HelpCircle size={20} />,
      description: "Learn how to focus",
    },
  ];

  // Desktop Sidebar (always visible, collapses to icon bar)
  if (!isMobile) {
    return (
      <div className="fixed left-0 top-0 h-screen w-20 lg:w-72 bg-slate-950/95 border-r border-slate-800 flex flex-col z-30 transition-all duration-300">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-800">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center lg:justify-start gap-3 text-slate-300 hover:text-cyan-100 transition"
          >
            <Menu size={20} />
            <span className="hidden lg:inline text-sm font-semibold uppercase tracking-wide">
              Menu
            </span>
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              disabled={isSessionRunning}
              className={`w-full lg:w-auto flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-xl transition ${
                currentSection === item.id
                  ? "bg-cyan-500/20 border border-cyan-500 text-cyan-100"
                  : "border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100"
              } ${isSessionRunning ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="flex justify-center lg:justify-start">{item.icon}</div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-400">{item.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Session Indicator */}
        {isSessionRunning && (
          <div className="p-3 lg:p-4 border-t border-slate-800">
            <div className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-100 text-xs">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="hidden lg:inline">Session Active</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile Bottom Navigation
  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 px-4 py-3 z-30 safe-area-inset-bottom"
      >
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          {/* Quick Access Icons */}
          <div className="flex gap-3">
            {menuItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onToggle();
                }}
                disabled={isSessionRunning}
                className={`p-3 rounded-lg transition ${
                  currentSection === item.id
                    ? "bg-cyan-500/20 text-cyan-100"
                    : "text-slate-400 hover:text-slate-100"
                } ${isSessionRunning ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Session Status / Menu Toggle */}
          {isSessionRunning ? (
            <div className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-100 text-xs font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Active
            </div>
          ) : (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 transition"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-slate-950 border-l border-slate-800 z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">More Options</h2>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-slate-900 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectSection(item.id);
                      onToggle();
                    }}
                    disabled={isSessionRunning}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                      currentSection === item.id
                        ? "bg-cyan-500/20 border border-cyan-500 text-cyan-100"
                        : "border border-slate-800 text-slate-300 hover:border-slate-700"
                    } ${isSessionRunning ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {item.icon}
                    <div className="text-left">
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition text-sm">
                  <LogOut size={16} />
                  Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
