import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { Button3D } from "./ui/Button3D";
import { fmt, hours } from "../lib/routine";
import { cycleLabel, cyclesIn } from "../lib/cycles";

const HOLD_MS = 3000;

/**
 * Nakładka po godzinie snu. Da się ją zamknąć, ale trzeba przytrzymać
 * przycisk trzy sekundy — chodzi o to, żeby ominięcie było decyzją,
 * a nie odruchem kciuka.
 */
export function WindDown({ minutesToWake, wake, fallAsleep, cycleMin, onDismiss }) {
  const [held, setHeld] = useState(0);

  useEffect(() => {
    if (held === 0) return;
    const started = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / HOLD_MS) * 100);
      setHeld(pct);
      if (pct >= 100) {
        clearInterval(id);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held > 0]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-8 text-center">
      <Moon className="h-16 w-16 stroke-[1.5] text-indigo-400" />

      <p className="mt-8 text-4xl font-black leading-tight text-slate-100">Pora spać</p>
      <p className="mt-3 max-w-xs text-sm font-bold leading-relaxed text-slate-400">
        Jeśli położysz się teraz, przespisz {hours(Math.max(0, minutesToWake - fallAsleep))} i wstaniesz
        o {fmt(wake)}. To {cycleLabel(cyclesIn(Math.max(0, minutesToWake - fallAsleep), cycleMin))}.
      </p>

      <div className="mt-10 w-full max-w-xs">
        <Button3D
          variant="ghost"
          className="w-full"
          onMouseDown={() => setHeld(0.01)}
          onMouseUp={() => setHeld(0)}
          onMouseLeave={() => setHeld(0)}
          onTouchStart={() => setHeld(0.01)}
          onTouchEnd={() => setHeld(0)}
        >
          Przytrzymaj, żeby zostać
        </Button3D>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-indigo-400 transition-[width] duration-75"
            style={{ width: `${held}%` }}
          />
        </div>
      </div>
    </div>
  );
}
