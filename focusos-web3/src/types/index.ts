/**
 * 📋 App Types - Centralized TypeScript type definitions
 * Keep all app-wide types in one place for maintainability
 */

// ============================================================================
// UI STATES
// ============================================================================

export type NavSection = "stats" | "health" | "web3" | "settings" | "help";
export type SecondarySection = "stats" | "health" | "web3" | "settings";
export type ZeusAvatarState = "neutral" | "proud" | "disappointed" | "wrath" | "tired";
export type FeedbackTone = "success" | "error" | "idle";
export type DeviceType = "mobile" | "desktop";

// ============================================================================
// SESSION & TRACKING
// ============================================================================

export interface SessionState {
  isRunning: boolean;
  durationMinutes: number;
  taskDescription: string;
  startedAt?: Date;
  endedAt?: Date;
}

export interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  longestSession: number;
  averageSessionLength: number;
}

export interface FocusSession {
  id: string;
  taskDescription: string;
  duration: number; // minutes
  startTime: Date;
  endTime: Date;
  completionPercentage: number;
}

// ============================================================================
// USER DATA
// ============================================================================

export interface UserProfile {
  walletAddress?: string;
  gmailAddress?: string;
  fcsBalance: number;
  proModeEnabled: boolean;
  preferredSessionLength: number; // minutes
  language: "en" | "pl" | "es";
  darkMode: boolean;
}

export interface HealthData {
  waterIntakeSlotsUsed: number;
  sleepHours: number;
  breaksTaken: number;
  lastBreakTime?: Date;
}

// ============================================================================
// WEB3 / WALLET
// ============================================================================

export interface WalletConnection {
  address: string;
  connected: boolean;
  balance: number;
  network?: string;
}

export interface FCSTransaction {
  id: string;
  type: "buy" | "sell" | "earn";
  amount: number;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
  hash?: string;
}

// ============================================================================
// ZEUS HOLOGRAM
// ============================================================================

export interface ZeusHologramProps {
  currentTab?: NavSection | "focus";
  sessionActive?: boolean;
  streakDays?: number;
  lastSessionDuration?: number;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

export interface ZeusMessage {
  text: string;
  type: "info" | "motivation" | "celebration" | "warning";
  duration?: number;
  animation?: "bounce" | "glow" | "shake";
}

// ============================================================================
// ONBOARDING
// ============================================================================

export type OnboardingStep = 1 | 2 | 3;
export type OnboardingMode = "demo" | "wallet" | "gmail";

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  selectedMode?: OnboardingMode;
  firstTaskCompleted: boolean;
  completedAt?: Date;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionResponse extends ApiResponse<FCSTransaction> {
  txHash?: string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface AnimationProps {
  duration?: number;
  delay?: number;
  repeat?: boolean;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export type ErrorCode =
  | "WALLET_CONNECTION_FAILED"
  | "TRANSACTION_FAILED"
  | "INVALID_INPUT"
  | "SESSION_START_FAILED"
  | "STORAGE_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// ============================================================================
// APP CONTEXT
// ============================================================================

export interface AppContextType {
  // Session
  sessionState: SessionState;
  startSession: (task: string) => void;
  endSession: () => void;
  pauseSession: () => void;

  // User
  userProfile: UserProfile;
  userStats: UserStats;
  updateProfile: (partial: Partial<UserProfile>) => void;

  // UI
  isMobile: boolean;
  theme: "dark" | "light";
  language: "en" | "pl" | "es";

  // Notifications
  showNotification: (message: string, tone: FeedbackTone) => void;
  showError: (error: AppError | string) => void;
}
