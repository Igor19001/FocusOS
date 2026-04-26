import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface HomeProps {
  sessionRunning: boolean;
  sessionMinutes: number;
  taskDescription: string;
  onSessionToggle: () => void;
  onTaskChange: (task: string) => void;
  onResetSession: () => void;
  isZenMode: boolean;
}

export default function Home({
  sessionRunning,
  sessionMinutes,
  taskDescription,
  onSessionToggle,
  onTaskChange,
  onResetSession,
  isZenMode,
}: HomeProps) {
  const { t } = useTranslation();
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // Update time display
  useEffect(() => {
    const totalSeconds = sessionMinutes * 60;
    setDisplayMinutes(Math.floor(totalSeconds / 60));
    setDisplaySeconds(totalSeconds % 60);
  }, [sessionMinutes]);

  const formattedTime = `${displayMinutes.toString().padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`;

  // Zen Mode: content fades out when session is active
  const containerVariants = {
    normal: { opacity: 1, scale: 1 },
    zen: { opacity: 0.15, scale: 0.98, pointerEvents: "none" as const },
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Zen Mode overlay - dimmed background */}
      {isZenMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-none z-40"
        />
      )}

      {/* Main content container */}
      <motion.div
        variants={containerVariants}
        animate={isZenMode ? "zen" : "normal"}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header - Hidden in Zen Mode */}
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-5xl font-bold text-cyan-100">FocusOS</h1>
            <p className="text-slate-400 text-sm">Deep work timer</p>
          </motion.div>
        )}

        {/* MASSIVE TIMER - The Hero of the UI */}
        <motion.div
          layout
          animate={isZenMode ? { scale: 1.2, y: -40 } : { scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="relative"
        >
          <div className="text-center">
            <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono tracking-tighter">
              {formattedTime}
            </div>
            <div className="mt-2 text-sm text-slate-400 uppercase tracking-widest">
              {sessionRunning ? "Session Active" : "Ready to focus"}
            </div>
          </div>
        </motion.div>

        {/* Task Input - Hidden when session running */}
        {!sessionRunning && !isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <label className="block text-xs text-slate-400 uppercase tracking-widest">
              What are you working on?
            </label>
            <input
              type="text"
              value={taskDescription}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="e.g., Write report, Code review, Study math..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition text-center text-sm"
              autoFocus
            />
          </motion.div>
        )}

        {/* Current Task Display - Shown when session running */}
        {sessionRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <p className="text-slate-300 text-lg font-medium">{taskDescription}</p>
          </motion.div>
        )}

        {/* Control Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pt-4"
        >
          {/* START / PAUSE Button - MASSIVE */}
          <button
            onClick={onSessionToggle}
            disabled={!sessionRunning && !taskDescription.trim()}
            className="w-full py-6 px-4 rounded-3xl border-2 transition-all duration-300 font-bold text-lg tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed
              group relative overflow-hidden
              border-cyan-400 text-cyan-100 bg-cyan-500/20 hover:bg-cyan-500/40 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/30"
          >
            <div className="flex items-center justify-center gap-3">
              {sessionRunning ? (
                <>
                  <Pause size={24} />
                  Pause Focus
                </>
              ) : (
                <>
                  <Play size={24} />
                  Start Focus
                </>
              )}
            </div>
          </button>

          {/* Secondary Actions */}
          {sessionRunning && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onResetSession}
              className="w-full py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              End Session
            </motion.button>
          )}
        </motion.div>

        {/* Subtle hint */}
        {!isZenMode && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-slate-500 text-center pt-2"
          >
            Menu available at top-left when ready to explore more
          </motion.p>
        )}
      </motion.div>

      {/* Zen Mode Focus Message - Appears when session active */}
      {isZenMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
        >
          <div className="text-center space-y-6">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono tracking-tighter"
            >
              {formattedTime}
            </motion.div>
            <div className="text-xl text-cyan-100/60 font-semibold">
              {taskDescription}
            </div>
            <p className="text-sm text-slate-400">
              Focus. Nothing else matters right now.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
