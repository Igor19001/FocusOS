# DayQuest 5.0

DayQuest 5 łączy najlepsze elementy wersji mobilnej React + Capacitor z prawdziwym kontem i synchronizacją danych.

## Co jest nowe w 5.0

- zostaje architektura **React + Vite + Capacitor**,
- zostaje natywny timer Pomodoro oparty o `endsAt`, więc wygaszony ekran nie psuje czasu,
- zostają natywne Local Notifications, sen, cykle snu, notatki, historia, Limek i Majątek,
- dochodzi **rejestracja i logowanie**,
- dochodzi **backend w Pythonie + SQLite**,
- dochodzi **synchronizacja między urządzeniami**,
- synchronizacja używa **rewizji i wykrywania konfliktów** — drugi telefon nie nadpisze po cichu pierwszego,
- aplikacja zawsze zapisuje lokalnie; chmura jest dodatkową warstwą,
- sesje w backendzie używają losowych tokenów, a w bazie zapisywany jest tylko ich hash,
- hasła: PBKDF2-HMAC-SHA256,
- sesje mają termin ważności,
- podstawowy rate limiting dla logowania/rejestracji,
- można usunąć konto i jego kopię danych z chmury,
- bloki dnia można teraz **edytować i usuwać**,
- usunięte zostały prywatne salda wpisane na sztywno w kodzie Majątku.

## Układ aplikacji

Dolna nawigacja dalej ma tylko pięć zakładek:

**Dzień · Skupienie · Notatki · Sen · Majątek**

Historia nadal otwiera się przez serię 🔥. Konto/chmura otwierają się przez ikonę użytkownika w prawym górnym rogu. Dzięki temu telefon nie dostaje szóstej zakładki.

---

# 1. Uruchomienie jako aplikacja webowa z backendem

Wymagania:
- Node.js 18+
- Python 3.10+

Zainstaluj frontend:

```bash
npm install
```

Terminal 1 — backend:

```bash
python server.py
```

Terminal 2 — Vite:

```bash
npm run dev
```

Otwórz:

```text
http://localhost:5173
```

Vite przekierowuje `/api` do `http://127.0.0.1:8787`.

## Wariant z jednym serwerem

```bash
npm run build
python server.py
```

Wtedy backend serwuje także gotowy frontend z `dist/`:

```text
http://localhost:8787
```

---

# 2. Android / Capacitor

Najpierw skonfiguruj adres publicznego backendu. Skopiuj:

```bash
cp .env.example .env.production
```

W `.env.production` ustaw np.:

```text
VITE_API_BASE=https://api.twojadomena.pl
```

**W APK nie zostawiaj tego pustego**, bo `capacitor://localhost/api` nie jest Twoim backendem.

Potem:

```bash
npm install
npx cap add android      # tylko pierwszy raz
npm run sync
npm run android
```

Jeśli platforma Android już istnieje, pomiń `npx cap add android`.

## Powiadomienia Android

Tak jak w poprzedniej wersji, w `AndroidManifest.xml` potrzebujesz odpowiednich uprawnień dla Local Notifications / exact alarms. Na Samsungach warto też wyłączyć usypianie DayQuest w ustawieniach baterii.

---

# 3. Backend

Backend nie wymaga żadnych paczek Pythona. Używa tylko standard library.

Plik:

```text
server.py
```

Baza powstaje automatycznie w:

```text
data/dayquest.db
```

Endpointy:

```text
POST   /api/register
POST   /api/login
POST   /api/logout
GET    /api/me
GET    /api/state
PUT    /api/state
DELETE /api/account
GET    /api/health
```

### Synchronizacja

Każdy stan w chmurze ma `rev`.

Przykład:
1. Telefon A pobiera `rev=12`.
2. Telefon B zapisuje i robi `rev=13`.
3. Telefon A próbuje zapisać na bazie `rev=12`.
4. Serwer odpowiada HTTP `409 Conflict` zamiast niszczyć zmiany B.
5. DayQuest pokazuje wybór: **pobierz chmurę** albo **wyślij moje dane**.

To jest celowo prostsze i bezpieczniejsze niż udawanie automatycznego merge'a dla finansów, notatek, ustawień i harmonogramu jednocześnie.

---

# 4. Zmienne backendu

Opcjonalne:

```text
PORT=8787
DAYQUEST_DB=/ścieżka/dayquest.db
SESSION_DAYS=30
CORS_ORIGINS=https://app.example.com,capacitor://localhost
```

Przy publicznym wdrożeniu ustaw `CORS_ORIGINS` jawnie.

---

# 5. Co nadal zrobiłbym przed publicznym App Store / Google Play

Ta wersja jest dużo bliżej produktu, ale przed udostępnieniem obcym użytkownikom dołożyłbym:

- HTTPS przed backendem (Caddy / nginx / Cloudflare),
- reset hasła i weryfikację e-mail,
- produkcyjny rate limiter w Redis/reverse proxy,
- backup bazy i migracje,
- monitoring błędów,
- testy E2E na realnym Androidzie,
- politykę prywatności i ekran zgód,
- eksport danych,
- automatyczne usuwanie wygasłych sesji,
- opcjonalne szyfrowanie szczególnie wrażliwych danych finansowych po stronie klienta.

## Ważne o module Majątek

DayQuest 5 nie wysyła domyślnie żadnych prywatnych sald wpisanych na sztywno w kodzie. Nowa instalacja zaczyna z pustą listą pozycji. Po zalogowaniu Twój cały stan może być synchronizowany z backendem, więc jeśli chcesz trzymać finanse wyłącznie lokalnie, po prostu nie loguj się do chmury albo w przyszłości rozdziel synchronizację modułów.
