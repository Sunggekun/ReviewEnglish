import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Classes,
  Elevation,
  Spinner,
  Tag,
} from '@blueprintjs/core'
import type { VocabItem } from '../types/vocab'
import { lookupEnglishWord, type DictionaryMeaning } from '../services/dictionary'
import { pronounceWord } from '../services/pronounce'
import { shuffleArray } from '../utils/shuffleArray'

export type VocabularyFlashcardsProps = {
  items: VocabItem[]
  translationLanguageLabel: string
  speechVoiceURI?: string
  onExit: () => void
}

const emDash = '—'

export function VocabularyFlashcards({
  items,
  translationLanguageLabel,
  speechVoiceURI = '',
  onExit,
}: VocabularyFlashcardsProps) {
  const [deck] = useState(() => shuffleArray(items))
  const [index, setIndex] = useState(0)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showMeanings, setShowMeanings] = useState(false)
  const [meaningsLoading, setMeaningsLoading] = useState(false)
  const [meaningsError, setMeaningsError] = useState<string | null>(null)
  const [meanings, setMeanings] = useState<DictionaryMeaning[]>([])
  const meaningsCache = useRef(
    new Map<string, { meanings: DictionaryMeaning[]; error: string | null }>(),
  )
  const meaningsPanelRef = useRef<HTMLDivElement>(null)

  const current = deck[index]
  const ipa = current ? current.ipa || current.phonics : ''
  const atStart = index === 0
  const atEnd = index >= deck.length - 1

  const goPrevious = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1))
    setShowTranslation(false)
    setShowMeanings(false)
  }, [])

  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(deck.length - 1, prev + 1))
    setShowTranslation(false)
    setShowMeanings(false)
  }, [deck.length])

  const handlePronounce = useCallback(() => {
    if (current) pronounceWord(current.word, { voiceURI: speechVoiceURI })
  }, [current, speechVoiceURI])

  useEffect(() => {
    if (!showMeanings || !current) return

    const word = current.word.trim()
    const cached = meaningsCache.current.get(word)
    if (cached) {
      setMeanings(cached.meanings)
      setMeaningsError(cached.error)
      setMeaningsLoading(false)
      return
    }

    let cancelled = false
    setMeanings([])
    setMeaningsError(null)
    setMeaningsLoading(true)

    lookupEnglishWord(word)
      .then((result) => {
        if (cancelled) return
        const error = result.meanings.length
          ? null
          : 'No meanings returned from Free Dictionary API.'
        meaningsCache.current.set(word, {
          meanings: result.meanings,
          error,
        })
        setMeanings(result.meanings)
        setMeaningsError(error)
      })
      .catch((err) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to load meanings.'
        meaningsCache.current.set(word, { meanings: [], error: message })
        setMeanings([])
        setMeaningsError(message)
      })
      .finally(() => {
        if (!cancelled) setMeaningsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showMeanings, current])

  useEffect(() => {
    if (showMeanings) meaningsPanelRef.current?.scrollTo({ top: 0 })
  }, [showMeanings, index, meaningsLoading, meanings.length])

  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        onExit()
        return
      }
      if (evt.key === 'ArrowLeft' && !atStart) {
        evt.preventDefault()
        goPrevious()
        return
      }
      if (evt.key === 'ArrowRight' && !atEnd) {
        evt.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [atEnd, atStart, goNext, goPrevious, onExit])

  if (!current) return null

  return (
    <div
      className="vocab-flashcard-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vocabulary flashcards"
    >
      <div className="vocab-flashcard-panel">
        <div className="vocab-flashcard-header">
          <Tag minimal intent="primary">
            {index + 1} / {deck.length}
          </Tag>
        </div>

        <Card elevation={Elevation.TWO} className="vocab-flashcard-card">
          <div className="vocab-flashcard-word-row">
            <h2 className="vocab-flashcard-word">{current.word}</h2>
            <Button
              icon="volume-up"
              variant="minimal"
              aria-label={`Pronounce ${current.word}`}
              onClick={handlePronounce}
            />
          </div>

          {ipa ? (
            <p className="vocab-flashcard-ipa" style={{ fontFamily: 'Georgia, serif' }}>
              {ipa}
            </p>
          ) : null}

          <div
            className={
              showTranslation
                ? 'vocab-flashcard-translation vocab-flashcard-translation--revealed'
                : 'vocab-flashcard-translation'
            }
          >
            {showTranslation ? (
              <>
                <span className="vocab-flashcard-translation-label">
                  {translationLanguageLabel}
                </span>
                <span>{current.translationZh || emDash}</span>
              </>
            ) : (
              <span className="vocab-flashcard-translation-hidden">
                Translation hidden
              </span>
            )}
          </div>

          <div
            ref={meaningsPanelRef}
            className={
              showMeanings
                ? 'vocab-flashcard-meanings vocab-flashcard-meanings--revealed'
                : 'vocab-flashcard-meanings'
            }
          >
            {showMeanings ? (
              <>
                <span className="vocab-flashcard-translation-label">
                  English meanings
                </span>
                {meaningsLoading ? (
                  <div className="vocab-flashcard-meanings-status">
                    <Spinner size={16} />
                    <span>Loading meanings…</span>
                  </div>
                ) : meaningsError ? (
                  <Callout intent="danger" icon="error">
                    {meaningsError}
                  </Callout>
                ) : meanings.length === 0 ? (
                  <p className="vocab-flashcard-meanings-empty">
                    No meanings available for this word.
                  </p>
                ) : (
                  <div className="vocab-flashcard-meanings-list">
                    {meanings.map((meaning, idx) => (
                      <div
                        key={`${meaning.partOfSpeech || 'meaning'}-${idx}`}
                        className="vocab-flashcard-meaning-item"
                      >
                        <strong>{meaning.partOfSpeech || '—'}</strong>
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
              </>
            ) : (
              <span className="vocab-flashcard-translation-hidden">
                Meanings hidden
              </span>
            )}
          </div>
        </Card>

        <div className="vocab-flashcard-toolbar" role="toolbar" aria-label="Flashcard controls">
          <ButtonGroup fill>
            <Button
              icon="chevron-left"
              disabled={atStart}
              aria-label="Previous card"
              onClick={goPrevious}
            >
              Previous
            </Button>
            <Button
              endIcon="chevron-right"
              disabled={atEnd}
              aria-label="Next card"
              onClick={goNext}
            >
              Next
            </Button>
          </ButtonGroup>
          <ButtonGroup fill>
            <Button
              icon={showTranslation ? 'eye-off' : 'eye-open'}
              onClick={() => setShowTranslation((prev) => !prev)}
            >
              {showTranslation ? 'Hide translation' : 'Show translation'}
            </Button>
            <Button
              icon={showMeanings ? 'eye-off' : 'info-sign'}
              onClick={() => setShowMeanings((prev) => !prev)}
            >
              {showMeanings ? 'Hide meanings' : 'Show meanings'}
            </Button>
            <Button icon="cross" onClick={onExit}>
              Exit
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  )
}
