import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, Gauge, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "focusos_tutorial_seen_v3";

const STEPS = [
  {
    title: "HUD",
    text: "Panel HUD pokazuje saldo FCS, stan zmeczenia i dostep do faucet.",
    icon: BookOpenText,
  },
  {
    title: "Fatigue System",
    text: "Gdy fatigueEfficiency spadnie za nisko, mnoznik nagrod spada do 0x.",
    icon: Gauge,
  },
  {
    title: "Wallet Connect",
    text: "W trybie Monad polacz portfel i korzystaj ze sklepu oraz operacji on-chain.",
    icon: Wallet,
  },
];

export default function FocusTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(KEY);
    if (!seen) setOpen(true);
  }, []);

  const closeTutorial = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      closeTutorial();
      return;
    }
    setStep((s) => s + 1);
  };

  const StepIcon = STEPS[step].icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-md rounded-xl border border-cyan-400/40 bg-slate-900/95 p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <StepIcon size={16} />
              <h3 className="text-sm uppercase tracking-[0.18em]">{STEPS[step].title}</h3>
            </div>
            <p className="text-sm text-slate-300">{STEPS[step].text}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{step + 1} / {STEPS.length}</span>
              <button onClick={next} className="rounded border border-cyan-500/50 px-3 py-1.5 text-sm text-cyan-300">
                {step === STEPS.length - 1 ? "Zakoncz" : "Dalej"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
