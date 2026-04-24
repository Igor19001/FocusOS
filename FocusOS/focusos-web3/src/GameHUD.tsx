import { motion } from "framer-motion";
import { FlaskConical, ShieldAlert, Zap } from "lucide-react";

type Props = {
  mode: "local" | "monad";
  address: string | null;
  fcsBalance: number;
  fatigueEfficiency: number;
  onClaimFaucet: () => Promise<void>;
};

export default function GameHUD({ mode, address, fcsBalance, fatigueEfficiency, onClaimFaucet }: Props) {
  const canEarn = fatigueEfficiency > 40;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-400/40 bg-slate-950/70 p-4 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.18em] text-cyan-300">Game HUD</h2>
        <span className="text-xs text-slate-400">{mode === "monad" ? `Monad ${address?.slice(0, 8)}...` : "Local Demo"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-400"><Zap size={14} /> FCS Balance</div>
          <div className="text-2xl font-semibold text-cyan-300">{fcsBalance.toFixed(2)} $FCS</div>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-400"><ShieldAlert size={14} /> Fatigue Efficiency</div>
          <div className={`text-2xl font-semibold ${canEarn ? "text-emerald-300" : "text-rose-300"}`}>{fatigueEfficiency.toFixed(1)}%</div>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
          <button
            onClick={onClaimFaucet}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
          >
            <FlaskConical size={14} />
            Claim Test $FCS
          </button>
        </div>
      </div>
      {!canEarn && <p className="mt-3 text-xs text-rose-300">Anti-cheat active: fatigue exceeded critical threshold, earning multiplier is 0x.</p>}
    </motion.section>
  );
}
