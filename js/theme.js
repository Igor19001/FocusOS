/* ── js/theme.js ─ ES Module ────────────────────────────────────────────────
   Theme helpers extracted from app.js.
   ═══════════════════════════════════════════════════════════════════════════ */

export const THEME_ALIASES = {
  cyberpunk: 'olympus',
  light:     'marble',
  retro:     'ember',
};

export const THEME_IDS = ['olympus', 'marble', 'ember', 'tide'];

export function resolveThemeId(name) {
  return THEME_ALIASES[name] || (THEME_IDS.includes(name) ? name : 'olympus');
}
