import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  applyBpColorScheme,
  loadThemePreference,
  resolveIsDark,
} from './storage/themePreference'
import './index.css'
import App from './App.tsx'

applyBpColorScheme(resolveIsDark(loadThemePreference()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
