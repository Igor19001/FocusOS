# FocusOS Redesign - Quick Implementation Notes

## ✅ What Was Changed

### Removed/Hidden
- **GameHUD** – No longer on main screen (now in Secondary Panel stats)
- **Avatar selection panel** – Hidden in secondary panel
- **Live Log** – Was on dashboard, now optional feature
- **Tab navigation** (Dashboard, Shop, Admin, Settings) – Replaced with drawer menu
- **Water/Sleep logging** – Moved to Health Tracker panel
- **All Web3 UI** – Moved to "Web3 & Tokens" modal panel
- **Admin panel** – Still accessible but hidden by default

### Added/Refactored
✅ **Onboarding.tsx** – Minimalist 3-option login screen  
✅ **Home.tsx** – Frictionless timer + task input  
✅ **NavigationDrawer.tsx** – Sidebar (desktop) + Bottom nav (mobile)  
✅ **SecondaryPanel.tsx** – Modal for all advanced features  
✅ **App.tsx (refactored)** – Clean state management & routing logic  

---

## 🎯 Key Feature Implementations

### 1. Zen Mode
```tsx
// Home.tsx implements visual dimming effect
const containerVariants = {
  normal: { opacity: 1, scale: 1 },
  zen: { opacity: 0.15, scale: 0.98, pointerEvents: "none" },
};

// Timer stays at 100% opacity, everything else fades
{isZenMode && <motion.div className="... backdrop-blur-sm" />}
```

### 2. Responsive Navigation
```tsx
// App.tsx detects screen size
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

// Renders different layouts
{!isMobile && <DesktopSidebar />}
{isMobile && <MobileBottomNav />}
```

### 3. Progressive Disclosure
```tsx
// Menu items are disabled during active session
<NavigationDrawer
  isSessionRunning={sessionRunning}  // ← Disables when true
  onSelectSection={(section) => {
    setSelectedSecondaryPanel(section);  // ← Opens modal
  }}
/>
```

### 4. Session Management
```tsx
// Simple state toggles
const handleSessionStart = () => {
  if (taskDescription.trim()) {
    setSessionRunning(true);
    setIsNavOpen(false);  // ← Auto-close menu
    setSelectedSecondaryPanel(null);  // ← Close panels
  }
};

const handleSessionEnd = () => {
  setSessionRunning(false);
  setTotalSessions((s) => s + 1);  // ← Track session count
  setSuccess(`Session complete! +${Math.ceil(sessionMinutes / 25)} FCS earned`);
};
```

---

## 🔧 Common Customizations

### Change Timer Size
```tsx
// In Home.tsx, modify this:
<div className="text-9xl font-black text-transparent bg-clip-text ...">
```
- `text-9xl` → Timer size (Tailwind scale: 2xl, 3xl, ..., 9xl)
- Increase for bigger timer

### Change Color Theme
```tsx
// Replace all "cyan" with your color
<div className="text-cyan-400 bg-cyan-500/10 border-cyan-500">
  
// Common Tailwind colors: amber, red, blue, green, purple, pink, indigo
```

### Adjust Sidebar Width
```tsx
// In NavigationDrawer.tsx:
<div className="fixed left-0 top-0 h-screen w-20 lg:w-72">
              ↑        ↑
            mobile   desktop
- `w-20` = 80px (mobile icons only)
- `lg:w-72` = 288px (desktop expanded)
```

### Modify Zen Mode Intensity
```tsx
// In Home.tsx containerVariants:
zen: { opacity: 0.15, scale: 0.98, pointerEvents: "none" }
         ↑
    Change 0.15 to higher value for less dim (0.5 = 50% opacity)
```

### Add New Menu Section
```tsx
// 1. In NavigationDrawer.tsx, add to menuItems:
{
  id: "analytics",  // new section ID
  label: "Analytics",
  icon: <BarChart3 size={20} />,
  description: "Deep insights",
}

// 2. In SecondaryPanel.tsx, add render case:
case "analytics":
  return (
    <motion.div>
      {/* Your analytics component */}
    </motion.div>
  );

// 3. Type it in SecondarySection type:
export type SecondarySection = "stats" | "health" | "web3" | "settings" | "analytics";
```

---

## 🐛 Debugging Tips

### Session timer not incrementing?
```tsx
// Check: useEffect dependency array
useEffect(() => {
  if (!sessionRunning) return;  // ← Make sure this is true
  const timer = window.setInterval(() => {
    setSessionMinutes((value) => value + 1);
  }, 60000);  // ← 60000ms = 60 seconds
  return () => window.clearInterval(timer);
}, [sessionRunning]);  // ← Must include sessionRunning
```

### Mobile menu not showing?
```tsx
// Verify isMobile state is updating
useEffect(() => {
  console.log("Screen width:", window.innerWidth);  // Debug
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### Secondary panel not closing?
```tsx
// Make sure onClose is properly connected
<SecondaryPanel
  isOpen={selectedSecondaryPanel !== null}
  onClose={() => {
    setSelectedSecondaryPanel(null);  // ← This closes it
    setSelectedNavSection(null);
  }}
/>
```

### Animation feels jerky?
```tsx
// Check Framer Motion transition config
animate={{ opacity: 1, scale: 1 }}
transition={{ 
  duration: 0.6, 
  ease: "easeInOut"  // ← Smooth easing function
}}
```

---

## 📊 Performance Considerations

### useMemo for expensive calculations
```tsx
// Fatigue efficiency is recalculated only when sessionMinutes changes
const fatigueEfficiency = useMemo(() => {
  const lambda = -Math.log(0.75) / 90;
  return Math.max(0, 100 * Math.exp(-lambda * sessionMinutes));
}, [sessionMinutes]);  // ← Dependency array
```

### Debounce resize events
```tsx
// Currently: Direct window resize listener
// TODO: Add debounce to avoid excessive re-renders
useEffect(() => {
  let debounceTimer: NodeJS.Timeout;
  const handleResize = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setIsMobile(window.innerWidth < 768);
    }, 300);  // Wait 300ms after resize stops
  };
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

---

## 🔗 Component Integration Checklist

- [ ] App.tsx imports all 4 new components
- [ ] Home.tsx receives correct props from App
- [ ] NavigationDrawer updates selectedNavSection correctly
- [ ] SecondaryPanel modal opens/closes smoothly
- [ ] Onboarding shows before mode is set
- [ ] Web3Provider wraps entire app (in main.tsx)
- [ ] i18n translations are available
- [ ] BackgroundScene and FocusTutorial still render

---

## 📝 Known Limitations & TODOs

### Current Version (2.0)
- [ ] Statistics panel shows mock data (not real session history)
- [ ] Health tracker shows mock water intake (no actual logging)
- [ ] Web3 balances update only on app restart
- [ ] No persistent storage for sessions (beyond localStorage)
- [ ] No export/download of stats
- [ ] Admin panel not fully integrated

### Planned for 3.0
- [ ] Real-time localStorage sync for sessions
- [ ] IndexedDB for larger datasets
- [ ] Session history with filtering
- [ ] Export to CSV/JSON
- [ ] Leaderboard (with real data)
- [ ] Achievements/badges system

---

## 🎨 Design Token Reference

### Colors (Tailwind)
- **Primary**: `cyan-400` (accent), `cyan-500/10` (background)
- **Background**: `slate-950` (darkest), `slate-900` (darker)
- **Text**: `slate-100` (primary), `slate-300` (secondary), `slate-400` (tertiary)
- **Success**: `green-400`
- **Error**: `red-400`
- **Warning**: `orange-400`

### Spacing
- **Padding**: `px-4` (mobile), `lg:px-6` (desktop)
- **Gaps**: `gap-2` (tight), `gap-4` (normal), `gap-6` (loose)
- **Border radius**: `rounded-xl` (small), `rounded-2xl` (medium), `rounded-3xl` (large)

### Typography
- **Large**: `text-9xl` (timer), `text-5xl` (heading)
- **Normal**: `text-base`, `text-sm` (labels), `text-xs` (captions)
- **Font weight**: `font-bold`, `font-semibold`, `font-medium` (default: normal)

---

## 🚀 Quick Dev Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
tsc -b

# Start admin server
npm run server:admin
```

---

## 💡 Design Philosophy Reminders

1. **One action, one state change** – User always knows what happened
2. **Progressive disclosure** – Show only what's needed now
3. **Zen mode** – When focus starts, everything else fades
4. **Mobile parity** – Same experience on phone and desktop
5. **No jargon** – Copy is clear, action-oriented
6. **Fast feedback** – Animations acknowledge every interaction

---

## 📞 Support / Questions

If you need to:
- **Add a feature**: Use Secondary Panel modal pattern
- **Change layout**: Check responsive breakpoints in App.tsx
- **Add keyboard shortcuts**: Use Framer Motion's `key` prop with event handlers
- **Integrate API**: Pass through Web3Provider and update state in handlers

---

**Last Updated**: April 26, 2026  
**Status**: Ready for QA testing
