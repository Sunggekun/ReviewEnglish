import { useMemo, useState } from 'react'
import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Checkbox,
  Classes,
  ControlGroup,
  Elevation,
  FormGroup,
  HTMLTable,
  InputGroup,
  NonIdealState,
  Dialog,
  Spinner,
  Tag,
} from '@blueprintjs/core'
import type { VocabItem } from '../types/vocab'
import { pronounceWord } from '../services/pronounce'
import type { DictionaryMeaning } from '../services/dictionary'

export type VocabularyListProps = {
  items: VocabItem[]
  query: string
  onQueryChange: (value: string) => void
  onUpdate: (item: VocabItem) => void
  onRemove: (ids: string[]) => void
  speechVoiceURI?: string
}

export function VocabularyList({
  items,
  query,
  onQueryChange,
  onUpdate,
  onRemove,
  speechVoiceURI = '',
}: VocabularyListProps) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.translationZh.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q),
    )
  }, [items, query])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftWord, setDraftWord] = useState('')
  const [draftZh, setDraftZh] = useState('')
  const [draftIpa, setDraftIpa] = useState('')
  const [pronounceNotice, setPronounceNotice] = useState<string | null>(null)

  const [meaningsForWord, setMeaningsForWord] = useState<string | null>(null)
  const [meaningsLoading, setMeaningsLoading] = useState(false)
  const [meaningsError, setMeaningsError] = useState<string | null>(null)
  const [meanings, setMeanings] = useState<DictionaryMeaning[]>([])

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const startEdit = (item: VocabItem) => {
    setEditingId(item.id)
    setDraftWord(item.word)
    setDraftZh(item.translationZh)
    setDraftIpa(item.ipa || item.phonics)
    setPronounceNotice(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftWord('')
    setDraftZh('')
    setDraftIpa('')
  }

  const saveEdit = (item: VocabItem) => {
    const word = draftWord.trim()
    const translationZh = draftZh.trim()
    const ipa = draftIpa.trim()
    onUpdate({
      ...item,
      word,
      translationZh,
      ipa,
    })
    cancelEdit()
  }

  const handlePronounce = (word: string) => {
    const r = pronounceWord(word, { voiceURI: speechVoiceURI })
    setPronounceNotice(r.ok ? null : r.reason ?? 'Could not pronounce.')
  }

  const closeMeaningsDialog = () => {
    setMeaningsForWord(null)
    setMeanings([])
    setMeaningsError(null)
    setMeaningsLoading(false)
  }

  const enterSelectMode = () => {
    cancelEdit()
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id))
  const someFilteredSelected =
    filtered.some((item) => selectedIds.has(item.id)) && !allFilteredSelected

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const item of filtered) next.delete(item.id)
        return next
      })
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of filtered) next.add(item.id)
      return next
    })
  }

  const deleteSelected = () => {
    if (selectedIds.size === 0) return
    onRemove([...selectedIds])
    exitSelectMode()
  }

  const openMeaningsDialog = async (word: string) => {
    setMeaningsForWord(word)
    setMeanings([])
    setMeaningsError(null)
    setMeaningsLoading(true)

    try {
      const { lookupEnglishWord } = await import('../services/dictionary')
      const result = await lookupEnglishWord(word)
      setMeanings(result.meanings)
      if (!result.meanings.length) {
        setMeaningsError('No meanings returned from Free Dictionary API.')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load meanings.'
      setMeaningsError(message)
    } finally {
      setMeaningsLoading(false)
    }
  }

  return (
    <section className="vocab-list-section">
      <Card elevation={Elevation.TWO} className="vocab-panel">
        <FormGroup fill label="Search" labelFor="search-vocab">
          <ControlGroup fill vertical={false}>
            <InputGroup
              fill
              id="search-vocab"
              leftIcon="search"
              placeholder="Filter by word, Chinese, or IPA…"
              value={query}
              type="search"
              autoComplete="off"
              onChange={(evt) => onQueryChange(evt.target.value)}
            />
            <Tag minimal intent="primary">
              {filtered.length}/{items.length}
            </Tag>
            {items.length > 0 ? (
              selectMode ? null : (
                <Button
                  icon="trash"
                  intent="danger"
                  aria-label="Select words to delete"
                  title="Select words to delete"
                  onClick={enterSelectMode}
                />
              )
            ) : null}
          </ControlGroup>
        </FormGroup>

        {selectMode ? (
          <div
            className="vocab-select-topbar"
            role="region"
            aria-label="Delete selected words"
          >
            <div className="vocab-select-topbar__meta">
              <Tag minimal intent="primary">
                {selectedIds.size} selected
              </Tag>
            </div>
            <div className="vocab-select-topbar__actions">
              <Button
                icon="trash"
                intent="danger"
                disabled={selectedIds.size === 0}
                onClick={deleteSelected}
              >
                Delete
              </Button>
              <Button icon="cross" onClick={exitSelectMode}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {selectMode ? (
          <Callout
            compact
            className="vocab-margin-top"
            icon="multi-select"
            intent="primary"
          >
            Select rows to remove, then choose Delete selected.
            {selectedIds.size > 0
              ? ` (${selectedIds.size} selected)`
              : null}
          </Callout>
        ) : null}

        {pronounceNotice ? (
          <Callout
            compact
            className="vocab-margin-top"
            icon="volume-off"
            intent="warning"
            title={pronounceNotice}
          />
        ) : null}

        {filtered.length === 0 ? (
          <NonIdealState
            className="vocab-non-ideal"
            icon="bookmark"
            title={
              items.length === 0
                ? 'No words saved yet'
                : 'Nothing matches your search'
            }
            description={
              items.length === 0
                ? 'Add a vocabulary entry above.'
                : 'Try a different keyword or clear the filter.'
            }
          />
        ) : (
          <div className="table-scroll vocab-margin-top">
            <HTMLTable
              bordered
              interactive
              striped
              className={
                selectMode
                  ? 'vocab-html-table vocab-html-table--select'
                  : 'vocab-html-table'
              }
              style={{ width: '100%' }}
            >
              <thead>
                <tr>
                  {selectMode ? (
                    <th scope="col" className="vocab-cell-select">
                      <Checkbox
                        aria-label="Select all visible words"
                        checked={allFilteredSelected}
                        indeterminate={someFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                      />
                    </th>
                  ) : null}
                  <th scope="col">Word</th>
                  <th scope="col">Chinese</th>
                  <th scope="col">Phonics (IPA)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      selectMode && selectedIds.has(item.id)
                        ? 'vocab-row-selected'
                        : undefined
                    }
                  >
                    {selectMode ? (
                      <td className="vocab-cell-select">
                        <Checkbox
                          aria-label={`Select ${item.word}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                    ) : null}
                    <td className="vocab-cell-word">
                      <div className="vocab-cell-word-inner">
                        {editingId === item.id ? (
                          <InputGroup
                            className="vocab-cell-input"
                            fill
                            aria-label={`Word for ${item.word}`}
                            value={draftWord}
                            onChange={(evt) => setDraftWord(evt.target.value)}
                            autoFocus
                            onKeyDown={(evt) => {
                              if (evt.key === 'Escape') cancelEdit()
                              if (evt.key === 'Enter') saveEdit(item)
                            }}
                            small
                          />
                        ) : selectMode ? (
                          <strong>{item.word}</strong>
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            style={{ cursor: 'text' }}
                            onClick={() => startEdit(item)}
                            onKeyDown={(evt) => {
                              if (evt.key === 'Enter' || evt.key === ' ') startEdit(item)
                            }}
                            aria-label={`Edit word for ${item.word}`}
                            title="Click to edit"
                          >
                            <strong>{item.word}</strong>
                          </span>
                        )}
                        {selectMode ? null : editingId === item.id ? (
                          <ButtonGroup variant="minimal" size="small">
                            <Button
                              icon="floppy-disk"
                              intent="success"
                              aria-label={`Save changes for ${item.word}`}
                              title="Save"
                              onClick={() => saveEdit(item)}
                            />
                            <Button
                              icon="cross"
                              aria-label={`Cancel editing ${item.word}`}
                              title="Cancel"
                              onClick={cancelEdit}
                            />
                          </ButtonGroup>
                        ) : (
                          <ButtonGroup variant="minimal" size="small">
                            <Button
                              icon="volume-up"
                              aria-label={`Pronounce ${item.word}`}
                              onClick={() => handlePronounce(item.word)}
                            />
                            <Button
                              icon="info-sign"
                              aria-label={`Show meanings for ${item.word}`}
                              title="Show meanings from Free Dictionary API"
                              onClick={() => openMeaningsDialog(item.word)}
                            />
                          </ButtonGroup>
                        )}
                      </div>
                    </td>
                    <td className="vocab-cell-zh">
                      {editingId === item.id ? (
                        <InputGroup
                          className="vocab-cell-input"
                          fill
                          aria-label={`Chinese translation for ${item.word}`}
                          value={draftZh}
                          onChange={(evt) => setDraftZh(evt.target.value)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Escape') cancelEdit()
                            if (evt.key === 'Enter') saveEdit(item)
                          }}
                          small
                        />
                      ) : selectMode ? (
                        item.translationZh || emDash
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'text' }}
                          onClick={() => startEdit(item)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Enter' || evt.key === ' ') startEdit(item)
                          }}
                          aria-label={`Edit Chinese translation for ${item.word}`}
                          title="Click to edit"
                        >
                          {item.translationZh || emDash}
                        </span>
                      )}
                    </td>
                    <td className="vocab-cell-ipa" style={{ fontFamily: 'Georgia, serif' }}>
                      {editingId === item.id ? (
                        <InputGroup
                          className="vocab-cell-input"
                          fill
                          aria-label={`Phonics (IPA) for ${item.word}`}
                          value={draftIpa}
                          onChange={(evt) => setDraftIpa(evt.target.value)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Escape') cancelEdit()
                            if (evt.key === 'Enter') saveEdit(item)
                          }}
                          small
                        />
                      ) : selectMode ? (
                        item.ipa || item.phonics || emDash
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'text' }}
                          onClick={() => startEdit(item)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Enter' || evt.key === ' ') startEdit(item)
                          }}
                          aria-label={`Edit phonics (IPA) for ${item.word}`}
                          title="Click to edit"
                        >
                          {item.ipa || item.phonics || emDash}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </div>
        )}

        <Dialog
          isOpen={meaningsForWord !== null}
          onClose={closeMeaningsDialog}
          title={
            meaningsForWord
              ? `Meanings for “${meaningsForWord}”`
              : 'Word meanings'
          }
        >
          <div className={Classes.DIALOG_BODY}>
            {meaningsLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Spinner size={16} />
                <span>Loading meanings from Free Dictionary API…</span>
              </div>
            ) : meaningsError ? (
              <Callout intent="danger" icon="error" title={meaningsError} />
            ) : meanings.length === 0 ? (
              <p>No meanings available for this word.</p>
            ) : (
              <div className="vocab-meanings-list">
                {meanings.map((meaning, idx) => (
                  <div
                    key={`${meaning.partOfSpeech || 'meaning'}-${idx}`}
                    style={{ marginBottom: 10 }}
                  >
                    <div>
                      <strong>
                        {meaning.partOfSpeech || '—'}
                      </strong>
                    </div>
                    <div>{meaning.definition}</div>
                    {meaning.example ? (
                      <div className={Classes.TEXT_MUTED}>
                        Example: <em>{meaning.example}</em>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog>
      </Card>
    </section>
  )
}

const emDash = '—'
