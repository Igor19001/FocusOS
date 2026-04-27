import React, { useState, useEffect, useRef } from 'react';
import { useZeusMessages } from '../../hooks/useZeusMessages';
import styles from './ZeusHologram.module.css';

/**
 * ZeusHologram Component
 * 
 * Floating hologram assistant do całej aplikacji
 * - Context aware (reaguje na zmianę karty)
 * - Animowany (oddycha, pulsuje, animuje się)
 * - Responsive (mobile-friendly)
 * - Persistent (localStorage preference)
 * 
 * Props:
 * - currentTab: aktalna karta (string)
 * - sessionActive: czy sesja w toku (boolean)
 * - streakDays: liczba dni streak'u (number)
 * - lastSessionDuration: czas ostatniej sesji w minutach (number)
 * - onSessionStart: callback gdy sesja się zaczyna (function)
 * - onSessionEnd: callback gdy sesja się kończy (function)
 */

export default function ZeusHologram({
  currentTab = 'Skupienie',
  sessionActive = false,
  streakDays = 0,
  lastSessionDuration = 0,
  onSessionStart = () => {},
  onSessionEnd = () => {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [messageClosing, setMessageClosing] = useState(false);
  const messageTimeoutRef = useRef(null);
  const sessionStateRef = useRef(sessionActive);

  // Hook do zarządzania wiadomościami
  const {
    message,
    isVisible,
    reaction,
    showMessage,
    queueMessage,
  } = useZeusMessages(currentTab, sessionActive, streakDays, lastSessionDuration);

  // Reaguj na zmianę sesji (start/end)
  useEffect(() => {
    if (sessionActive && !sessionStateRef.current) {
      // Sesja właśnie się zaczęła
      queueMessage('🚀 Rozpoczynamy! Zrobisz to!', 'bounce', 3500);
      onSessionStart();
    } else if (!sessionActive && sessionStateRef.current) {
      // Sesja właśnie się skończyła
      const msg = `🎉 Świetna sesja! +${Math.ceil(lastSessionDuration / 25)} FCS zarobione!`;
      queueMessage(msg, 'glow', 5000);
      onSessionEnd();
    }
    sessionStateRef.current = sessionActive;
  }, [sessionActive, lastSessionDuration, queueMessage, onSessionStart, onSessionEnd]);

  // Detektuj zmianę wielkości ekranu
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Czytaj i ustaw collapsed preference z localStorage
  useEffect(() => {
    const stored = localStorage.getItem('zeusCollapsed');
    if (stored === 'true') {
      setIsExpanded(false);
    }
  }, []);

  // Zapisz preference gdy użytkownik zamyka/otwiera
  useEffect(() => {
    localStorage.setItem('zeusCollapsed', !isExpanded);
  }, [isExpanded]);

  // Auto-dismiss wiadomości po 5 sekundach
  useEffect(() => {
    if (isVisible && !messageClosing) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessageClosing(true);
        setTimeout(() => {
          setMessageClosing(false);
        }, 300);
      }, 5000);
    }

    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [isVisible, messageClosing]);

  // Obsługuj klik na orb
  const handleOrbClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Obsługuj zamknięcie panelu
  const handleClose = () => {
    setIsExpanded(false);
  };

  // Obsługuj hover na wiadomość - resetuj timeout
  const handleMessageHover = () => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
  };

  return (
    <div className={`${styles.zeusContainer} ${isMobile ? styles.mobile : ''}`}>
      <div className={styles.zeusWidget}>
        {/* PANEL ROZWINIĘTY */}
        {isExpanded && (
          <div className={`${styles.zeusPanel} ${isMobile ? styles.mobile : ''}`}>
            <div className={styles.zeusPanelContent}>
              {/* Header z zamknięciem */}
              <div className={styles.zeusPanelHeader}>
                <h3 className={styles.zeusPanelTitle}>Zeus Assistant</h3>
                <button
                  className={styles.zeusCloseButton}
                  onClick={handleClose}
                  title="Zamknij Zeusa"
                  aria-label="Zamknij asystenta"
                >
                  ✕
                </button>
              </div>

              {/* BUBBLE Z WIADOMOŚCIĄ */}
              {isVisible && message && (
                <div
                  className={`${styles.messageBubble} 
                    ${messageClosing ? styles.fading : ''} 
                    ${reaction ? styles[`reaction-${reaction}`] : ''}
                    ${isVisible ? styles.speaking : ''}`}
                  onMouseEnter={handleMessageHover}
                >
                  {message}
                </div>
              )}

              {/* Fallback message gdy brak */}
              {!isVisible && (
                <div className={styles.messageBubble}>
                  👋 Cześć! Jestem Zeus, Twój cybernetyczny coach. 
                  {currentTab && ` Widzę, że przeglądasz ${currentTab}.`}
                </div>
              )}

              {/* Toolbar */}
              <div className={styles.zeusToolbar}>
                <span className={styles.zeusTooltip}>
                  ⚡ Aktywny: {sessionActive ? 'TAK' : 'nie'}
                </span>
                <span className={styles.zeusTooltip}>
                  🔥 Streak: {streakDays} dni
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ORBA ZWINIĘTĄ */}
        <button
          className={styles.zeusOrbCollapsed}
          onClick={handleOrbClick}
          title={isExpanded ? 'Schowaj Zeusa' : 'Pokaż Zeusa'}
          aria-label={isExpanded ? 'Schowaj asystenta' : 'Pokaż asystenta'}
          aria-pressed={isExpanded}
        >
          <div className={styles.zeusOrbPulse} />
          <div className={styles.zeusAvatar} role="img" aria-label="Zeus avatar">
            🤖
          </div>
        </button>
      </div>
    </div>
  );
}
