# FocusOS UX Redesign - Architecture & Implementation Guide

## 🎯 Overview

This redesign implements a **radically simplified UI** with **Progressive Disclosure** principles. The goal is **Frictionless Entry** – new users can start a focus session in 2 seconds with zero friction.

---

## 📐 Architecture

### Component Structure

```
App.tsx (Main orchestrator)
├── Onboarding.tsx (3-option login screen)
├── Home.tsx (Minimalist focus timer + task input)
├── NavigationDrawer.tsx (Progressive disclosure menu)
│   ├── Desktop: Always-visible sidebar (collapses to icons)
│   └── Mobile: Bottom nav + slide-out drawer
├── SecondaryPanel.tsx (Modal for Stats, Health, Web3, Settings)
└── Background & Tutorial (BackgroundScene, FocusTutorial)
```

### Data Flow

```
App.tsx (Central State Management)
    ↓
    ├── sessionRunning, sessionMinutes, taskDescription
    ├── selectedNavSection, selectedSecondaryPanel
    ├── Web3/Health tracking state
    └── UI feedback (toast notifications)
    ↓
    [Distributes to children via props]
```

---

## 🎨 Key UX Principles Implemented

### 1. **Frictionless Entry (Zero Resistance)**
- **No dashboard on first load** – User sees login/demo options
- **3 giant, obvious buttons** – Demo, Wallet, Gmail
- **One action to focus** – Task input + START button

**Implementation:**
```tsx
// In App.tsx: Onboarding renders when !mode
if (!mode) {
  return <Onboarding onDemoMode={...} onWalletConnect={...} />;
}
```

### 2. **Zen Mode (Visual Isolation)**
- When session starts (`sessionRunning === true`):
  - **Timer becomes MASSIVE** (9xl gradient)
  - **Rest of UI fades to 15% opacity** (dimmed overlay)
  - **Message appears**: "Focus. Nothing else matters right now."
  - **All secondary features hidden**

**Implementation:**
```tsx
// In Home.tsx
const containerVariants = {
  normal: { opacity: 1, scale: 1 },
  zen: { opacity: 0.15, scale: 0.98, pointerEvents: "none" },
};

// During session: blur effect + overlay
{isZenMode && <motion.div className="... backdrop-blur-sm" />}
```

### 3. **Progressive Disclosure (Hidden Complexity)**
- **Default view**: Only timer, task input, START button
- **Advanced features** accessed via:
  - **Desktop**: Left sidebar (icons → expanded menu)
  - **Mobile**: Bottom nav + slide-out drawer
- **Each section** (Stats, Health, Web3, Settings) is a modal overlay

**Navigation Sections:**
- **Statistics** – Session history, weekly breakdown, trends
- **Health Tracker** – Water intake, sleep, break reminders
- **Web3 & Tokens** – Wallet connection, FCS balance, buy/sell
- **Settings** – Preferences, connections, account management

### 4. **Mobile-First Responsive Design**

#### Desktop Layout (md+)
```
┌─────────────┬──────────────────────────────────┐
│   Sidebar   │                                  │
│  (20-30%)   │      Main Content Area           │
│             │   (Home Component)               │
│  - Stats    │    ┌──────────────────────────┐  │
│  - Health   │    │                          │  │
│  - Web3     │    │      00:45                │  │
│  - Settings │    │  What are you doing?     │  │
│             │    │  ┌─────────────────────┐ │  │
│             │    │  │  START FOCUS SESSION│ │  │
│             │    │  └─────────────────────┘ │  │
│             │    └──────────────────────────┘  │
└─────────────┴──────────────────────────────────┘
```

#### Mobile Layout (< md)
```
┌────────────────────────┐
│ FocusOS  ≡             │  ← Top bar (hidden in zen mode)
├────────────────────────┤
│                        │
│      00:45             │
│  What are you doing?   │
│  ┌──────────────────┐  │
│  │ START FOCUS      │  │
│  └──────────────────┘  │
│                        │
├────────────────────────┤ safe-area
│[icon][icon][icon][≡]   │  ← Bottom nav
└────────────────────────┘
```

---

## 🔄 User Flows

### Flow 1: New User (Entry Point)
```
[Landing Page]
    ↓ (Choose mode)
    ├→ [Demo Mode] → App with local storage
    ├→ [Wallet] → Connect wallet → App
    └→ [Gmail] → Input email → App
    ↓
[Home Screen - Minimalist]
    ↓ (Enter task)
[START button available]
    ↓ (Click START)
[Zen Mode Activated]
    ↓ (Session runs)
[Click "End Session"]
    ↓
[Reward shown, return to Home]
```

### Flow 2: Accessing Advanced Features
```
[Home Screen - In Session]
    (Menu disabled, everything dimmed)
    ↓
[End Session or Pause]
    ↓
[Sidebar/Bottom Nav becomes active]
    ↓ (Click "Statistics")
[SecondaryPanel opens as modal]
    ├─ Show: Weekly charts, total hours, streak
    └─ Close: Return to Home
```

### Flow 3: Web3 Integration (Post-Session)
```
[Session Complete]
    ↓ (User gets toast: "+25 FCS earned")
    ↓
[User clicks "Web3 & Tokens" in menu]
    ↓
[SecondaryPanel shows wallet status]
    ├─ If connected: Display balance, buy/sell buttons
    └─ If not: "Connect Wallet" button
```

---

## 📱 Component Props & APIs

### `Home.tsx`
```tsx
interface HomeProps {
  sessionRunning: boolean;           // Is session active?
  sessionMinutes: number;             // Time elapsed
  taskDescription: string;            // User's current task
  onSessionToggle: () => void;       // Start/Stop session
  onTaskChange: (task: string) => void;
  onResetSession: () => void;        // Reset all metrics
  isZenMode: boolean;                // Trigger blur effect
}
```

### `NavigationDrawer.tsx`
```tsx
interface NavigationDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSection: NavSection | null;  // "stats" | "health" | "web3" | "settings"
  onSelectSection: (section: NavSection) => void;
  isMobile: boolean;
  isSessionRunning: boolean;         // Disables menu during session
}
```

### `SecondaryPanel.tsx`
```tsx
interface SecondaryPanelProps {
  isOpen: boolean;
  section: SecondarySection | null;
  onClose: () => void;
  // Stats
  totalSessions?: number;
  totalMinutes?: number;
  bestStreak?: number;
  // Web3
  address?: string;
  fcsBalance?: number;
  onBuyFCS?: (amount: number) => void;
  // Etc.
}
```

---

## 🎭 State Management in App.tsx

```tsx
// UI State
const [sessionRunning, setSessionRunning] = useState(false);
const [sessionMinutes, setSessionMinutes] = useState(0);
const [taskDescription, setTaskDescription] = useState("");
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
const [isNavOpen, setIsNavOpen] = useState(false);
const [selectedNavSection, setSelectedNavSection] = useState<NavSection | null>(null);
const [selectedSecondaryPanel, setSelectedSecondaryPanel] = useState<SecondarySection | null>(null);

// Health/Wellness Tracking
const [waterSlotsUsed, setWaterSlotsUsed] = useState(0);
const [sleepHours, setSleepHours] = useState(7.5);
const [totalSessions, setTotalSessions] = useState(47);

// Web3 (Wallet, Tokens)
const [buyAmount, setBuyAmount] = useState(50);
const [sellAmount, setSellAmount] = useState(20);

// Feedback & Status
const [txMessage, setTxMessage] = useState("");
const [txTone, setTxTone] = useState<"success" | "error" | "idle">("idle");
```

---

## ⚙️ Key Logic Patterns

### Session Timer Loop
```tsx
useEffect(() => {
  if (!sessionRunning) return;
  const timer = window.setInterval(() => {
    setSessionMinutes((value) => value + 1);
  }, 60000); // Every 60 seconds
  return () => window.clearInterval(timer);
}, [sessionRunning]);
```

### Responsive Detection
```tsx
useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### Zen Mode Activation
```tsx
// When session starts, auto-close navigation
useEffect(() => {
  if (sessionRunning) {
    setIsNavOpen(false);
    setSelectedSecondaryPanel(null);
  }
}, [sessionRunning]);
```

### Fatigue Efficiency Algorithm
```tsx
const fatigueEfficiency = useMemo(() => {
  const lambda = -Math.log(0.75) / 90;
  return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
}, [sessionMinutes]);

// Drives Zeus avatar mood
const recommendedZeusState = useMemo<ZeusAvatarState>(() => {
  if (txTone === "error") return "disappointed";
  if (fatigueEfficiency <= 40) return "wrath";
  if (fatigueEfficiency <= 74) return "tired";
  if (txTone === "success") return "proud";
  return "neutral";
}, [fatigueEfficiency, mode, txTone]);
```

---

## 🔐 Web3 Integration Points

All Web3 functionality is now **hidden by default** in `SecondaryPanel`:

1. **Wallet Connection** – Settings tab
   - Connect/Disconnect wallet
   - Display wallet address
   
2. **FCS Token Management** – Web3 & Tokens tab
   - Show balance
   - Buy/Sell buttons
   - History (future)

3. **Admin Functions** – Hidden in settings (admin only)
   - Minting (only if user is admin)

**Key Difference:** No Web3 UI on main screen. User must opt-in to see blockchain features.

---

## 🎯 Future Enhancements

### Phase 2:
- [ ] Session history export (CSV)
- [ ] Weekly/monthly stats dashboard
- [ ] Pomodoro automation
- [ ] Break reminders (with health integration)
- [ ] Leaderboard (community)
- [ ] Custom break activities

### Phase 3:
- [ ] AI focus coach (suggestions)
- [ ] Integration with calendar (Google Calendar events)
- [ ] Focus goals (weekly targets)
- [ ] Ambient sound player
- [ ] Focus modes (Music, White Noise, Silent)

### Phase 4:
- [ ] Smart contract rewards (on-chain)
- [ ] Governance tokens (FCS -> voting)
- [ ] Social focus (multiplayer sessions)
- [ ] Badges & achievements (on-chain NFTs)

---

## 🧪 Testing Checklist

- [ ] **Onboarding**: All 3 login flows work
- [ ] **Home Screen**: Timer counts up, input accepts text
- [ ] **Zen Mode**: UI properly dims/blurs when session active
- [ ] **Mobile**: Bottom nav appears, responsive layout works
- [ ] **Desktop**: Sidebar visible, can click to expand/collapse
- [ ] **Navigation**: Can open/close secondary panels
- [ ] **Web3**: Wallet connect/disconnect flows work
- [ ] **Responsiveness**: Test at 320px, 768px, 1920px widths
- [ ] **Accessibility**: Tab navigation, keyboard shortcuts
- [ ] **Performance**: No lag on timer updates

---

## 📝 CSS & Styling Notes

- **Tailwind CSS** for all styling
- **Framer Motion** for animations (smooth transitions)
- **Dark theme** – Slate-950 base, Cyan accents
- **Touch targets**: Min 48x48px on mobile (WCAG AA compliant)
- **Whitespace**: Generous padding for "breathing room"

---

## 🚀 Deployment Notes

1. Build: `npm run build`
2. Preview: `npm run preview`
3. Server: `node server/server.js` (for admin APIs)
4. Environment vars: `.env.local` for Web3 keys

---

## 📚 Component Dependency Tree

```
App.tsx
├── BackgroundScene (3D Three.js)
├── FocusTutorial (onboarding overlay)
├── Onboarding (login screen) 
│   └── 3 option buttons
├── Home (main timer)
│   ├── Timer (9xl gradient)
│   ├── Task input
│   └── START button
├── NavigationDrawer (sidebar/bottom nav)
│   └── Menu items list
├── SecondaryPanel (modal)
│   ├── Stats view
│   ├── Health view
│   ├── Web3 view
│   └── Settings view
└── Toast (status feedback)
```

---

## ✨ Philosophy

> **"Make the simple path the obvious path"** – Don't Make Me Think (Steve Krug)

The new FocusOS follows this principle strictly:
1. **First-time user** sees 3 clear options
2. **New session** requires only task name + button click
3. **Advanced features** are there if needed, but don't clutter
4. **During focus** – Everything disappears except the goal
5. **After session** – Reward feedback, then back to start

---

**Last Updated**: April 2026  
**Version**: 2.0 (Progressive Disclosure Redesign)
