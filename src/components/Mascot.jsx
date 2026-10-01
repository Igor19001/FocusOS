/**
 * Limek — maskotka DayQuest.
 * Czysty SVG, bez plików graficznych: skaluje się, sam łapie ciemny motyw
 * i waży zero. Miny sterowane propem `mood`.
 */

const MOODS = {
  idle: { eyes: "open", mouth: "M 34 56 Q 44 62 54 56", body: "text-lime-500" },
  proud: { eyes: "happy", mouth: "M 32 54 Q 44 66 56 54", body: "text-lime-500" },
  ok: { eyes: "open", mouth: "M 34 56 Q 44 61 54 56", body: "text-lime-500" },
  worried: { eyes: "worried", mouth: "M 34 60 Q 44 54 54 60", body: "text-amber-500" },
  focus: { eyes: "focus", mouth: "M 36 58 L 52 58", body: "text-sky-500" },
  sleeping: { eyes: "closed", mouth: "M 38 58 Q 44 62 50 58", body: "text-indigo-400" },
};

function Eyes({ kind }) {
  const white = "fill-white";
  const pupil = "fill-slate-900";

  if (kind === "closed" || kind === "happy") {
    return (
      <g className="stroke-slate-900" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d={kind === "happy" ? "M 28 40 Q 33 34 38 40" : "M 28 40 Q 33 45 38 40"} />
        <path d={kind === "happy" ? "M 50 40 Q 55 34 60 40" : "M 50 40 Q 55 45 60 40"} />
      </g>
    );
  }

  const dy = kind === "focus" ? 2 : 0;
  return (
    <g>
      <ellipse cx="33" cy="39" rx="7" ry={kind === "focus" ? 5 : 8} className={white} />
      <ellipse cx="55" cy="39" rx="7" ry={kind === "focus" ? 5 : 8} className={white} />
      <circle cx="33" cy={40 + dy} r="3.5" className={pupil} />
      <circle cx="55" cy={40 + dy} r="3.5" className={pupil} />
      {kind === "worried" && (
        <g className="stroke-slate-900" strokeWidth="2.5" strokeLinecap="round">
          <path d="M 26 29 L 39 33" />
          <path d="M 62 29 L 49 33" />
        </g>
      )}
    </g>
  );
}

export function Mascot({ mood = "idle", size = 96, className = "" }) {
  const m = MOODS[mood] ?? MOODS.idle;

  return (
    <svg
      viewBox="0 0 88 92"
      width={size}
      height={(size * 92) / 88}
      className={`${m.body} ${className}`}
      role="img"
      aria-label="Limek"
    >
      {/* kiełek */}
      <path
        d="M 44 14 C 44 6 50 2 56 3 C 56 10 51 14 44 14 Z"
        className="fill-current opacity-70"
      />
      <path d="M 44 20 L 44 13" className="stroke-current" strokeWidth="3" strokeLinecap="round" />

      {/* ciało — ten sam promień zaokrąglenia co karty w apce */}
      <rect x="8" y="18" width="72" height="66" rx="24" className="fill-current" />
      <rect x="8" y="18" width="72" height="66" rx="24" className="fill-slate-900/10" />
      <rect x="8" y="18" width="72" height="60" rx="24" className="fill-current" />

      <Eyes kind={m.eyes} />
      <path d={m.mouth} className="stroke-slate-900" strokeWidth="3" strokeLinecap="round" fill="none" />

      {mood === "sleeping" && (
        <g className="fill-current opacity-80">
          <text x="66" y="24" fontSize="13" fontWeight="900">z</text>
          <text x="74" y="15" fontSize="9" fontWeight="900">z</text>
        </g>
      )}
    </svg>
  );
}

/** Dobiera minę i tekst do stanu dnia. Bez owijania w bawełnę, ale bez dokopywania. */
export function mascotState({ phase, focusRunning, score, streak, doneCount, nowMin, bedtime }) {
  if (phase === "night") {
    return { mood: "sleeping", line: "Śpię. Ty też powinieneś." };
  }
  if (focusRunning) {
    return { mood: "focus", line: "Nie dotykaj telefonu. Licznik leci." };
  }
  if (score >= 80) {
    return { mood: "proud", line: streak > 0 ? `Dzień zamknięty. Seria: ${streak}.` : "Dzień zamknięty." };
  }
  if (score >= 50) {
    return { mood: "ok", line: "Idzie nieźle. Domknij resztę." };
  }
  // Po ostatniej trzeciej dnia brak wyniku to już nie jest „jeszcze zdążysz".
  const lateInDay = nowMin > bedtime - 240;
  if (lateInDay && score < 50) {
    return {
      mood: "worried",
      line: doneCount === 0 ? "Zero bloków. Dzisiaj seria leci w dół." : "Wynik za niski na serię. Zostały godziny.",
    };
  }
  return { mood: "idle", line: doneCount === 0 ? "Rozpisz dzień." : "Leć dalej." };
}
