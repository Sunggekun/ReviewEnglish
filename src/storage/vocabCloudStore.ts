import { doc, getDoc, setDoc } from 'firebase/firestore/lite'
import { auth, db } from '../firebase/config'
import type { VocabItem } from '../types/vocab'
import { normalizeItem } from './vocabStore'
import {
  emptyCloudDoc,
  type CloudVocabularyDoc,
} from './vocabMerge'

function vocabDocRef(uid: string) {
  return doc(db, 'users', uid, 'data', 'vocabulary')
}

function normalizeDeletedIds(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const result: Record<string, number> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[id] = value
    }
  }
  return result
}

function parseCloudDoc(raw: unknown): CloudVocabularyDoc {
  if (!raw || typeof raw !== 'object') return emptyCloudDoc()

  const data = raw as {
    schemaVersion?: unknown
    items?: unknown
    deletedIds?: unknown
    updatedAt?: unknown
  }

  const items = Array.isArray(data.items)
    ? (data.items.map(normalizeItem).filter(Boolean) as VocabItem[])
    : []

  return {
    schemaVersion: 1,
    items,
    deletedIds: normalizeDeletedIds(data.deletedIds),
    updatedAt:
      typeof data.updatedAt === 'number' && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : Date.now(),
  }
}

export function formatFirestoreError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : null

  if (code === 'permission-denied') {
    return (
      'Firestore permission denied. In Firebase Console, set rules so each user can read/write ' +
      'users/{userId}/data/{docId} (see README).'
    )
  }
  if (code === 'unavailable') {
    return 'Firestore is unavailable. Check your network connection and try again.'
  }

  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  if (/blocked|ERR_BLOCKED_BY_CLIENT/i.test(message)) {
    return (
      'Cloud sync was blocked by a browser extension (often an ad blocker). ' +
      'Disable it for this site or allow firestore.googleapis.com.'
    )
  }

  if (message) return message
  return 'Cloud sync failed.'
}

async function ensureAuthReady(): Promise<void> {
  await auth.authStateReady()
  if (!auth.currentUser) {
    throw new Error('Not signed in.')
  }
}

export async function loadCloudVocabulary(
  uid: string,
): Promise<CloudVocabularyDoc> {
  await ensureAuthReady()
  const snap = await getDoc(vocabDocRef(uid))
  if (!snap.exists()) return emptyCloudDoc()
  return parseCloudDoc(snap.data())
}

export async function saveCloudVocabulary(
  uid: string,
  payload: CloudVocabularyDoc,
): Promise<void> {
  await ensureAuthReady()
  await setDoc(vocabDocRef(uid), payload)
}
