import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

/**
 * Natywny splash Androida znika w momencie, gdy WebView zgłosi gotowość —
 * a to jest zanim wczytamy stan z Preferences. Ten ekran zakrywa tę dziurę,
 * żeby nie mignął pusty biały kadr. Dlatego ma minimalny czas trwania.
 */
export function Intro({ ready, minMs = 900, onDone }) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), minMs);
    return () => clearTimeout(id);
  }, [minMs]);

  const done = ready && elapsed;

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onDone, 320); // tyle, ile trwa wygaszenie
    return () => clearTimeout(id);
  }, [done, onDone]);

  return (
    <div
      className={[
        "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-lime-500",
        "transition-opacity duration-300",
        done ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <div className="dq-intro">
        <Mascot mood="proud" size={128} className="text-white" />
      </div>

      <p className="mt-6 text-3xl font-black tracking-tight text-white">DayQuest</p>
      <p className="mt-1 text-sm font-bold text-lime-100">Dzień, skupienie, sen</p>

      <div className="mt-10 h-1.5 w-32 overflow-hidden rounded-full bg-white/25">
        <div className="dq-load h-full w-1/3 rounded-full bg-white" />
      </div>
    </div>
  );
}
