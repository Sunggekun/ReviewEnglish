import type { VocabItem } from '../types/vocab'

export type CloudVocabularyDoc = {
  schemaVersion: 1
  items: VocabItem[]
  deletedIds: Record<string, number>
  updatedAt: number
}

export function emptyCloudDoc(): CloudVocabularyDoc {
  return {
    schemaVersion: 1,
    items: [],
    deletedIds: {},
    updatedAt: Date.now(),
  }
}

function isDeleted(
  id: string,
  itemUpdatedAt: number,
  deletedIds: Record<string, number>,
): boolean {
  const deletedAt = deletedIds[id]
  return deletedAt !== undefined && deletedAt >= itemUpdatedAt
}

function mergeDeletedIds(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...a }
  for (const [id, deletedAt] of Object.entries(b)) {
    const existing = merged[id]
    if (existing === undefined || deletedAt > existing) {
      merged[id] = deletedAt
    }
  }
  return merged
}

function pickItem(
  local: VocabItem | undefined,
  remote: VocabItem | undefined,
  deletedIds: Record<string, number>,
): VocabItem | null {
  if (local && remote) {
    const winner = local.updatedAt >= remote.updatedAt ? local : remote
    return isDeleted(winner.id, winner.updatedAt, deletedIds) ? null : winner
  }

  const only = local ?? remote
  if (!only) return null
  return isDeleted(only.id, only.updatedAt, deletedIds) ? null : only
}

export function mergeVocabulary(
  localItems: VocabItem[],
  localDeletedIds: Record<string, number>,
  remoteDoc: CloudVocabularyDoc,
): CloudVocabularyDoc {
  const deletedIds = mergeDeletedIds(localDeletedIds, remoteDoc.deletedIds)

  const localById = new Map(localItems.map((item) => [item.id, item]))
  const remoteById = new Map(remoteDoc.items.map((item) => [item.id, item]))
  const allIds = new Set([...localById.keys(), ...remoteById.keys()])

  const items: VocabItem[] = []
  for (const id of allIds) {
    const merged = pickItem(localById.get(id), remoteById.get(id), deletedIds)
    if (merged) items.push(merged)
  }

  return {
    schemaVersion: 1,
    items,
    deletedIds,
    updatedAt: Date.now(),
  }
}

export function applyDeleteIds(
  items: VocabItem[],
  deletedIds: Record<string, number>,
  idsToDelete: string[],
): { items: VocabItem[]; deletedIds: Record<string, number> } {
  if (idsToDelete.length === 0) {
    return { items, deletedIds }
  }

  const now = Date.now()
  const nextDeletedIds = { ...deletedIds }
  for (const id of idsToDelete) {
    nextDeletedIds[id] = now
  }

  const deleteSet = new Set(idsToDelete)
  return {
    items: items.filter((item) => !deleteSet.has(item.id)),
    deletedIds: nextDeletedIds,
  }
}

export function cloudDocFingerprint(doc: CloudVocabularyDoc): string {
  const sortedItems = [...doc.items].sort((a, b) => a.id.localeCompare(b.id))
  const sortedDeleted = Object.entries(doc.deletedIds).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  return JSON.stringify({ items: sortedItems, deletedIds: sortedDeleted })
}
