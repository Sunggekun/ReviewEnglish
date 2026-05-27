import { useMemo, useState } from 'react'
import {
  Button,
  ButtonGroup,
  Callout,
  Card,
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
  onRemove: (id: string) => void
  speechLang?: string
}

export function VocabularyList({
  items,
  query,
  onQueryChange,
  onUpdate,
  onRemove,
  speechLang = 'en-US',
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
      updatedAt: Date.now(),
    })
    cancelEdit()
  }

  const handlePronounce = (word: string) => {
    const r = pronounceWord(word, { lang: speechLang })
    setPronounceNotice(r.ok ? null : r.reason ?? 'Could not pronounce.')
  }

  const closeMeaningsDialog = () => {
    setMeaningsForWord(null)
    setMeanings([])
    setMeaningsError(null)
    setMeaningsLoading(false)
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
            <Tag
              className={Classes.FIXED}
              minimal
              intent="primary"
            >
              {filtered.length}/{items.length}
            </Tag>
          </ControlGroup>
        </FormGroup>

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
              className="vocab-html-table"
              style={{ width: '100%' }}
            >
              <thead>
                <tr>
                  <th scope="col">Word</th>
                  <th scope="col">Chinese</th>
                  <th scope="col">Phonics (IPA)</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <ControlGroup fill={false} vertical={false}>
                          <Button
                            icon="floppy-disk"
                            intent="success"
                            aria-label={`Save changes for ${item.word}`}
                            size="small"
                            minimal
                            onClick={() => saveEdit(item)}
                          />
                          <InputGroup
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
                        </ControlGroup>
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
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <InputGroup
                          aria-label={`Chinese translation for ${item.word}`}
                          value={draftZh}
                          onChange={(evt) => setDraftZh(evt.target.value)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Escape') cancelEdit()
                            if (evt.key === 'Enter') saveEdit(item)
                          }}
                          small
                        />
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
                    <td style={{ fontFamily: 'Georgia, serif' }}>
                      {editingId === item.id ? (
                        <InputGroup
                          aria-label={`Phonics (IPA) for ${item.word}`}
                          value={draftIpa}
                          onChange={(evt) => setDraftIpa(evt.target.value)}
                          onKeyDown={(evt) => {
                            if (evt.key === 'Escape') cancelEdit()
                            if (evt.key === 'Enter') saveEdit(item)
                          }}
                          small
                        />
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
                    <td>
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
                        <Button
                          icon="trash"
                          aria-label={`Remove ${item.word}`}
                          disabled={editingId === item.id}
                          intent="danger"
                          title={editingId === item.id ? 'Save changes first' : undefined}
                          onClick={() => {
                            onRemove(item.id)
                          }}
                        />
                      </ButtonGroup>
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
