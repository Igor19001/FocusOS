import { useEffect, useState } from "react";

export const MINUTES_IN_DAY = 1440;

/** Bieżąca minuta doby, liczona lokalnie na telefonie. */
export function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Klucz dnia "2026-09-05" w czasie lokalnym, nie UTC. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function shiftDay(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

/** Różnica w minutach do przodu, z przejściem przez północ. */
export function minutesUntil(from, to) {
  return (to - from + MINUTES_IN_DAY) % MINUTES_IN_DAY;
}

/**
 * Zegar aplikacji. Odświeża się co 30 s i dodatkowo natychmiast po powrocie
 * z tła — bez tego apka po odblokowaniu telefonu pokazywałaby stary czas.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);

  return now;
}
