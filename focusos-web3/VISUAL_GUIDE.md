# FocusOS Redesign - Visual Guide & Component Preview

## 📱 Screen 1: Onboarding / Login

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│      ╔═══════════════════╗         │
│      ║    FocusOS        ║         │ Title: 5xl gradient cyan→blue
│      ║                   ║         │
│      ╚═══════════════════╝         │
│                                     │
│   Deep focus, simplified.            │ Subtitle: Slate-400
│                                     │
│   Start a focus session in 2         │ Description: Slate-500
│   seconds. Everything else is        │
│   optional.                          │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ ⚡ Quick Start                   │ │ Option 1: Yellow flash icon
│  │ Try offline, no login needed    │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ 💰 Connect Wallet               │ │ Option 2: Cyan border highlight
│  │ Earn FCS tokens                 │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ ✉️ Continue with Gmail          │ │ Option 3: Email input + button
│  │ [your@email.com...........]     │ │
│  │ [  Continue Button  ]            │ │
│  └─────────────────────────────────┘ │
│                                     │
│  All modes sync to the same timer.  │ Footer: Tiny gray text
│  No commitments, cancel anytime.    │
│                                     │
└─────────────────────────────────────┘
```

**Colors:**
- Background: `bg-slate-950`
- Border: `border-cyan-500/50` (option 2), `border-slate-700` (option 1)
- Text: `text-cyan-100` (option 2), `text-slate-100` (title)

---

## 🎯 Screen 2: Home - Before Session (Desktop)

```
┌──────────────┬─────────────────────────────────────────────────────┐
│              │                                                     │
│ SIDEBAR      │  ┌────────────────────────────────────────────────┐ │
│ (20% width)  │  │                                                │ │
│              │  │          FocusOS                               │ │
│ Menu         │  │      Deep work timer                           │ │
│              │  │                                                │ │
│  📊 Stats    │  │                                                │ │
│  💧 Health   │  │           00:00                                │ │
│  💰 Web3     │  │  (9xl bold gradient text)                      │ │
│  ⚙️ Settings │  │                                                │ │
│              │  │      Ready to focus                            │ │
│              │  │                                                │ │
│              │  │   What are you working on?                     │ │
│              │  │  ┌─────────────────────────────────────────┐  │ │
│              │  │  │ e.g., Write report, Code review...     │  │ │
│              │  │  └─────────────────────────────────────────┘  │ │
│              │  │                                                │ │
│              │  │      ┌──────────────────────────────────┐      │ │
│              │  │      │                                  │      │ │
│              │  │      │  ▶️ START FOCUS SESSION         │      │ │
│              │  │      │  (HUGE button, cyan border)     │      │ │
│              │  │      │                                  │      │ │
│              │  │      └──────────────────────────────────┘      │ │
│              │  │                                                │ │
│              │  │                                                │ │
│              │  │   Menu available at top-left when ready      │ │
│              │  │   to explore more                             │ │
│              │  │                                                │ │
│              │  │                                                │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

**Layout:**
- Sidebar: `fixed left-0 top-0 h-screen w-20 lg:w-72`
- Main: `flex-1 ml-20 lg:ml-72 overflow-y-auto`
- Timer: `text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500`
- Button: `py-6 px-4 rounded-3xl border-2 border-cyan-400 text-cyan-100 bg-cyan-500/20 hover:bg-cyan-500/40`

---

## 🎯 Screen 3: Zen Mode - During Session (Full Screen)

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         (Dimmed background:         │
│          opacity: 15%, blur)        │
│                                     │
│                                     │
│              ╔════════════════╗     │
│              ║     00:05      ║     │ Huge 9xl timer
│              ║                ║     │ Bright cyan gradient
│              ║ (pulsing up)   ║     │ Animated bounce
│              ║                ║     │
│              ║   Write Report ║     │ Task name, slate-300
│              ║                ║     │
│              ║                ║     │
│              ║  Focus. Nothing║     │ Motivational text
│              ║  else matters  ║     │ slate-400
│              ║  right now.    ║     │
│              ╚════════════════╝     │
│                                     │
│                                     │
│     (Everything else is invisible)  │
│     - No sidebar                    │
│     - No menu                       │
│     - No distractions               │
│                                     │
└─────────────────────────────────────┘
```

**Animation Logic:**
```tsx
// Container fades and scales down
containerVariants = {
  normal: { opacity: 1, scale: 1 },
  zen: { opacity: 0.15, scale: 0.98, pointerEvents: "none" }
}

// Overlay appears
backdrop-blur-sm fixed inset-0 bg-slate-950/40 pointer-events-none

// Timer stays bright
text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500

// Timer animates
animate={{ y: [0, -10, 0] }}
transition={{ duration: 3, repeat: Infinity }}
```

---

## 📱 Screen 4: Home - Mobile Before Session

```
┌─────────────────────────────────────┐
│ FocusOS                         ≡   │ ← Top bar (20px height)
├─────────────────────────────────────┤
│                                     │
│                                     │
│            00:00                    │
│                                     │
│   What are you working on?          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ e.g., Write report...       │   │ Input field
│  └─────────────────────────────┘   │
│                                     │
│                                     │
│   ┌───────────────────────────────┐ │
│   │  ▶️ START FOCUS SESSION       │ │ Big button
│   └───────────────────────────────┘ │
│                                     │
│   Menu available at top-left when   │
│   ready to explore more             │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [📊] [💧] [💰] [≡]                │ ← Bottom nav (56px height)
└─────────────────────────────────────┘
```

**Bottom Navigation:**
- Position: `fixed bottom-0 left-0 right-0`
- Height: `py-3`
- Icons: Quick access to Stats, Health, Web3
- Menu toggle: Slides in drawer from right
- Safe area: `safe-area-inset-bottom`

---

## 📋 Screen 5: Navigation Drawer - Mobile (Slide-In)

```
Main View                    Drawer (slides from right)
┌──────────────────────┐    ┌──────────────────────────┐
│                      │    │                          │
│   (Current view)     │    │ More Options        [X]  │
│                      │    ├──────────────────────────┤
│   Content here       │    │                          │
│   fades 40%          │    │ 📊 Statistics            │
│   (backdrop blur)    │    │ Session history & trends │
│                      │    │                          │
│   (Backdrop: black)  │    │ 💧 Health Tracker       │
│   (opacity: 40%)     │    │ Water, sleep & breaks   │
│                      │    │                          │
│                      │    │ 💰 Web3 & Tokens        │
│                      │    │ Wallet & FCS tokens     │
│                      │    │                          │
│                      │    │ ⚙️ Settings             │
│                      │    │ Preferences & connections
│                      │    │                          │
│                      │    │ ❓ Help & Guides        │
│                      │    │ Learn how to focus      │
│                      │    │                          │
│                      │    │ ┌────────────────────┐   │
│                      │    │ │ Disconnect Button  │   │
│                      │    │ └────────────────────┘   │
│                      │    │                          │
└──────────────────────┘    └──────────────────────────┘
```

**Drawer Styling:**
- Animation: `x: [300, 0]` (slide from right)
- Width: `w-80` (320px)
- Background: `bg-slate-950`
- Border: `border-l border-slate-800`

---

## 🗂️ Screen 6: Secondary Panel - Stats Modal

```
┌─────────────────────────────────────────────┐
│                                             │
│  Backdrop (black/40%)                       │ (entire screen dims)
│  ┌───────────────────────────────────────┐  │
│  │ 📊 Your Focus Statistics          [X] │  │ (Close button)
│  ├───────────────────────────────────────┤  │
│  │                                       │  │
│  │  ┌─────────────┬─────────────┐       │  │
│  │  │    47       │     39h     │       │  │ 3 stat cards
│  │  │ Total Sess. │ Total Hours │       │  │ (2xl font numbers)
│  │  └─────────────┴─────────────┘       │  │
│  │  ┌─────────────┐                     │  │
│  │  │    12       │                     │  │
│  │  │ Day Streak  │                     │  │
│  │  └─────────────┘                     │  │
│  │                                       │  │
│  │  Weekly Breakdown                    │  │
│  │  Mon [████████] 120min                │  │ Bar charts
│  │  Tue [████────] 85min                 │  │
│  │  Wed [██████──] 105min                │  │
│  │  ...                                  │  │
│  │                                       │  │
│  │  [View Detailed Analytics →]         │  │ CTA button
│  │                                       │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**Modal Styling:**
- Position: `fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2`
- Size: `md:w-full md:max-w-lg`
- Animation: `scale: [0.95, 1]` with spring physics
- Z-index: `z-50`

---

## 💰 Screen 7: Secondary Panel - Web3 Modal

```
┌──────────────────────────────────────┐
│ Backdrop                             │
│  ┌─────────────────────────────────┐ │
│  │ 💰 Web3 & Tokens           [X]  │ │
│  ├─────────────────────────────────┤ │
│  │                                 │ │
│  │ Wallet Status                   │ │
│  │ 0x1234...abcd                   │ │ Monospace
│  │ [Disconnect Wallet]             │ │
│  │                                 │ │
│  │ FCS Balance                      │ │
│  │        1250                     │ │ Large number, yellow
│  │ Earn tokens by completing       │ │ Small text
│  │ focus sessions                  │ │
│  │                                 │ │
│  │ ┌────────────────┬────────────┐ │ │
│  │ │ Send FCS       │ ReceiptText│ │ │
│  │ │ (green border) │ (red borde)│ │ │
│  │ └────────────────┴────────────┘ │ │
│  │                                 │ │
│  │ 💡 Tip: Connect your wallet to  │ │
│  │    earn and trade tokens. Your  │ │
│  │    focus sessions generate FCS! │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

---

## 🏥 Screen 8: Secondary Panel - Health Modal

```
┌──────────────────────────────────────┐
│ Backdrop                             │
│  ┌─────────────────────────────────┐ │
│  │ 💧 Health & Wellness        [X] │ │
│  ├─────────────────────────────────┤ │
│  │                                 │ │
│  │ Water Intake                8/12
│  │ [████░░░░░░░░] (colored blocks) │
│  │ [Log Water Intake Button]       │
│  │                                 │
│  │ Last Night Sleep         7.5h   │
│  │ Great sleep score! Keep it up 🌙│
│  │                                 │
│  │ Next Break Due           12 min │
│  │ You've been focusing for 48 min │
│  │ [Take a Break Button]           │
│  │                                 │
│  └─────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

---

## ⚙️ Desktop Sidebar - Expanded States

### Collapsed (Icons Only)
```
┌────┐
│ ≡  │ ← Menu icon, text hidden
├────┤
│ 📊 │ ← Icon only, 20px width
│ 💧 │
│ 💰 │
│ ⚙️  │
│ ❓ │
├────┤
│ 🔵 │ ← Session active indicator
│    │    (animated pulse dot)
└────┘
```

### Expanded (with Text)
```
┌──────────────┐
│ ≡ Menu       │ ← Now shows text, 72px width (lg: 288px)
├──────────────┤
│ 📊 Statistics│
│ Session      │
│ history &    │
│ trends       │
│              │
│ 💧 Health    │
│ Water, sleep │
│ & breaks     │
│              │
│ 💰 Web3      │
│ Wallet & FCS │
│              │
│ ⚙️ Settings  │
│ Preferences  │
│              │
│ ❓ Help      │
│ Learn how to │
│ focus        │
├──────────────┤
│ 🔵 Session   │
│    Active    │
└──────────────┘
```

---

## 🎨 Color Palette Reference

| Element | Light Mode | Dark Mode (Active) |
|---------|-----------|------------------|
| Background | `slate-100` | `slate-950` ✓ |
| Surface | `slate-50` | `slate-900` ✓ |
| Primary Text | `slate-900` | `slate-100` ✓ |
| Secondary Text | `slate-600` | `slate-400` ✓ |
| Tertiary Text | `slate-500` | `slate-500` ✓ |
| Accent (Primary) | `cyan-600` | `cyan-400` ✓ |
| Accent (Hover) | `cyan-500` | `cyan-300` ✓ |
| Border | `slate-300` | `slate-800` ✓ |
| Success | `green-500` | `green-400` ✓ |
| Error | `red-600` | `red-500` ✓ |
| Warning | `orange-500` | `orange-400` ✓ |

---

## 📐 Responsive Breakpoints

| Breakpoint | Width | What Changes |
|-----------|-------|-------------|
| Mobile (default) | 0-767px | Bottom nav, full-width modals |
| Tablet (sm) | 640px+ | Still mobile layout |
| Desktop (md) | 768px+ | Sidebar appears, layout changes |
| Large (lg) | 1024px+ | Sidebar expands to 288px |
| XL | 1280px+ | Extra spacing, larger fonts |

---

## 🎯 Key Spacing & Sizing

| Component | Size | Notes |
|-----------|------|-------|
| Timer text | `text-9xl` | Largest element |
| Section titles | `text-xl` | H3 equivalent |
| Body text | `text-base` | Standard reading |
| Button padding | `py-6 px-4` | Touch-friendly (48px height min) |
| Sidebar width (mobile) | `w-20` (80px) | Icons only |
| Sidebar width (desktop) | `lg:w-72` (288px) | Full text |
| Modal max width | `md:max-w-lg` (512px) | 2xl Tailwind size |
| Border radius (small) | `rounded-xl` | 12px |
| Border radius (medium) | `rounded-2xl` | 16px |
| Border radius (large) | `rounded-3xl` | 24px |

---

## 🎬 Animation Library (Framer Motion)

| Animation | Purpose | Duration |
|-----------|---------|----------|
| `opacity: [0, 1]` | Fade in | 0.3-0.6s |
| `scale: [0.95, 1]` | Pop-in | 0.4-0.6s (spring) |
| `x: [300, 0]` | Slide in from right | 0.3-0.5s |
| `y: [0, -10, 0]` | Bounce (timer) | 3s (infinite) |
| `pointerEvents: "none"` | Disable interaction | Instant |

---

## 🚀 This Is Your New FocusOS!

**Before:** Cluttered dashboard with 700+ lines of overlapping features  
**After:** Zen timer with Progressive Disclosure menu

**Next:** Build, test, deploy, and watch users focus better! 🎯
