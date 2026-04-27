/**
 * 📦 Storage Keys - Centralized localStorage key definitions
 * Używaj tych kluczy zamiast hardcoded stringów
 */

export const STORAGE_KEYS = {
  // Zeus Hologram
  ZEUS_EXPANDED: "zeus_expanded",

  // Onboarding
  ONBOARDING_DONE: "focusos_onboarding_done",
  FIRST_TASK_COMPLETED: "focusos_first_task_completed",

  // User Session
  CURRENT_STREAK: "focusos_current_streak",
  LAST_SESSION_DATE: "focusos_last_session_date",
  TOTAL_SESSIONS: "focusos_total_sessions",
  TOTAL_MINUTES: "focusos_total_minutes",

  // User Preferences
  PREFERRED_SESSION_LENGTH: "focusos_session_length",
  DARK_MODE: "focusos_dark_mode",
  LANGUAGE: "focusos_language",
  PRO_MODE_ENABLED: "focusos_pro_mode",

  // Web3/Wallet
  CONNECTED_WALLET: "focusos_connected_wallet",
  WALLET_ADDRESS: "focusos_wallet_address",
  FCS_BALANCE: "focusos_fcs_balance",

  // Health Tracking
  WATER_INTAKE_TODAY: "focusos_water_today",
  SLEEP_HOURS_LAST_NIGHT: "focusos_sleep_hours",

  // Analytics
  LAST_CELEBRATION_TOAST: "focusos_last_celebration",
  STREAK_MILESTONE_SHOWN: "focusos_streak_milestone",
} as const;

/**
 * Helper functions to safely get/set localStorage values
 */

export const storage = {
  /**
   * Get value from localStorage with type safety
   */
  get(key: keyof typeof STORAGE_KEYS): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS[key]);
    } catch (e) {
      console.error(`[Storage] Failed to get ${key}:`, e);
      return null;
    }
  },

  /**
   * Set value in localStorage with type safety
   */
  set(key: keyof typeof STORAGE_KEYS, value: string | number | boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS[key], String(value));
    } catch (e) {
      console.error(`[Storage] Failed to set ${key}:`, e);
    }
  },

  /**
   * Get boolean value from localStorage
   */
  getBoolean(key: keyof typeof STORAGE_KEYS): boolean {
    const value = this.get(key);
    return value === "true" || value === "1";
  },

  /**
   * Get number value from localStorage
   */
  getNumber(key: keyof typeof STORAGE_KEYS): number {
    const value = this.get(key);
    return value ? parseInt(value, 10) : 0;
  },

  /**
   * Remove value from localStorage
   */
  remove(key: keyof typeof STORAGE_KEYS): void {
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
    } catch (e) {
      console.error(`[Storage] Failed to remove ${key}:`, e);
    }
  },

  /**
   * Clear all app-related storage
   */
  clear(): void {
    try {
      Object.keys(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
      });
    } catch (e) {
      console.error("[Storage] Failed to clear storage:", e);
    }
  },
};
