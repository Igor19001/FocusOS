/**
 * Każda pozycja ma OSOBNE źródło salda i OSOBNE źródło ceny.
 * BONK: cena łatwa, saldo w programie na Solanie — ilość ręcznie, cena z API.
 * Kintsu: saldo widać w portfelu, ceny nikt nie notuje — ilość i cena ręcznie.
 * Pekao: jedna kwota, żadnej ceny — tryb "amount".
 * Bez tego rozdziału jedna brakująca cena wywala całą sumę.
 */

export const MODES = {
  amount: "Kwota",   // wpisujesz gotową wartość w walucie konta
  asset: "Aktywo",   // ilość × cena (z API albo ręczna)
};

/** Stan startowy z Twoich zrzutów z 5 września. Wszystko edytowalne. */
export const SEED_ACCOUNTS = [];

/** Wartość jednej pozycji w PLN. Zwraca też powód, gdy się nie da policzyć. */
export function valueOf(acc, prices, fx) {
  if (acc.mode === "amount") {
    const rate = fx[acc.currency ?? "PLN"];
    if (!rate) return { pln: null, reason: `brak kursu ${acc.currency}` };
    return { pln: (acc.amount ?? 0) * rate };
  }

  const qty = acc.qty ?? 0;

  if (acc.manualPrice != null) {
    const rate = fx[acc.priceCurrency ?? "PLN"];
    if (!rate) return { pln: null, reason: `brak kursu ${acc.priceCurrency}` };
    return { pln: qty * acc.manualPrice * rate, manual: true };
  }

  const p = prices[acc.symbol];
  if (!p || !fx.USD) return { pln: null, reason: `brak ceny ${acc.symbol}` };
  return { pln: qty * p.usd * fx.USD, source: p.source };
}

export function summarize(accounts, prices, fx) {
  let total = 0;
  let liquid = 0;
  let locked = 0;
  const missing = [];

  const rows = accounts.map((acc) => {
    const v = valueOf(acc, prices, fx);
    if (v.pln == null) missing.push({ name: acc.name, reason: v.reason });
    else {
      total += v.pln;
      if (acc.liquid) liquid += v.pln;
      else locked += v.pln;
    }
    return { ...acc, value: v };
  });

  return { rows, total, liquid, locked, missing };
}

/** Symbole, dla których trzeba odpytać ceny — bez tych z ceną ręczną. */
export const symbolsNeeded = (accounts) =>
  accounts.filter((a) => a.mode === "asset" && a.manualPrice == null).map((a) => a.symbol);

export const plnFmt = (n) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n || 0);

export const plnExact = (n) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n || 0);

/**
 * Rozbicie celu na rok, miesiąc i dzień — czyli "co muszę zrobić, żeby to osiągnąć".
 */
export function goalPlan({ target, current, deadline }, today = new Date()) {
  if (!target || target <= 0) return null;
  const gap = target - (current || 0);
  if (gap <= 0) return { done: true, gap: 0 };

  const end = deadline ? new Date(deadline) : null;
  const days = end ? Math.max(1, Math.ceil((end - today) / 86_400_000)) : null;

  return {
    done: false,
    gap,
    days,
    perDay: days ? gap / days : null,
    perMonth: days ? gap / (days / 30.44) : null,
    perYear: days ? gap / (days / 365.25) : null,
    pct: Math.min(100, Math.round(((current || 0) / target) * 100)),
  };
}
