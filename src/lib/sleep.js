import { MINUTES_IN_DAY, minutesUntil } from "./time";

/**
 * Okno snu prawie zawsze przechodzi przez północ (23:00 → 07:00), więc
 * porównanie `now >= bed && now < wake` jest tu zawsze fałszywe.
 * Stąd dwa warianty poniżej.
 */
export function isAsleepWindow(now, bed, wake) {
  return bed < wake ? now >= bed && now < wake : now >= bed || now < wake;
}

export const PHASE = {
  DAY: "day",         // normalny dzień
  WARNING: "warning", // ostatnia godzina przed snem
  NIGHT: "night",     // po godzinie snu
};

export function sleepPhase(now, { bedtime, wake, warnBefore }) {
  if (isAsleepWindow(now, bedtime, wake)) return PHASE.NIGHT;
  const toBed = minutesUntil(now, bedtime);
  if (toBed <= warnBefore) return PHASE.WARNING;
  return PHASE.DAY;
}

export function sleepInfo(now, settings) {
  const { bedtime, wake } = settings;
  const phase = sleepPhase(now, settings);
  const toBed = minutesUntil(now, bedtime);
  const toWake = minutesUntil(now, wake);
  const window = minutesUntil(bedtime, wake) || MINUTES_IN_DAY;
  return {
    phase,
    minutesToBed: toBed,
    minutesToWake: toWake,
    /** Ile snu zostało, jeśli położysz się teraz. */
    sleepIfNow: phase === PHASE.NIGHT ? toWake : window,
    windowLength: window,
  };
}
