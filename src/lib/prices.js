import { Capacitor, CapacitorHttp } from "@capacitor/core";

/**
 * Żaden klucz nie jest wymagany. Kolejność źródeł:
 *   1. Binance — publiczny ticker, bez klucza, bez limitu, który byś zauważył.
 *   2. CoinGecko keyless — dla tokenów, których Binance nie notuje.
 *   3. Cena wpisana ręcznie — dla reszty, np. Kintsu Staked Monad.
 * Klucz demo CoinGecko jest opcjonalny i podnosi tylko limity.
 */

const BINANCE = "https://api.binance.com/api/v3/ticker/price";
const COINGECKO = "https://api.coingecko.com/api/v3/simple/price";
const NBP = "https://api.nbp.pl/api/exchangerates/rates/a";

/** Pary na Binance. Czego tu nie ma, leci do CoinGecko. */
const BINANCE_PAIRS = {
  SOL: "SOLUSDT", BNB: "BNBUSDT", BTC: "BTCUSDT", ETH: "ETHUSDT",
  BONK: "BONKUSDT", USDC: "USDCUSDT", PEPE: "PEPEUSDT",
};

/** Identyfikatory CoinGecko dla tego, czego Binance nie ma. */
const GECKO_IDS = { MON: "monad", SOL: "solana", BNB: "binancecoin", BONK: "bonk" };

/**
 * W WebView zwykły fetch dostaje blokadę CORS. CapacitorHttp robi żądanie
 * natywnie, po stronie Androida, więc CORS w ogóle nie wchodzi w grę —
 * i dlatego ta apka nie potrzebuje własnego backendu.
 */
async function getJSON(url, headers = {}) {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, headers });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Kursy walut z NBP — oficjalne, darmowe, bez klucza. */
export async function fetchFx() {
  const out = { PLN: 1 };
  for (const cur of ["usd", "eur"]) {
    try {
      const data = await getJSON(`${NBP}/${cur}/?format=json`);
      out[cur.toUpperCase()] = data.rates[0].mid;
    } catch (err) {
      console.error(`Nie udało się pobrać kursu ${cur}:`, err);
    }
  }
  return out;
}

async function fromBinance(symbols) {
  const wanted = symbols.filter((s) => BINANCE_PAIRS[s]);
  if (!wanted.length) return {};
  const out = {};
  try {
    const list = await getJSON(BINANCE);
    const map = new Map(list.map((t) => [t.symbol, Number(t.price)]));
    for (const s of wanted) {
      const price = map.get(BINANCE_PAIRS[s]);
      if (price > 0) out[s] = { usd: price, source: "binance" };
    }
  } catch (err) {
    console.error("Binance nie odpowiedział:", err);
  }
  return out;
}

async function fromCoinGecko(symbols, demoKey) {
  const wanted = symbols.filter((s) => GECKO_IDS[s]);
  if (!wanted.length) return {};
  const ids = wanted.map((s) => GECKO_IDS[s]).join(",");
  const headers = demoKey ? { "x-cg-demo-api-key": demoKey } : {};
  const out = {};
  try {
    const data = await getJSON(`${COINGECKO}?ids=${ids}&vs_currencies=usd`, headers);
    for (const s of wanted) {
      const price = data[GECKO_IDS[s]]?.usd;
      if (price > 0) out[s] = { usd: price, source: "coingecko" };
    }
  } catch (err) {
    console.error("CoinGecko nie odpowiedział:", err);
  }
  return out;
}

/**
 * Pobiera ceny wszystkich potrzebnych symboli.
 * Nigdy nie rzuca — brak jednej ceny nie może wywalić całego majątku.
 */
export async function fetchPrices(symbols, { demoKey } = {}) {
  const uniq = [...new Set(symbols)].filter(Boolean);
  const binance = await fromBinance(uniq);
  const missing = uniq.filter((s) => !binance[s]);
  const gecko = missing.length ? await fromCoinGecko(missing, demoKey) : {};
  return { ...gecko, ...binance, _at: Date.now() };
}
