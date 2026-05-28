import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { User } from 'firebase/auth'
import {
  formatFirestoreError,
  loadCloudVocabulary,
  saveCloudVocabulary,
} from '../storage/vocabCloudStore'
import {
  applyDeleteIds,
  cloudDocFingerprint,
  mergeVocabulary,
  type CloudVocabularyDoc,
} from '../storage/vocabMerge'
import { loadVocabulary, saveVocabulary } from '../storage/vocabStore'
import type { VocabItem } from '../types/vocab'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

const UPLOAD_DEBOUNCE_MS = 500
const POLL_INTERVAL_MS = 30_000

function buildCloudDoc(
  items: VocabItem[],
  deletedIds: Record<string, number>,
): CloudVocabularyDoc {
  return {
    schemaVersion: 1,
    items,
    deletedIds,
    updatedAt: Date.now(),
  }
}

export function useVocabulary(user: User | null): {
  items: VocabItem[]
  setItems: Dispatch<SetStateAction<VocabItem[]>>
  removeItems: (ids: string[]) => void
  syncStatus: SyncStatus
  syncError: string | null
} {
  const [items, setItemsState] = useState<VocabItem[]>(() => loadVocabulary())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)

  const itemsRef = useRef(items)
  const deletedIdsRef = useRef<Record<string, number>>({})
  const lastAppliedFingerprintRef = useRef<string | null>(null)
  const lastPushedFingerprintRef = useRef<string | null>(null)
  const uploadTimerRef = useRef<number | null>(null)
  const isPushingRef = useRef(false)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const clearUploadTimer = useCallback(() => {
    if (uploadTimerRef.current !== null) {
      window.clearTimeout(uploadTimerRef.current)
      uploadTimerRef.current = null
    }
  }, [])

  const applyCloudDoc = useCallback((doc: CloudVocabularyDoc) => {
    const fingerprint = cloudDocFingerprint(doc)
    if (fingerprint === lastAppliedFingerprintRef.current) return

    lastAppliedFingerprintRef.current = fingerprint
    deletedIdsRef.current = doc.deletedIds
    itemsRef.current = doc.items
    setItemsState(doc.items)
    saveVocabulary(doc.items)
  }, [])

  const pullFromCloud = useCallback(
    async (uid: string): Promise<void> => {
      if (isPushingRef.current) return

      try {
        const remote = await loadCloudVocabulary(uid)
        const merged = mergeVocabulary(
          itemsRef.current,
          deletedIdsRef.current,
          remote,
        )
        applyCloudDoc(merged)
        setSyncStatus(navigator.onLine ? 'idle' : 'offline')
      } catch (error) {
        setSyncStatus('error')
        setSyncError(formatFirestoreError(error))
      }
    },
    [applyCloudDoc],
  )

  const pushToCloud = useCallback(async (uid: string): Promise<boolean> => {
    const payload = buildCloudDoc(itemsRef.current, deletedIdsRef.current)
    const fingerprint = cloudDocFingerprint(payload)

    if (fingerprint === lastPushedFingerprintRef.current) {
      setSyncStatus(navigator.onLine ? 'idle' : 'offline')
      return true
    }

    setSyncStatus('syncing')
    setSyncError(null)
    isPushingRef.current = true

    try {
      await saveCloudVocabulary(uid, payload)
      lastPushedFingerprintRef.current = fingerprint
      lastAppliedFingerprintRef.current = fingerprint
      setSyncStatus(navigator.onLine ? 'idle' : 'offline')
      return true
    } catch (error) {
      setSyncStatus('error')
      setSyncError(formatFirestoreError(error))
      return false
    } finally {
      isPushingRef.current = false
    }
  }, [])

  const scheduleUpload = useCallback(
    (uid: string) => {
      clearUploadTimer()
      uploadTimerRef.current = window.setTimeout(() => {
        uploadTimerRef.current = null
        void pushToCloud(uid)
      }, UPLOAD_DEBOUNCE_MS)
    },
    [clearUploadTimer, pushToCloud],
  )

  useEffect(() => {
    if (!user) {
      clearUploadTimer()
      return
    }

    const uid = user.uid
    let cancelled = false

    async function bootstrap() {
      setSyncStatus('syncing')
      setSyncError(null)

      try {
        const remote = await loadCloudVocabulary(uid)
        if (cancelled) return

        const merged = mergeVocabulary(
          itemsRef.current,
          deletedIdsRef.current,
          remote,
        )

        applyCloudDoc(merged)

        const saved = await pushToCloud(uid)
        if (cancelled || !saved) return

        setSyncStatus(navigator.onLine ? 'idle' : 'offline')
      } catch (error) {
        if (!cancelled) {
          setSyncStatus('error')
          setSyncError(formatFirestoreError(error))
        }
      }
    }

    void bootstrap()

    const pollId = window.setInterval(() => {
      void pullFromCloud(uid)
    }, POLL_INTERVAL_MS)

    const handleFocus = () => {
      void pullFromCloud(uid)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      clearUploadTimer()
      window.clearInterval(pollId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, applyCloudDoc, clearUploadTimer, pullFromCloud, pushToCloud])

  useEffect(() => {
    saveVocabulary(items)
    if (!user?.uid) return
    scheduleUpload(user.uid)
  }, [items, user?.uid, scheduleUpload])

  useEffect(() => {
    const handleOnline = () => {
      if (user?.uid) void pushToCloud(user.uid)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user?.uid, pushToCloud])

  const setItems: Dispatch<SetStateAction<VocabItem[]>> = useCallback(
    (value) => {
      setItemsState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        itemsRef.current = next
        return next
      })
    },
    [],
  )

  const removeItems = useCallback((ids: string[]) => {
    if (ids.length === 0) return

    setItemsState((prev) => {
      const { items: nextItems, deletedIds } = applyDeleteIds(
        prev,
        deletedIdsRef.current,
        ids,
      )
      deletedIdsRef.current = deletedIds
      itemsRef.current = nextItems
      return nextItems
    })
  }, [])

  return {
    items,
    setItems,
    removeItems,
    syncStatus: user ? syncStatus : 'idle',
    syncError: user ? syncError : null,
  }
}
