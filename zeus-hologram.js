/**
 * Zeus Floating Hologram Component
 * Pure vanilla JavaScript - no frameworks
 * Displays as a 64px orb on the right side, expands to 280px panel on click
 * Responds to tab changes and shows contextual messages
 */

const ZeusHologram = (() => {
  // State
  let isExpanded = false;
  let currentTab = 'tracker';
  let lastMessage = '';
  let hologramEl = null;
  let expandState = null;

  // Config
  const CONFIG = {
    ORB_SIZE: 64,
    PANEL_WIDTH: 280,
    PANEL_HEIGHT: 360,
    STORAGE_KEY: 'focusos_zeus_expanded',
  };

  // Create HTML structure
  function createHologramHTML() {
    return `
      <div id="zeusHologramContainer" class="zeus-hologram-container">
        <!-- Orb (always visible) -->
        <div id="zeusHologramOrb" class="zeus-hologram-orb" role="button" tabindex="0" aria-label="Zeus Hologram">
          <div class="orb-glow"></div>
          <div class="orb-core">
            <svg viewBox="0 0 24 24" class="orb-icon" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="zeus-glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <!-- Simple lightning bolt -->
              <path d="M13 2L3 14h9L11 22l10-12h-9l2-8z" fill="currentColor" filter="url(#zeus-glow)"/>
            </svg>
          </div>
          <div class="orb-pulse"></div>
        </div>

        <!-- Expanded Panel (hidden by default) -->
        <div id="zeusHologramPanel" class="zeus-hologram-panel" role="complementary" aria-label="Zeus Information Panel">
          <!-- Header with close button -->
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-icon">⚡</span>
              <div>
                <h3>Zeus</h3>
                <p class="title-subtitle" id="zeusHologramSubtitle">Przewodnik skupienia</p>
              </div>
            </div>
            <button id="zeusHologramClose" class="panel-close" aria-label="Close panel" type="button">✕</button>
          </div>

          <!-- Main content -->
          <div class="panel-content">
            <!-- Current message -->
            <div class="message-box">
              <div class="message-emoji" id="zeusHologramEmoji">⚡</div>
              <div class="message-text" id="zeusHologramMainMessage">Twój ruch.</div>
            </div>

            <!-- Status indicator -->
            <div class="status-indicator">
              <span class="status-dot" id="zeusHologramStatusDot"></span>
              <span class="status-text" id="zeusHologramStatus">Idle</span>
            </div>

            <!-- Current tab info -->
            <div class="tab-indicator">
              <span class="tab-label">Bieżąca zakładka:</span>
              <span class="tab-name" id="zeusHologramTab">Skupienie</span>
            </div>

            <!-- Motivational tip -->
            <div class="tip-box">
              <span class="tip-icon">💡</span>
              <span class="tip-text" id="zeusHologramTip">Jedno zadanie. Jeden start.</span>
            </div>

            <!-- Action buttons -->
            <div class="panel-actions">
              <button id="zeusHologramActionBtn" class="action-btn" type="button">
                <span class="action-icon">🎯</span>
                <span class="action-text">Sprint skupienia</span>
              </button>
              <button id="zeusHologramCollapseBtn" class="action-btn action-btn--secondary" type="button">
                <span class="action-text">Zwiń panel</span>
              </button>
            </div>
          </div>

          <!-- Footer with mini stats -->
          <div class="panel-footer">
            <div class="stat">
              <span class="stat-label">Tryb</span>
              <span class="stat-value" id="zeusHologramMode">Lokalny</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Create CSS styles
  function createHologramStyles() {
    return `
      /* Zeus Hologram - Floating Orb & Panel */

      .zeus-hologram-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 8000;
        font-family: var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        --zeus-primary: #f4c46a;
        --zeus-secondary: #7ab3ff;
        --zeus-glow: rgba(244, 196, 106, 0.32);
        --zeus-dark: rgba(9, 13, 24, 0.97);
      }

      /* Orb Styles */
      .zeus-hologram-orb {
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: radial-gradient(circle at 32% 28%, rgba(244, 196, 106, 0.78), rgba(122, 179, 255, 0.36));
        border: 2px solid var(--zeus-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 22px var(--zeus-glow), inset 0 0 10px rgba(244, 196, 106, 0.18);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        animation: zeus-pulse 3s ease-in-out infinite;
        outline: none;
      }

      .zeus-hologram-orb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 30px var(--zeus-glow), inset 0 0 15px rgba(244, 196, 106, 0.3);
      }

      .zeus-hologram-orb:active {
        transform: scale(0.95);
      }

      .zeus-hologram-orb:focus-visible {
        outline: 2px solid var(--zeus-primary);
        outline-offset: 2px;
      }

      .orb-glow {
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        background: radial-gradient(circle, var(--zeus-glow), transparent);
        animation: zeus-glow-pulse 2s ease-in-out infinite;
        pointer-events: none;
      }

      .orb-core {
        position: relative;
        z-index: 2;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--zeus-primary);
      }

      .orb-icon {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 4px var(--zeus-primary));
      }

      .orb-pulse {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid var(--zeus-primary);
        opacity: 0;
        animation: zeus-ring-pulse 1.5s ease-out infinite;
      }

      /* Panel Styles */
      .zeus-hologram-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 0;
        height: 0;
        background: var(--zeus-dark);
        border: 2px solid var(--zeus-primary);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px var(--zeus-glow);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        opacity: 0;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
      }

      .zeus-hologram-panel.expanded {
        width: 280px;
        height: 360px;
        opacity: 1;
        pointer-events: auto;
        animation: zeus-panel-slide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      /* Panel Header */
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 16px;
        border-bottom: 1px solid rgba(244, 196, 106, 0.2);
        gap: 12px;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }

      .title-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: rgba(244, 196, 106, 0.12);
        border-radius: 8px;
        animation: zeus-icon-float 3s ease-in-out infinite;
      }

      .panel-title h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--zeus-primary);
        letter-spacing: 0.5px;
      }

      .title-subtitle {
        margin: 2px 0 0;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .panel-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
        outline: none;
      }

      .panel-close:hover {
        background: rgba(244, 196, 106, 0.12);
        color: var(--zeus-primary);
      }

      .panel-close:focus-visible {
        outline: 2px solid var(--zeus-primary);
        outline-offset: 2px;
      }

      /* Panel Content */
      .panel-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      /* Message Box */
      .message-box {
        background: rgba(244, 196, 106, 0.06);
        border: 1px solid rgba(244, 196, 106, 0.22);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .message-emoji {
        font-size: 20px;
        flex-shrink: 0;
        animation: zeus-message-bounce 2s ease-in-out infinite;
      }

      .message-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
        font-weight: 500;
      }

      /* Status Indicator */
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(122, 179, 255, 0.07);
        border-radius: 6px;
        font-size: 11px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--zeus-secondary);
        box-shadow: 0 0 8px var(--zeus-secondary);
        animation: zeus-status-pulse 2s ease-in-out infinite;
      }

      .status-text {
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.3px;
      }

      /* Tab Indicator */
      .tab-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        padding: 8px 0;
        border-top: 1px solid rgba(244, 196, 106, 0.12);
        border-bottom: 1px solid rgba(244, 196, 106, 0.12);
      }

      .tab-label {
        color: rgba(255, 255, 255, 0.5);
      }

      .tab-name {
        color: var(--zeus-primary);
        font-weight: 600;
      }

      /* Tip Box */
      .tip-box {
        background: rgba(244, 196, 106, 0.04);
        border-left: 3px solid var(--zeus-primary);
        padding: 10px;
        font-size: 12px;
        color: rgba(238, 242, 255, 0.8);
        line-height: 1.4;
        display: flex;
        gap: 8px;
        border-radius: 4px;
      }

      .tip-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .tip-text {
        flex: 1;
      }

      /* Panel Actions */
      .panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: auto;
      }

      .action-btn {
        background: linear-gradient(135deg, rgba(244, 196, 106, 0.18), rgba(122, 179, 255, 0.1));
        border: 1px solid var(--zeus-primary);
        color: var(--zeus-primary);
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
        outline: none;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .action-btn:hover {
        background: linear-gradient(135deg, rgba(244, 196, 106, 0.28), rgba(122, 179, 255, 0.18));
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(244, 196, 106, 0.3);
      }

      .action-btn:active {
        transform: translateY(0);
      }

      .action-btn:focus-visible {
        outline: 2px solid var(--zeus-primary);
        outline-offset: 2px;
      }

      .action-btn--secondary {
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.05);
      }

      .action-btn--secondary:hover {
        border-color: var(--zeus-primary);
        color: var(--zeus-primary);
        background: rgba(244, 196, 106, 0.1);
      }

      .action-icon {
        font-size: 12px;
      }

      /* Panel Footer */
      .panel-footer {
        padding: 12px 16px;
        border-top: 1px solid rgba(244, 196, 106, 0.12);
        display: flex;
        justify-content: center;
        gap: 16px;
      }

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .stat-label {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.2px;
      }

      .stat-value {
        font-size: 11px;
        color: var(--zeus-primary);
        font-weight: 600;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
      }

      /* Animations */
      @keyframes zeus-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes zeus-glow-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }

      @keyframes zeus-ring-pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      @keyframes zeus-panel-slide {
        0% {
          opacity: 0;
          transform: scale(0.8) translateY(10px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes zeus-icon-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }

      @keyframes zeus-message-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }

      @keyframes zeus-status-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.6;
        }
      }

      /* Mobile/Tablet Responsive */
      @media (max-width: 480px) {
        .zeus-hologram-container {
          bottom: 16px;
          right: 16px;
        }

        .zeus-hologram-orb {
          width: 56px;
          height: 56px;
        }

        .zeus-hologram-panel.expanded {
          width: 260px;
          height: 340px;
        }

        .panel-content {
          padding: 12px;
          gap: 10px;
        }
      }

      /* Reduced motion preference */
      @media (prefers-reduced-motion: reduce) {
        .zeus-hologram-orb,
        .zeus-hologram-panel,
        .orb-glow,
        .orb-pulse,
        .message-emoji,
        .status-dot,
        .title-icon,
        .action-btn {
          animation: none !important;
          transition: none !important;
        }
      }

      /* Dark theme adjustments */
      @media (prefers-color-scheme: dark) {
        .zeus-hologram-container {
          --zeus-dark: rgba(7, 10, 18, 0.99);
        }
      }
    `;
  }

  // Initialize component
  function init() {
    // Load expanded state from localStorage
    expandState = localStorage.getItem(CONFIG.STORAGE_KEY) === 'true';

    // Inject HTML
    const container = document.createElement('div');
    container.innerHTML = createHologramHTML();
    document.body.appendChild(container);

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = createHologramStyles();
    document.head.appendChild(styleEl);

    // Get references
    hologramEl = document.getElementById('zeusHologramContainer');
    const orbBtn = document.getElementById('zeusHologramOrb');
    const panel = document.getElementById('zeusHologramPanel');
    const closeBtn = document.getElementById('zeusHologramClose');
    const collapseBtn = document.getElementById('zeusHologramCollapseBtn');
    const actionBtn = document.getElementById('zeusHologramActionBtn');

    // Event listeners
    orbBtn.addEventListener('click', toggleExpand);
    orbBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpand();
      }
    });

    closeBtn.addEventListener('click', collapse);
    collapseBtn.addEventListener('click', collapse);
    
    actionBtn.addEventListener('click', () => {
      const startBtn = document.getElementById('btnStart');
      if (startBtn && !startBtn.disabled) {
        startBtn.click();
        collapse();
      }
    });

    // Observe tab changes
    observeTabChanges();

    // Restore expanded state
    if (expandState) {
      expand();
    }

    // Update initial message
    updateHologramMessage();

    // Listen for message updates from main app (when zeusSpeak is called)
    window.addEventListener('zeusMessageUpdate', (e) => {
      updateHologramMessage(e.detail?.message, e.detail?.emoji);
    });

    // Update mode indicator
    updateModeIndicator();
  }

  // Toggle expanded state
  function toggleExpand() {
    isExpanded ? collapse() : expand();
  }

  // Expand: show hologram panel
  function expand() {
    const panel = document.getElementById('zeusHologramPanel');
    const orb = document.getElementById('zeusHologramOrb');
    if (panel) {
      panel.classList.add('expanded');
      orb?.setAttribute('aria-expanded', 'true');
      isExpanded = true;
      localStorage.setItem(CONFIG.STORAGE_KEY, 'true');
    }
  }

  // Collapse: hide hologram panel
  function collapse() {
    const panel = document.getElementById('zeusHologramPanel');
    const orb = document.getElementById('zeusHologramOrb');
    if (panel) {
      panel.classList.remove('expanded');
      orb?.setAttribute('aria-expanded', 'false');
      isExpanded = false;
      localStorage.setItem(CONFIG.STORAGE_KEY, 'false');
    }
  }

  // Observe tab changes
  function observeTabChanges() {
    // Watch for data-current-view changes on body element
    const observer = new MutationObserver(() => {
      const newTab = document.body.dataset.currentView || 'tracker';
      if (newTab !== currentTab) {
        currentTab = newTab;
        updateTabInfo();
        updateHologramMessage();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-current-view'],
    });

    // Also listen to tab button clicks as a fallback
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-tab')) {
        const tab = e.target.dataset.tab;
        if (tab !== currentTab) {
          currentTab = tab;
          setTimeout(() => {
            updateTabInfo();
            updateHologramMessage();
          }, 100);
        }
      }
    });
  }

  // Update tab info display
  function updateTabInfo() {
    const tabNameMap = {
      tracker: 'Skupienie',
      daily: 'Statystyki',
      weekly: 'Raport',
      health: 'Zdrowie',
      sleep: 'Sen',
      settings: 'Ustawienia',
      about: 'O aplikacji',
      profile: 'Profil',
    };

    const tabNameEl = document.getElementById('zeusHologramTab');
    if (tabNameEl) {
      tabNameEl.textContent = tabNameMap[currentTab] || currentTab;
    }
  }

  // Update hologram message based on context
  function updateHologramMessage(customMsg = null, customEmoji = null) {
    const messageEl = document.getElementById('zeusHologramMainMessage');
    const emojiEl = document.getElementById('zeusHologramEmoji');
    const tipEl = document.getElementById('zeusHologramTip');
    const statusEl = document.getElementById('zeusHologramStatus');
    const statusDotEl = document.getElementById('zeusHologramStatusDot');

    // Determine state
    const isActive = !!window.App && S?.activeTask;
    const messages = {
      tracker: {
        idle: {
          msg: 'Jedno zadanie. Jeden start.',
          emoji: '⚡',
          tip: 'Dodaj konkretne zadanie, a potem uruchom sesję.',
          status: 'Czuwa',
        },
        active: {
          msg: 'Wchodź.',
          emoji: '🔥',
          tip: 'Bez przełączania. Jedna rzecz na raz.',
          status: 'Aktywny',
        },
      },
      daily: {
        idle: {
          msg: 'Przegląd dnia.',
          emoji: '📊',
          tip: 'Sprawdź jak pracujesz dziś.',
          status: 'Obserwuje',
        },
        active: {
          msg: 'Sprint trwa.',
          emoji: '⚡',
          tip: 'Sesja uruchomiona — trzymaj tempo.',
          status: 'W trakcie',
        },
      },
      weekly: {
        idle: {
          msg: 'Trend tygodnia.',
          emoji: '📈',
          tip: 'Analiza pokazuje Twój rytm pracy.',
          status: 'Czuwa',
        },
        active: {
          msg: 'Pracujesz.',
          emoji: '⚡',
          tip: 'Sesja nie przerywa się w widoku raportu.',
          status: 'Aktywny',
        },
      },
      health: {
        idle: {
          msg: 'Monitoring zdrowia.',
          emoji: '💚',
          tip: 'Loguj wodę, posiłki i ruch.',
          status: 'Czuwa',
        },
        active: {
          msg: 'Zadbaj o regenerację.',
          emoji: '⚡',
          tip: 'Nawet podczas sesji możesz logować zdrowie.',
          status: 'Aktywny',
        },
      },
      sleep: {
        idle: {
          msg: 'Jakość snu.',
          emoji: '😴',
          tip: 'Dobry sen = lepsze skupienie.',
          status: 'Czuwa',
        },
        active: {
          msg: 'Sen czeka.',
          emoji: '⚡',
          tip: 'Po sesji zaloguj regenerację.',
          status: 'Aktywny',
        },
      },
      settings: {
        idle: {
          msg: 'Personalizacja.',
          emoji: '⚙️',
          tip: 'Ustaw swoje preferencje.',
          status: 'Gotowy',
        },
        active: {
          msg: 'Sesja trwa.',
          emoji: '⚡',
          tip: 'Ustawienia zapisują się automatycznie.',
          status: 'Aktywny',
        },
      },
      about: {
        idle: {
          msg: 'O aplikacji.',
          emoji: 'ℹ️',
          tip: 'FocusOS — intelligence local-first.',
          status: 'Informuje',
        },
        active: {
          msg: 'Pracujesz.',
          emoji: '⚡',
          tip: 'Sesja działa niezalnie od widoku.',
          status: 'Aktywny',
        },
      },
      profile: {
        idle: {
          msg: 'Twój profil.',
          emoji: '👤',
          tip: 'Zarządzaj swoimi danymi.',
          status: 'Czuwa',
        },
        active: {
          msg: 'Sprint trwa.',
          emoji: '⚡',
          tip: 'Postęp zapisuje się w realtime.',
          status: 'Aktywny',
        },
      },
    };

    // Use custom message if provided
    if (customMsg && customEmoji) {
      lastMessage = customMsg;
      messageEl.textContent = customMsg;
      emojiEl.textContent = customEmoji;
    } else {
      // Use tab and state based message
      const state = isActive ? 'active' : 'idle';
      const msgData = messages[currentTab]?.[state] || messages.tracker.idle;
      messageEl.textContent = msgData.msg;
      emojiEl.textContent = msgData.emoji;
      tipEl.textContent = msgData.tip;
      statusEl.textContent = msgData.status;
      lastMessage = msgData.msg;
    }
  }

  // Update mode indicator
  function updateModeIndicator() {
    const modeEl = document.getElementById('zeusHologramMode');
    if (modeEl) {
      const mode = S?.appMode || 'lokalny';
      const modeLabel = mode === 'monad' ? 'Web3' : mode === 'google' ? 'Google' : 'Lokalny';
      modeEl.textContent = modeLabel;
    }
  }

  // Public API
  return {
    init,
    expand,
    collapse,
    toggleExpand,
    updateMessage: updateHologramMessage,
    updateMode: updateModeIndicator,
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ZeusHologram.init();
  });
} else {
  ZeusHologram.init();
}
