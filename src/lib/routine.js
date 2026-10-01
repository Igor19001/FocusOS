import { Brain, BookOpen, Dumbbell, Coffee, Gamepad2 } from "lucide-react";

/**
 * Klasy Tailwind są wypisane w całości celowo — Tailwind skanuje źródło jako
 * zwykły tekst, więc `bg-${color}-500` zostałoby wycięte w buildzie produkcyjnym.
 */
export const CATEGORIES = {
  focus: {
    label: "Głęboka praca", Icon: Brain, weight: 1.4,
    solid: "bg-sky-500", edge: "border-sky-700",
    soft: "bg-sky-100 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300",
    faint: "bg-sky-200 dark:bg-sky-900",
  },
  study: {
    label: "Nauka", Icon: BookOpen, weight: 1.3,
    solid: "bg-violet-500", edge: "border-violet-700",
    soft: "bg-violet-100 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300",
    faint: "bg-violet-200 dark:bg-violet-900",
  },
  move: {
    label: "Ruch", Icon: Dumbbell, weight: 1.2,
    solid: "bg-orange-500", edge: "border-orange-700",
    soft: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300",
    faint: "bg-orange-200 dark:bg-orange-900",
  },
  care: {
    label: "Regeneracja", Icon: Coffee, weight: 0.8,
    solid: "bg-teal-500", edge: "border-teal-700",
    soft: "bg-teal-100 dark:bg-teal-950", text: "text-teal-700 dark:text-teal-300",
    faint: "bg-teal-200 dark:bg-teal-900",
  },
  leisure: {
    label: "Luz", Icon: Gamepad2, weight: 0.6,
    solid: "bg-pink-500", edge: "border-pink-700",
    soft: "bg-pink-100 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300",
    faint: "bg-pink-200 dark:bg-pink-900",
  },
};

/** Minuty od północy → "HH:MM" */
export const fmt = (m) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;

/** Minuty → "2h 15m" */
export const hours = (m) =>
  m % 60 === 0 ? `${m / 60}h` : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;

export const xpFor = (b) =>
  Math.max(5, Math.round((b.duration / 10) * CATEGORIES[b.cat].weight) * 5);

/** Wynik dnia 0–100: 70 pkt za ukończenie planu, 30 pkt za udział skupienia. */
export function dayStats(blocks) {
  const planned = blocks.reduce((s, b) => s + b.duration, 0);
  const done = blocks.filter((b) => b.done).reduce((s, b) => s + b.duration, 0);
  const focus = blocks
    .filter((b) => b.done && (b.cat === "focus" || b.cat === "study"))
    .reduce((s, b) => s + b.duration, 0);
  const completion = planned ? done / planned : 0;
  const focusShare = done ? focus / done : 0;
  return {
    planned, done, focus,
    pct: Math.round(completion * 100),
    focusShare: Math.round(focusShare * 100),
    score: Math.round(completion * 70 + Math.min(focusShare / 0.4, 1) * 30),
    doneCount: blocks.filter((b) => b.done).length,
  };
}

/**
 * Dzień liczy się do serii, jeśli wynik osiągnął ten próg.
 * Podnieś, jeśli chcesz, żeby apka kopała mocniej.
 */
export const STREAK_THRESHOLD = 50;
