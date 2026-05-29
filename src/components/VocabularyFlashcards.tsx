import { useCallback, useEffect, useState } from 'react'
import { Button, ButtonGroup, Card, Elevation, Tag } from '@blueprintjs/core'
import type { VocabItem } from '../types/vocab'
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

  const current = deck[index]
  const ipa = current ? current.ipa || current.phonics : ''
  const atStart = index === 0
  const atEnd = index >= deck.length - 1

  const goPrevious = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1))
    setShowTranslation(false)
  }, [])

  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(deck.length - 1, prev + 1))
    setShowTranslation(false)
  }, [deck.length])

  const handlePronounce = useCallback(() => {
    if (current) pronounceWord(current.word, { voiceURI: speechVoiceURI })
  }, [current, speechVoiceURI])

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
            <Button icon="cross" onClick={onExit}>
              Exit
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  )
}
