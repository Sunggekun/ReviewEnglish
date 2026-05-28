import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { signInWithGoogle, signOut as authSignOut, subscribeAuthState } from '../firebase/auth'

export function useAuth(): {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<User>
  signOut: () => Promise<void>
} {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeAuthState((nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  return {
    user,
    loading,
    signInWithGoogle,
    signOut: authSignOut,
  }
}
