import { Preferences } from "@capacitor/preferences";

/**
 * Jeden klucz, jeden obiekt stanu. Preferences na Androidzie zapisuje do
 * natywnego magazynu, a w przeglądarce sam schodzi do localStorage —
 * dlatego `npm run dev` działa tak samo jak APK.
 */
const KEY = "dayquest.state.v1";

export const DEFAULT_STATE = {
  version: 5,
  xp: 0,
  history: {},          // { "2026-09-05": { blocks, score, claimed, focusDone } }
  session: null,        // trwająca sesja pomodoro, przeżywa zamknięcie apki
  notes: [],
  settings: {
    bedtime: 23 * 60,   // 23:00
    wake: 7 * 60,       // 07:00
    warnBefore: 60,     // ostrzeżenie godzinę przed snem
    fallAsleep: 15,     // ile schodzi na zaśnięcie
    cycleMin: 90,       // długość jednego cyklu snu
    logReminder: 18 * 60,
    windDown: true,
    theme: "system",    // "system" | "light" | "dark"
    notifications: true,
    pomodoro: { focusMin: 25, breakMin: 5, longBreakMin: 15, untilLongBreak: 4 },
  },
  finance: {
    accounts: [],       // puste = użyj SEED_ACCOUNTS z lib/networth.js
    prices: {},         // ostatnie pobrane ceny, żeby suma działała offline
    fx: { PLN: 1 },     // kursy NBP
    fetchedAt: null,
    coingeckoKey: "",   // opcjonalny klucz demo, tylko dla wyższych limitów
    goals: { netWorth: null, deadline: null, monthlyIncome: null },
  },
};

/** Scalanie płytkie po sekcjach — nowe pola w DEFAULT_STATE nie wywalają zapisu. */
function merge(saved) {
  if (!saved || typeof saved !== "object") return DEFAULT_STATE;
  return {
    ...DEFAULT_STATE,
    ...saved,
    settings: {
      ...DEFAULT_STATE.settings,
      ...(saved.settings || {}),
      pomodoro: { ...DEFAULT_STATE.settings.pomodoro, ...(saved.settings?.pomodoro || {}) },
    },
    finance: {
      ...DEFAULT_STATE.finance,
      ...(saved.finance || {}),
      goals: { ...DEFAULT_STATE.finance.goals, ...(saved.finance?.goals || {}) },
    },
    history: saved.history || {},
    notes: saved.notes || [],
  };
}

export async function loadState() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return merge(value ? JSON.parse(value) : null);
  } catch (err) {
    console.error("Nie udało się odczytać stanu:", err);
    return DEFAULT_STATE;
  }
}

let queue = Promise.resolve();

/** Zapisy są kolejkowane, więc dwa szybkie kliknięcia nie nadpiszą się nawzajem. */
export function saveState(state) {
  queue = queue
    .then(() => Preferences.set({ key: KEY, value: JSON.stringify(state) }))
    .catch((err) => console.error("Nie udało się zapisać stanu:", err));
  return queue;
}
