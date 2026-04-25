import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, Gauge, Wallet, X } from "lucide-react";
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
    title: "Connections",
    text: "Mozesz wejsc przez demo, Gmail albo portfel, a ustawienia pozwalaja zarzadzac polaczeniami pozniej.",
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-4"
        >
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-cyan-400/40 bg-slate-900/96 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-cyan-100">
                <StepIcon size={18} />
                <h3 className="text-sm uppercase tracking-[0.14em]">{STEPS[step].title}</h3>
              </div>
              <button
                onClick={closeTutorial}
                aria-label="Close tutorial"
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-100"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-base leading-7 text-slate-200">{STEPS[step].text}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">{step + 1} / {STEPS.length}</span>
              <div className="flex gap-2">
                <button onClick={closeTutorial} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200">
                  Skip
                </button>
                <button onClick={next} className="rounded-xl border border-cyan-500/50 px-3 py-2 text-sm text-cyan-100">
                {step === STEPS.length - 1 ? "Zakoncz" : "Dalej"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
