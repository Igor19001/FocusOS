/**
 * EXAMPLE - App.jsx with Zeus Hologram Integrated
 * 
 * This shows exactly where and how to add Zeus to your existing app.
 * Copy the relevant patterns into your actual App.jsx
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// ⭐ ADD THIS IMPORT
import ZeusHologram from './components/ZeusHologram/ZeusHologram';

// Your existing imports
import Sidebar from './components/Sidebar';
import Skupienie from './pages/Skupienie';
import Statystyki from './pages/Statystyki';
import Raport from './pages/Raport';
import Zdrowie from './pages/Zdrowie';
import Sen from './pages/Sen';
import Ustawienia from './pages/Ustawienia';
import OAplikacji from './pages/OAplikacji';
import Profil from './pages/Profil';

import './App.css';

export default function App() {
  // ⭐ ADD THESE STATE VARIABLES
  const [currentTab, setCurrentTab] = useState('Skupienie');
  const [sessionActive, setSessionActive] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);

  // Load streak from localStorage on mount
  useEffect(() => {
    const storedStreak = localStorage.getItem('focusStreak');
    if (storedStreak) {
      setStreakDays(parseInt(storedStreak));
    }
  }, []);

  // ⭐ ADD THESE HANDLERS
  const handleSessionStart = () => {
    console.log('Session started - Zeus will show motivational message');
    // Do any additional tracking here
  };

  const handleSessionEnd = () => {
    console.log('Session ended - Zeus will show congratulations');
    // Update streaks, save stats, etc.
  };

  return (
    <Router>
      <div className="app-wrapper">
        {/* Your existing sidebar - make sure it calls setCurrentTab */}
        <Sidebar 
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
        />

        {/* Your main content area */}
        <main className="app-main">
          <Routes>
            <Route
              path="/skupienie"
              element={
                <Skupienie
                  sessionActive={sessionActive}
                  setSessionActive={setSessionActive}
                  setLastSessionDuration={setLastSessionDuration}
                  onSessionStart={handleSessionStart}
                  onSessionEnd={handleSessionEnd}
                />
              }
            />
            <Route path="/statystyki" element={<Statystyki />} />
            <Route path="/raport" element={<Raport />} />
            <Route path="/zdrowie" element={<Zdrowie />} />
            <Route path="/sen" element={<Sen />} />
            <Route path="/ustawienia" element={<Ustawienia />} />
            <Route path="/o-aplikacji" element={<OAplikacji />} />
            <Route path="/profil" element={<Profil />} />
          </Routes>
        </main>

        {/* ⭐ ADD ZEUS HOLOGRAM COMPONENT - AT THE END OF JSX */}
        <ZeusHologram
          currentTab={currentTab}
          sessionActive={sessionActive}
          streakDays={streakDays}
          lastSessionDuration={lastSessionDuration}
          onSessionStart={handleSessionStart}
          onSessionEnd={handleSessionEnd}
        />
      </div>
    </Router>
  );
}

/**
 * ============================================================================
 * EXAMPLE - How to update state from child components
 * ============================================================================
 */

// Inside your Skupienie (Focus) component:
/*
export default function Skupienie({
  sessionActive,
  setSessionActive,
  setLastSessionDuration,
  onSessionStart,
  onSessionEnd,
}) {
  const startSession = (task) => {
    setSessionActive(true);
    onSessionStart(); // ← Zeus will react!
    
    // Start your timer...
    let minutes = 0;
    const timer = setInterval(() => {
      minutes++;
    }, 60000);

    return () => clearInterval(timer);
  };

  const endSession = () => {
    setSessionActive(false);
    setLastSessionDuration(minutes); // ← Zeus will congratulate!
    onSessionEnd();
  };

  return (
    <div className="skupienie-page">
      <h1>Skupienie</h1>
      <button onClick={() => startSession('My task')}>
        {sessionActive ? 'Stop Session' : 'Start Session'}
      </button>
    </div>
  );
}
*/

/**
 * ============================================================================
 * EXAMPLE - How to update Sidebar for tab tracking
 * ============================================================================
 */

// Inside your Sidebar component:
/*
export default function Sidebar({ currentTab, onTabChange }) {
  const tabs = [
    'Skupienie',
    'Statystyki', 
    'Raport',
    'Zdrowie',
    'Sen',
    'Ustawienia',
    'O aplikacji',
    'Profil',
  ];

  return (
    <nav className="sidebar">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)} // ← This updates Zeus!
          className={currentTab === tab ? 'active' : ''}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
*/

/**
 * ============================================================================
 * OPTIONAL - Advanced: Track streak in localStorage
 * ============================================================================
 */

// Add this to your session management:
/*
const handleSessionEnd = () => {
  // Get current streak
  const today = new Date().toDateString();
  const lastSessionDate = localStorage.getItem('lastSessionDate');
  
  if (lastSessionDate !== today) {
    // Different day - increment streak
    const currentStreak = parseInt(localStorage.getItem('focusStreak') || 0);
    setStreakDays(currentStreak + 1);
    localStorage.setItem('focusStreak', currentStreak + 1);
    localStorage.setItem('lastSessionDate', today);
  }
};
*/
