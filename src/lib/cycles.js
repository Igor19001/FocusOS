import { MINUTES_IN_DAY, minutesUntil } from "./time";

/**
 * 90 minut to uśredniona długość cyklu, nie stała. U realnych ludzi cykl waha
 * się mniej więcej między 70 a 120 minutami i wydłuża się nad ranem. Dlatego
 * `cycleMin` jest w ustawieniach — po dwóch tygodniach budzenia się będziesz
 * wiedział, czy Twój cykl jest krótszy czy dłuższy, i podkręcisz liczbę.
 */
export const DEFAULT_CYCLE = 90;
export const DEFAULT_FALL_ASLEEP = 15;

/** Ile pełnych cykli mieści się w danym czasie snu. */
export const cyclesIn = (sleepMin, cycleMin) => sleepMin / cycleMin;

/**
 * Kładę się teraz — o której wstać.
 * Liczone od momentu zaśnięcia, czyli teraz + czas na zaśnięcie.
 */
export function wakeOptions(fromMin, { fallAsleep, cycleMin }, counts = [3, 4, 5, 6]) {
  return counts.map((n) => {
    const sleep = n * cycleMin;
    return {
      cycles: n,
      sleepMin: sleep,
      at: (fromMin + fallAsleep + sleep) % MINUTES_IN_DAY,
      totalMin: fallAsleep + sleep,
    };
  });
}

/**
 * Wstaję o stałej godzinie — o której się położyć.
 * Cofamy pełne cykle i jeszcze czas na zaśnięcie.
 */
export function bedOptions(wakeMin, { fallAsleep, cycleMin }, counts = [6, 5, 4]) {
  return counts.map((n) => {
    const sleep = n * cycleMin;
    const at = ((wakeMin - sleep - fallAsleep) % MINUTES_IN_DAY + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    return { cycles: n, sleepMin: sleep, at, totalMin: fallAsleep + sleep };
  });
}

/**
 * Czy ustawiony plan (sen → pobudka) trafia w pełne cykle?
 * Zwraca też najbliższe godziny pobudki, które by trafiały.
 */
export function scheduleFit(bedtime, wake, { fallAsleep, cycleMin }) {
  const window = minutesUntil(bedtime, wake) || MINUTES_IN_DAY;
  const sleepMin = Math.max(0, window - fallAsleep);
  const exact = cyclesIn(sleepMin, cycleMin);
  const down = Math.floor(exact);
  const up = Math.ceil(exact);
  const wakeAt = (n) => (bedtime + fallAsleep + n * cycleMin) % MINUTES_IN_DAY;

  return {
    window,
    sleepMin,
    cycles: exact,
    /** Tolerancja 5 minut — plan 5,03 cyklu traktujemy jako trafiony. */
    onCycle: Math.abs(exact - Math.round(exact)) * cycleMin <= 5,
    nearest: down === up ? [wakeAt(down)] : [wakeAt(down), wakeAt(up)],
    nearestCycles: down === up ? [down] : [down, up],
  };
}

/** "5 cykli" / "5,5 cyklu" po polsku, bez odmieniania na siłę. */
export function cycleLabel(n) {
  const rounded = Math.round(n * 10) / 10;
  const txt = String(rounded).replace(".", ",");
  return Number.isInteger(rounded) && rounded === 1 ? "1 cykl" : `${txt} cyklu`.replace(/^(\d+) cyklu$/, "$1 cykli");
}
