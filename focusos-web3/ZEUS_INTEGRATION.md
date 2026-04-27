# 🤖 ZEUS HOLOGRAM - Integration Guide

## Struktura plików

```
src/
├── components/
│   └── ZeusHologram/
│       ├── ZeusHologram.jsx          ← Main component
│       └── ZeusHologram.module.css   ← All styles & animations
├── hooks/
│   └── useZeusMessages.js            ← Message logic hook
└── App.jsx                           ← Dodaj import tutaj
```

---

## Instalacja w App.jsx

### 1. Dodaj import na górze pliku:

```jsx
import ZeusHologram from './components/ZeusHologram/ZeusHologram';
```

### 2. Zdefiniuj state dla Zeus'a (jeśli nie masz):

```jsx
const [currentTab, setCurrentTab] = useState('Skupienie');
const [sessionActive, setSessionActive] = useState(false);
const [streakDays, setStreakDays] = useState(0);
const [lastSessionDuration, setLastSessionDuration] = useState(0);
```

### 3. Dodaj komponent na samym końcu App.jsx (przed zamknięciem return):

```jsx
return (
  <div className="app-container">
    {/* Reszta aplikacji */}
    <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
    
    <main className="main-content">
      {/* Zawartość kart */}
      <Routes>
        <Route path="/skupienie" element={<Skupienie />} />
        <Route path="/statystyki" element={<Statystyki />} />
        {/* ... inne trasy ... */}
      </Routes>
    </main>

    {/* ⭐ ZEUS HOLOGRAM - Zawsze widoczny */}
    <ZeusHologram
      currentTab={currentTab}
      sessionActive={sessionActive}
      streakDays={streakDays}
      lastSessionDuration={lastSessionDuration}
      onSessionStart={() => console.log('Sesja zaraz się zaczyna!')}
      onSessionEnd={() => console.log('Sesja zakończona!')}
    />
  </div>
);
```

---

## Props Interface

| Prop | Type | Default | Opis |
|------|------|---------|------|
| `currentTab` | string | 'Skupienie' | Aktalna aktywna karta |
| `sessionActive` | boolean | false | Czy sesja w toku |
| `streakDays` | number | 0 | Liczba dni streak'u |
| `lastSessionDuration` | number | 0 | Czas ostatniej sesji (minuty) |
| `onSessionStart` | function | () => {} | Callback gdy sesja się zaczyna |
| `onSessionEnd` | function | () => {} | Callback gdy sesja się kończy |

---

## Jak aktualizować state

### Zmiana karty:
```jsx
const handleTabChange = (tab) => {
  setCurrentTab(tab); // Zeus zareaguje automatycznie
};
```

### Sesja zmienia się:
```jsx
const startSession = () => {
  setSessionActive(true);
  // Zeus pokaże "🚀 Rozpoczynamy! Zrobisz to!" z bounce animacją
};

const endSession = (duration) => {
  setSessionActive(false);
  setLastSessionDuration(duration);
  // Zeus pokaże gratulacje z glow animacją
};
```

### Aktualizuj streak:
```jsx
useEffect(() => {
  // Pobierz streak z API/localStorage
  const streak = getStreakFromStorage();
  setStreakDays(streak);
}, []);
```

---

## CSS Integracja

### Upewnij się, że Twoja aplikacja ma dark theme:

W globalnym CSS:
```css
:root {
  --bg-dark: #0f141e;
  --accent-cyan: #00e5ff;
  --accent-purple: #7c3aed;
  --text-light: #e0f7ff;
}

body {
  background: var(--bg-dark);
  color: var(--text-light);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
}
```

---

## Zachowania Zeusa

### 1. **Zmiana Karty**
Gdy użytkownik kliknie na inną kartę → Zeus pokazuje kontekstową wiadomość
- Skupienie: "💪 Nic cię nie rozprasza..."
- Statystyki: "📊 Nieźle się robimy!..."
- Raport: "📋 Raport gotów. Czas celebrować!..."
- itp.

### 2. **Start Sesji**
Gdy `sessionActive` zmieni się na true → bounce animation + "🚀 Rozpoczynamy!"

### 3. **Koniec Sesji**
Gdy `sessionActive` zmieni się na false → glow animation + gratulacje

### 4. **Streak Milestone**
Gdy `streakDays` jest wielokrotnością 7 → "🔥 POTĘGA! X dni bez przerwania!"

### 5. **Idle Messages**
Co 60 sekund, jeśli sesja nieaktywna → random wisdom quote

---

## Customizacja Wiadomości

Edytuj `useZeusMessages.js`:

```jsx
const messagesByTab = {
  Skupienie: [
    '💪 Nic cię nie rozprasza. Jesteś niezniszczalny!',
    '⚡ Każda minuta liczy się. Skoncentruj się!',
    // Dodaj więcej...
  ],
  // itp.
};
```

---

## Customizacja Stylu

Edytuj `ZeusHologram.module.css`:

### Zmień kolor glow:
```css
--accent-cyan: #00FF00; /* Green glow zamiast cyan */
```

### Zmień rozmiar orba (desktop):
```css
.zeusOrbCollapsed {
  width: 70px;  /* zamiast 60px */
  height: 70px; /* zamiast 60px */
}
```

### Zmień rozmiar panelu:
```css
.zeusPanel {
  min-width: 320px; /* zamiast 280px */
}
```

---

## Performance Tips

✅ **Już zoptymalizowane:**
- Wszystkie animacje używają CSS transforms (GPU accelerated)
- Brak render loops - używamy React hooks efektywnie
- CSS-only animations = zero JavaScript overhead
- localStorage caches preference

✅ **Dodatkowo możesz:**
- Lazy load component: `React.lazy(() => import('./ZeusHologram'))`
- Memoize component: `export default React.memo(ZeusHologram)`

---

## Accessibility

✅ Komponent wspiera:
- Keyboard navigation (Tab do orba)
- Screen readers (aria-labels)
- Reduced motion preferences (@media prefers-reduced-motion)
- High contrast modes

---

## Mobile Behavior

- Na mobile (<768px) orb przesuwa się do bottom-right
- Rozmiar zmniejsza się do 52x52px
- Panel się skraca do 240px
- Wiadomości są mniejsze (13px zamiast 14px)

---

## Troubleshooting

### Problem: Zeus nie pojawia się
**Rozwiązanie:** Upewnij się, że `z-index: 9999` nie koliduje z innymi elementami

### Problem: Wiadomości nie zmieniają się
**Rozwiązanie:** Upewnij się, że `currentTab` prop się aktualizuje gdy zmienia się karta

### Problem: Animacje są ruggy
**Rozwiązanie:** Sprawdź, czy masz `will-change: transform` w CSS (jest już w kcie)

---

## Exemple pełnej integracji

```jsx
import React, { useState, useEffect } from 'react';
import ZeusHologram from './components/ZeusHologram/ZeusHologram';
import './App.css';

export default function App() {
  const [currentTab, setCurrentTab] = useState('Skupienie');
  const [sessionActive, setSessionActive] = useState(false);
  const [streakDays, setStreakDays] = useState(12);

  // Pobierz streaka ze storage
  useEffect(() => {
    const stored = localStorage.getItem('streak');
    if (stored) {
      setStreakDays(parseInt(stored));
    }
  }, []);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        {['Skupienie', 'Statystyki', 'Raport', 'Zdrowie', 'Sen', 'Ustawienia', 'O aplikacji', 'Profil'].map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={currentTab === tab ? 'active' : ''}
          >
            {tab}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="content">
        {currentTab === 'Skupienie' && <Skupienie setSessionActive={setSessionActive} />}
        {currentTab === 'Statystyki' && <Statystyki />}
        {/* ... itp ... */}
      </main>

      {/* ⭐ ZEUS - Zawsze dostępny */}
      <ZeusHologram
        currentTab={currentTab}
        sessionActive={sessionActive}
        streakDays={streakDays}
      />
    </div>
  );
}
```

---

## GOTOWE! 🎉

Zeus jest teraz integralną częścią Twojej aplikacji. Odtąd będzie:
- ✅ Reagować na zmianę karty
- ✅ Motywować podczas sesji
- ✅ Gratulować po sesji
- ✅ Pokazywać random wisdom co 60 sekund
- ✅ Pracować na mobile
- ✅ Zapamiętywać preferencje użytkownika
