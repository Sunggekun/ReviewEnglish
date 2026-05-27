import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  applyBpColorScheme,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../storage/themePreference'

function subscribeSystemDark(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSystemDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getSystemDarkServerSnapshot(): boolean {
  return false
}

/**
 * Persisted Blueprint light/dark + OS sync when preference is `"system"`.
 */
export function useThemePreference(): {
  preference: ThemePreference
  resolvedDark: boolean
  setPreference: (pref: ThemePreference) => void
} {
  const [preference, setPreferenceState] = useState(loadThemePreference)

  const systemIsDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    getSystemDarkServerSnapshot,
  )

  const resolvedDark = useMemo(
    () =>
      preference === 'dark'
        ? true
        : preference === 'light'
          ? false
          : systemIsDark,
    [preference, systemIsDark],
  )

  useEffect(() => {
    applyBpColorScheme(resolvedDark)
  }, [resolvedDark])

  const setPreference = (pref: ThemePreference) => {
    saveThemePreference(pref)
    setPreferenceState(pref)
  }

  return { preference, resolvedDark, setPreference }
}
