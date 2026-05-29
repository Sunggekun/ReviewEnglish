import { useState, type FormEvent } from 'react'
import {
  Button,
  Card,
  Classes,
  ControlGroup,
  Elevation,
  FormGroup,
  H4,
  InputGroup,
  Intent,
} from '@blueprintjs/core'

export type AddWordFormProps = {
  disabled?: boolean
  onSubmit: (word: string) => Promise<void>
}

export function AddWordForm({ disabled, onSubmit }: AddWordFormProps) {
  const [word, setWord] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)
    const trimmed = word.trim()
    if (!trimmed) {
      setLocalError('Enter an English word.')
      return
    }
    try {
      await onSubmit(trimmed)
      setWord('')
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Could not add that word.',
      )
    }
  }

  return (
    <Card elevation={Elevation.TWO} className="vocab-panel">
      <H4>Add a word</H4>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <FormGroup
          intent={localError ? Intent.DANGER : undefined}
          helperText={localError ?? undefined}
        >
          <ControlGroup fill>
            <InputGroup
              fill
              autoComplete="off"
              aria-label="English word"
              disabled={disabled}
              id="new-word-input"
              placeholder="English word…"
              value={word}
              leftIcon="font"
              onChange={(evt) => setWord(evt.target.value)}
            />
            <Button
              className={Classes.FIXED}
              intent={Intent.PRIMARY}
              icon="plus"
              loading={disabled}
              disabled={disabled}
              type="submit"
              text={disabled ? 'Looking up…' : 'Add'}
            />
          </ControlGroup>
        </FormGroup>
      </form>
    </Card>
  )
}
