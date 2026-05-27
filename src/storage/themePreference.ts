export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'reviewenglish-theme-preference'

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* ignore */
  }
}

/** Effective dark mode given user preference + OS preference. */
export function resolveIsDark(pref: ThemePreference): boolean {
  if (pref === 'dark') return true
  if (pref === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Blueprint dark-theme container class (see typography “Dark theme” docs). */
export const BP_DARK_CLASS = 'bp6-dark'

/**
 * Applies Blueprint dark theme on `<html>`:
 * - `data-bp-color-scheme` for design tokens
 * - `bp6-dark` so nested `.bp6-*` typography, tables, links, etc. cascade correctly
 */
export function applyBpColorScheme(isDark: boolean): void {
  const root = document.documentElement
  if (isDark) {
    root.dataset.bpColorScheme = 'dark'
    root.style.colorScheme = 'dark'
    root.classList.add(BP_DARK_CLASS)
  }
  else {
    delete root.dataset.bpColorScheme
    root.style.colorScheme = 'light'
    root.classList.remove(BP_DARK_CLASS)
  }
}
