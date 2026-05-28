import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore/lite'

const firebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export function getFirebaseConfigIssue(): string | null {
  const missing = firebaseEnvKeys.filter((key) => !import.meta.env[key])
  if (missing.length === 0) return null
  return `Missing Firebase env: ${missing.join(', ')}. Copy .env.example to .env.local, fill in your web app config, then restart npm run dev.`
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

export function firebaseConsoleAuthUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (projectId) {
    return `https://console.firebase.google.com/project/${projectId}/authentication/providers`
  }
  return 'https://console.firebase.google.com/'
}
