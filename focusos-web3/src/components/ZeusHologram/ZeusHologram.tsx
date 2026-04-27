/**
 * 🤖 ZeusHologram Component
 * Persistent floating hologram assistant with context-aware messaging
 * 
 * - Responsive positioning (right edge on desktop, bottom-right on mobile)
 * - Collapsed: 64px glowing cyan orb
 * - Expanded: 280px smooth-sliding panel
 * - Context detection: reads current tab from URL/props
 * - localStorage persistence: remembers collapsed/expanded state
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ZeusAvatar from "../ZeusAvatar";
import { STORAGE_KEYS, storage } from "../../constants/storageKeys";
import styles from "./ZeusHologram.module.css";

interface ZeusHologramProps {
  /** Which tab/section is currently active (for context-aware messages) */
  currentTab?: "stats" | "health" | "web3" | "settings" | "help" | "focus";
  /** Is a focus session currently running */
  sessionActive?: boolean;
  /** Current streak in days */
  streakDays?: number;
  /** Duration of last completed session in minutes */
  lastSessionDuration?: number;
  /** Callback when session starts */
  onSessionStart?: () => void;
  /** Callback when session ends */
  onSessionEnd?: () => void;
}

export default function ZeusHologram({
  currentTab = "focus",
  sessionActive = false,
  streakDays = 0,
  lastSessionDuration = 0,
  onSessionStart,
  onSessionEnd,
}: ZeusHologramProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [message, setMessage] = useState("");
  const [messageVisible, setMessageVisible] = useState(false);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStateRef = useRef(sessionActive);
  const streakRef = useRef(streakDays);

  // Load saved state
  useEffect(() => {
    const saved = storage.getBoolean("ZEUS_EXPANDED");
    setIsExpanded(saved);
  }, []);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show message
  const showMessage = (text: string, duration = 5000) => {
    // Clear existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    setMessage(text);
    setMessageVisible(true);

    // Auto-dismiss after duration
    messageTimeoutRef.current = setTimeout(() => {
      setMessageVisible(false);
    }, duration);
  };

  // Tab changed → show relevant message
  useEffect(() => {
    const tabMessageKey = `zeus_tab_${currentTab}`;
    const translatedMessage = t(tabMessageKey, "");
    if (translatedMessage && translatedMessage !== tabMessageKey) {
      showMessage(translatedMessage, 5000);
    }
  }, [currentTab, t]);

  // Session started
  useEffect(() => {
    if (sessionActive && !sessionStateRef.current) {
      showMessage(t("zeus_session_start"), 4000);
      onSessionStart?.();
    }
    sessionStateRef.current = sessionActive;
  }, [sessionActive, t, onSessionStart]);

  // Session ended
  useEffect(() => {
    if (!sessionActive && sessionStateRef.current && lastSessionDuration > 0) {
      const earnedFCS = Math.ceil(lastSessionDuration / 25);
      showMessage(`${t("zeus_session_end")} +${earnedFCS} FCS!`, 4000);
      onSessionEnd?.();
    }
    sessionStateRef.current = sessionActive;
  }, [sessionActive, lastSessionDuration, t, onSessionEnd]);

  // Streak milestone
  useEffect(() => {
    if (streakDays > streakRef.current) {
      if (streakDays === 7) {
        showMessage(t("zeus_streak_7"), 5000);
      } else if (streakDays === 14) {
        showMessage(t("zeus_streak_14"), 5000);
      } else if (streakDays === 30) {
        showMessage(t("zeus_streak_30"), 5000);
      }
    }
    streakRef.current = streakDays;
  }, [streakDays, t]);

  // Idle messages every 60 seconds
  useEffect(() => {
    if (sessionActive) return; // Don't show idle messages during session

    const interval = setInterval(() => {
      const quotes = t("zeus_idle_quotes", []);
      if (Array.isArray(quotes) && quotes.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        showMessage(randomQuote, 5000);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionActive, t]);

  // Save expanded state to localStorage
  useEffect(() => {
    storage.set("ZEUS_EXPANDED", isExpanded ? "true" : "false");
  }, [isExpanded]);

  const containerClassName = isMobile
    ? styles.zeusContainer + " " + styles.mobile
    : styles.zeusContainer;

  return (
    <div className={containerClassName}>
      <div className={styles.zeusWidget}>
        {/* MESSAGE BUBBLE */}
        <AnimatePresence>
          {messageVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={styles.messageBubble}
              onMouseEnter={() => {
                // Keep message visible on hover
                if (messageTimeoutRef.current) {
                  clearTimeout(messageTimeoutRef.current);
                }
              }}
              onMouseLeave={() => {
                // Resume dismissal on mouse leave
                messageTimeoutRef.current = setTimeout(() => {
                  setMessageVisible(false);
                }, 3000);
              }}
            >
              <p className={styles.messageText}>{message}</p>
              <button
                onClick={() => setMessageVisible(false)}
                className={styles.messageDismiss}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COLLAPSED ORB */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.zeusOrbCollapsed}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle Zeus hologram"
          aria-expanded={isExpanded}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className={styles.orbPulse}
          >
            <MessageCircle size={28} className={styles.orbIcon} />
          </motion.div>
        </motion.button>

        {/* EXPANDED PANEL */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={styles.zeusPanel}
            >
              {/* Panel Header */}
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Zeus</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className={styles.closeButton}
                  aria-label="Close Zeus panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Avatar */}
              <div className={styles.avatarContainer}>
                <ZeusAvatar state="neutral" size={80} />
              </div>

              {/* Status Info */}
              <div className={styles.statusInfo}>
                {streakDays > 0 && (
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>🔥 Streak</span>
                    <span className={styles.statusValue}>{streakDays} days</span>
                  </div>
                )}
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>⚡ Active</span>
                  <span className={styles.statusValue}>{sessionActive ? "Yes" : "Ready"}</span>
                </div>
              </div>

              {/* Current Tab Info */}
              {currentTab && (
                <div className={styles.tabIndicator}>
                  <p className={styles.tabText}>Currently viewing: <strong>{currentTab}</strong></p>
                </div>
              )}

              {/* Footer */}
              <div className={styles.panelFooter}>
                <p className={styles.footerText}>
                  {sessionActive ? "Stay focused! 💪" : "Ready when you are. 🚀"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
