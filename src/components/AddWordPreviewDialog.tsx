import { useState } from 'react'
import {
  Button,
  Callout,
  Classes,
  Dialog,
  FormGroup,
  H4,
  InputGroup,
  Intent,
} from '@blueprintjs/core'

export type AddWordPreviewDialogProps = {
  isOpen: boolean
  word: string
  translationZh: string
  ipa: string
  hints: string[]
  translationLanguageLabel: string
  onConfirm: (translationZh: string, ipa: string) => void
  onDiscard: () => void
}

export function AddWordPreviewDialog({
  isOpen,
  word,
  translationZh: initialTranslationZh,
  ipa: initialIpa,
  hints,
  translationLanguageLabel,
  onConfirm,
  onDiscard,
}: AddWordPreviewDialogProps) {
  const [translationZh, setTranslationZh] = useState(initialTranslationZh)
  const [ipa, setIpa] = useState(initialIpa)

  return (
    <Dialog
      className="add-word-preview-dialog"
      isOpen={isOpen}
      onClose={onDiscard}
      title={`Add “${word}”?`}
      icon="font"
    >
      <div className={Classes.DIALOG_BODY}>
        <H4 className="add-word-preview-word">{word}</H4>

        {hints.length > 0 ? (
          <Callout
            compact
            className="add-word-preview-hints"
            icon="warning-sign"
            intent={Intent.WARNING}
          >
            {hints.join(' ')}
          </Callout>
        ) : null}

        <FormGroup label={translationLanguageLabel} labelFor="add-preview-translation">
          <InputGroup
            id="add-preview-translation"
            fill
            value={translationZh}
            onChange={(evt) => setTranslationZh(evt.target.value)}
            placeholder={`${translationLanguageLabel} translation…`}
          />
        </FormGroup>

        <FormGroup label="Phonics (IPA)" labelFor="add-preview-ipa">
          <InputGroup
            id="add-preview-ipa"
            fill
            className="add-word-preview-ipa-input"
            value={ipa}
            onChange={(evt) => setIpa(evt.target.value)}
            placeholder="IPA / phonics…"
          />
        </FormGroup>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onDiscard} text="Discard" />
          <Button
            intent={Intent.PRIMARY}
            icon="tick"
            text="Add"
            onClick={() => onConfirm(translationZh.trim(), ipa.trim())}
          />
        </div>
      </div>
    </Dialog>
  )
}
