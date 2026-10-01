/**
 * Cała sesja opiera się na `endsAt` w milisekundach, nigdy na odliczaniu.
 * WebView jest zamrażany przy zgaszonym ekranie, więc setInterval się rozjeżdża —
 * pozostały czas liczymy zawsze z Date.now(), a interwał tylko odświeża widok.
 */

export const PHASES = {
  focus: { label: "Skupienie", next: "break" },
  break: { label: "Przerwa", next: "focus" },
  longBreak: { label: "Długa przerwa", next: "focus" },
};

export const DEFAULT_POMODORO = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  untilLongBreak: 4, // co ile sesji skupienia wypada długa przerwa
};

export function durationFor(phase, cfg) {
  if (phase === "focus") return cfg.focusMin;
  if (phase === "longBreak") return cfg.longBreakMin;
  return cfg.breakMin;
}

export function startSession(phase, cfg, { title = "", cat = "focus" } = {}) {
  const now = Date.now();
  const minutes = durationFor(phase, cfg);
  return {
    phase,
    title,
    cat,
    startedAt: now,
    endsAt: now + minutes * 60_000,
    plannedMin: minutes,
  };
}

/** Ile sekund zostało. Ujemne wartości ścinamy do zera. */
export function remainingMs(session, now = Date.now()) {
  return Math.max(0, session.endsAt - now);
}

export function isDone(session, now = Date.now()) {
  return remainingMs(session, now) === 0;
}

/** Ile minut faktycznie zeszło — po pauzie w tle to nie musi być plannedMin. */
export function elapsedMin(session, now = Date.now()) {
  return Math.round(Math.min(now, session.endsAt) - session.startedAt) / 60_000;
}

/** Która faza po tej — długa przerwa co `untilLongBreak` sesji skupienia. */
export function nextPhase(phase, focusDone, cfg) {
  if (phase !== "focus") return "focus";
  return focusDone > 0 && focusDone % cfg.untilLongBreak === 0 ? "longBreak" : "break";
}

export function mmss(ms) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Minuty od północy dla znacznika czasu — do wpisania sesji na ścieżkę dnia. */
export function minutesOfDay(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}
