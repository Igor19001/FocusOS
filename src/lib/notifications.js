import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { MINUTES_IN_DAY } from "./time";

/**
 * Dwa rozłączne zakresy ID. Wcześniej przeplanowanie przypomnień kasowało
 * wszystko, co czeka w kolejce — łącznie z dzwonkiem trwającego pomodoro.
 * Teraz każdy zakres kasuje tylko siebie.
 */
const DAILY = { MORNING: 101, LOG: 102, WARNING: 103, SUMMARY: 104, BEDTIME: 105 };
const POMODORO_ID = 201;

/**
 * Normalizacja do doby. Przy porze snu 00:30 ostrzeżenie wypada na -30,
 * a bez tego JS zwróciłby ujemną minutę i powiadomienie by nie wystartowało.
 */
function at(m) {
  const norm = ((m % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return { hour: Math.floor(norm / 60), minute: norm % 60 };
}

const native = () => Capacitor.isNativePlatform();

export async function ensurePermission() {
  if (!native()) return false;
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  return perm.display === "granted";
}

async function cancelIds(ids) {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch (err) {
    console.error("Nie udało się anulować powiadomień:", err);
  }
}

/* ── codzienne przypomnienia ──────────────────────────────────────── */

export async function rescheduleDaily(settings) {
  if (!native()) return { ok: false, reason: "web" };
  await cancelIds(Object.values(DAILY));
  if (!settings.notifications) return { ok: true, cancelled: true };
  if (!(await ensurePermission())) return { ok: false, reason: "denied" };

  const { bedtime, wake, warnBefore, logReminder } = settings;
  const plan = [
    { id: DAILY.MORNING, minute: wake, title: "Nowy dzień", body: "Rozpisz go, zanim się rozpisze sam." },
    { id: DAILY.LOG, minute: logReminder, title: "Zalogowałeś dzisiaj cokolwiek?", body: "Nieodhaczone bloki nie liczą się do serii." },
    { id: DAILY.WARNING, minute: bedtime - warnBefore, title: "Godzina do snu", body: "Zwijaj to, co robisz." },
    { id: DAILY.SUMMARY, minute: bedtime - 30, title: "Podsumowanie dnia", body: "Sprawdź wynik i domknij bloki." },
    { id: DAILY.BEDTIME, minute: bedtime, title: "Pora spać", body: "Seria snu leci od teraz." },
  ];

  try {
    await LocalNotifications.schedule({
      notifications: plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { on: at(n.minute), allowWhileIdle: true },
        smallIcon: "ic_stat_dayquest",
      })),
    });
    return { ok: true };
  } catch (err) {
    console.error("Nie udało się zaplanować przypomnień:", err);
    return { ok: false, reason: "error", err };
  }
}

/* ── pomodoro ─────────────────────────────────────────────────────── */

/**
 * Dzwonek na koniec sesji planowany jest z góry na konkretną datę.
 * Dzięki temu zadzwoni nawet wtedy, gdy system ubije apkę w tle.
 */
export async function schedulePomodoroEnd(session) {
  if (!native()) return;
  if (!(await ensurePermission())) return;
  await cancelIds([POMODORO_ID]);

  const focus = session.phase === "focus";
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: POMODORO_ID,
          title: focus ? "Sesja skończona" : "Przerwa skończona",
          body: focus ? "Wstań na chwilę. Blok wpadł na ścieżkę dnia." : "Wracaj do roboty.",
          schedule: { at: new Date(session.endsAt), allowWhileIdle: true },
          smallIcon: "ic_stat_dayquest",
        },
      ],
    });
  } catch (err) {
    console.error("Nie udało się zaplanować dzwonka pomodoro:", err);
  }
}

export const cancelPomodoro = () => cancelIds([POMODORO_ID]);
