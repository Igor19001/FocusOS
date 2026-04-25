import { motion } from "framer-motion";
import { FlaskConical, ShieldAlert, Zap } from "lucide-react";

type Props = {
  mode: "local" | "gmail" | "monad";
  address: string | null;
  gmailAddress: string | null;
  fcsBalance: number;
  fatigueEfficiency: number;
  onClaimFaucet: () => Promise<void>;
};

export default function GameHUD({ mode, address, gmailAddress, fcsBalance, fatigueEfficiency, onClaimFaucet }: Props) {
  const canEarn = fatigueEfficiency > 40;
  const modeLabel =
    mode === "monad"
      ? `Wallet ${address?.slice(0, 8)}...`
      : mode === "gmail"
        ? gmailAddress ?? "Gmail connected"
        : "Local Demo";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-cyan-400/40 bg-slate-950/78 p-4 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.14em] text-cyan-100">Game HUD</h2>
        <span className="text-sm text-slate-300">{modeLabel}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/72 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm text-slate-300"><Zap size={14} /> FCS Balance</div>
          <div className="text-2xl font-semibold text-cyan-100">{fcsBalance.toFixed(2)} $FCS</div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/72 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm text-slate-300"><ShieldAlert size={14} /> Fatigue Efficiency</div>
          <div className={`text-2xl font-semibold ${canEarn ? "text-emerald-300" : "text-rose-300"}`}>{fatigueEfficiency.toFixed(1)}%</div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/72 p-4 sm:col-span-2 xl:col-span-1">
          <button
            onClick={onClaimFaucet}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-100 hover:bg-cyan-500/20"
          >
            <FlaskConical size={14} />
            Claim Test $FCS
          </button>
        </div>
      </div>
      {!canEarn && <p className="mt-3 text-sm leading-6 text-rose-200">Anti-cheat active: fatigue exceeded critical threshold, earning multiplier is 0x.</p>}
    </motion.section>
  );
}
