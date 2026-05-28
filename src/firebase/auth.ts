import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseConsoleAuthUrl, getFirebaseConfigIssue } from './config'

const googleProvider = new GoogleAuthProvider()

function authErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

export function formatAuthError(error: unknown): string {
  const configIssue = getFirebaseConfigIssue()
  if (configIssue) return configIssue

  const code = authErrorCode(error)
  if (code === 'auth/configuration-not-found') {
    return (
      'Google sign-in is not enabled in Firebase yet. Open Authentication in Firebase Console, click Get started if prompted, then enable the Google provider and set a support email. ' +
      `Console: ${firebaseConsoleAuthUrl()}`
    )
  }
  if (code === 'auth/unauthorized-domain') {
    return (
      'This site is not authorized for Firebase sign-in. Add your domain under Firebase Console → Authentication → Settings → Authorized domains (include localhost for local dev).'
    )
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled.'
  }
  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked. Allow popups for this site and try again.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Sign-in failed.'
}

export function signInWithGoogle(): Promise<User> {
  const configIssue = getFirebaseConfigIssue()
  if (configIssue) {
    return Promise.reject(new Error(configIssue))
  }

  return signInWithPopup(auth, googleProvider).then((result) => result.user)
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}

export function subscribeAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback)
}
