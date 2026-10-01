import { Check, Lock, Sparkles } from "lucide-react";
import { Button3D } from "./ui/Button3D";

function QuestRow({ quest, claimed, onClaim }) {
  const pct = Math.min(100, Math.round((quest.value / quest.goal) * 100));
  const ready = pct >= 100 && !claimed;
  const { Icon } = quest;

  return (
    <li className="flex items-center gap-3 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          claimed
            ? "bg-lime-100 text-lime-600 dark:bg-lime-950 dark:text-lime-400"
            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
        }`}
      >
        {claimed ? <Check className="h-5 w-5 stroke-[3.5]" /> : <Icon className="h-5 w-5 stroke-[2.5]" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{quest.label}</p>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${claimed ? "bg-lime-500" : "bg-yellow-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
          {Math.min(quest.value, quest.goal)} / {quest.goal} {quest.unit ?? ""}
        </p>
      </div>

      {ready ? (
        <Button3D variant="gold" className="px-3 py-2 text-xs" onClick={() => onClaim(quest.id)}>
          +{quest.reward} XP
        </Button3D>
      ) : (
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-black text-slate-400 dark:bg-slate-700 dark:text-slate-500">
          {claimed ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {quest.reward}
        </span>
      )}
    </li>
  );
}

export function Quests({ quests, claimed, onClaim }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black text-slate-800 dark:text-slate-100">Zadania dnia</h2>
      <ul className="space-y-2">
        {quests.map((q) => (
          <QuestRow key={q.id} quest={q} claimed={claimed.includes(q.id)} onClaim={onClaim} />
        ))}
      </ul>
    </section>
  );
}
