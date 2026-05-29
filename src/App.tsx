import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Classes,
  Dialog,
  Divider,
  H1,
  H5,
  HTMLSelect,
  Intent,
  SegmentedControl,
  Tag,
} from '@blueprintjs/core'
import { AddWordForm } from './components/AddWordForm'
import { AddWordPreviewDialog } from './components/AddWordPreviewDialog'
import { VocabularyList } from './components/VocabularyList'
import {
  newVocabItem,
  parseVocabularyImport,
  serializeVocabulary,
} from './storage/vocabStore'
import type { VocabItem } from './types/vocab'
import { lookupWordForVocab } from './services/vocabLookup'
import type { ThemePreference } from './storage/themePreference'
import { useThemePreference } from './hooks/useThemePreference'
import { useSpeechVoices } from './hooks/useSpeechVoices'
import { useSpeechVoicePreference } from './hooks/useSpeechVoicePreference'
import { PREVIEW_SAMPLE, pronounceWord } from './services/pronounce'
import { groupVoicesByLang } from './services/speechVoices'
import { useAuth } from './hooks/useAuth'
import { useVocabulary } from './hooks/useVocabulary'
import { formatAuthError } from './firebase/auth'
import {
  getTranslateLanguageLabel,
  TRANSLATE_LANGUAGE_OPTIONS,
  type TranslateLanguage,
} from './storage/translationPreference'
import { useTranslateLanguagePreference } from './hooks/useTranslateLanguagePreference'

import { getFirebaseConfigIssue } from './firebase/config'

function sortWords(a: VocabItem, b: VocabItem): number {
  return a.word.localeCompare(b.word, undefined, {
    sensitivity: 'base',
  })
}

function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { items, setItems, removeItems, syncStatus, syncError } = useVocabulary(user)
  const [query, setQuery] = useState('')
  const [addingBusy, setAddingBusy] = useState(false)
  const [addPreview, setAddPreview] = useState<{
    id: string
    word: string
    translationZh: string
    ipa: string
    hints: string[]
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isPrefsOpen, setIsPrefsOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)

  const sortedItems = useMemo(() => [...items].sort(sortWords), [items])

  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference()
  const { voices, supported: speechSupported } = useSpeechVoices()
  const voiceGroups = useMemo(() => groupVoicesByLang(voices), [voices])
  const { voiceURI: speechVoiceURI, setVoiceURI: setSpeechVoiceURI } =
    useSpeechVoicePreference()
  const { language: translateLanguage, setLanguage: setTranslateLanguage } =
    useTranslateLanguagePreference()
  const translateLanguageLabel = useMemo(
    () => getTranslateLanguageLabel(translateLanguage),
    [translateLanguage],
  )

  const syncStatusLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
        ? 'Sync error'
        : syncStatus === 'offline'
          ? 'Offline'
          : user
            ? 'Synced'
            : null

  const firebaseConfigIssue = useMemo(() => getFirebaseConfigIssue(), [])

  const handleSignIn = async () => {
    setAuthBusy(true)
    setStatusMessage(null)
    try {
      await signInWithGoogle()
      setStatusMessage('Signed in. Vocabulary sync is enabled for this account.')
    } catch (error) {
      setStatusMessage(`Sign-in failed: ${formatAuthError(error)}`)
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSignOut = async () => {
    setAuthBusy(true)
    setStatusMessage(null)
    try {
      await signOut()
      setStatusMessage('Signed out. Your vocabulary stays on this device.')
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Sign-out failed: ${error.message}`
          : 'Sign-out failed.',
      )
    } finally {
      setAuthBusy(false)
    }
  }

  const handlePreviewWord = async (word: string) => {
    const lowered = word.toLowerCase()
    if (sortedItems.some((i) => i.word.toLowerCase() === lowered)) {
      throw new Error(`"${word}" is already in your list.`)
    }

    setAddingBusy(true)
    setStatusMessage(null)

    try {
      const { translationZh, ipa, hints } = await lookupWordForVocab(
        word,
        translateLanguage,
        translateLanguageLabel,
      )
      setAddPreview({
        id: crypto.randomUUID(),
        word,
        translationZh,
        ipa,
        hints,
      })
    } finally {
      setAddingBusy(false)
    }
  }

  const handleConfirmAddPreview = (translationZh: string, ipa: string) => {
    if (!addPreview) return

    const item = newVocabItem({
      word: addPreview.word,
      translationZh,
      ipa,
      phonics: ipa,
    })

    setItems((prev) => [...prev, item])
    setAddPreview(null)
    setStatusMessage(null)
  }

  const handleDiscardAddPreview = () => {
    setAddPreview(null)
  }

  const handleUpdate = (updated: VocabItem) => {
    const ipaTrim = updated.ipa.trim()
    setItems((prev) =>
      prev.map((i) =>
        i.id === updated.id
          ? {
              ...updated,
              ipa: ipaTrim,
              phonics: ipaTrim,
              updatedAt: Date.now(),
            }
          : i,
      ),
    )
    setStatusMessage(null)
  }

  const handleRemove = (ids: string[]) => {
    removeItems(ids)
    setStatusMessage(null)
  }

  const handleExport = () => {
    try {
      const contents = serializeVocabulary(items)
      const blob = new Blob([contents], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().slice(0, 10)
      a.download = `reviewenglish-vocab-${today}.json`
      a.click()

      URL.revokeObjectURL(url)
      setStatusMessage('Exported current vocabulary list to a file.')
    } catch {
      setStatusMessage('Failed to export vocabulary list.')
    }
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const importedItems = parseVocabularyImport(text)

        if (!importedItems.length) {
          setStatusMessage('No valid vocabulary items found in the selected file.')
          return
        }

        setItems((prev) => {
          const byId = new Map(prev.map((i) => [i.id, i]))
          const existingWords = new Set(
            prev.map((i) => i.word.toLowerCase()),
          )

          for (const item of importedItems) {
            if (byId.has(item.id)) continue
            const lowered = item.word.toLowerCase()
            if (existingWords.has(lowered)) continue
            byId.set(item.id, item)
            existingWords.add(lowered)
          }

          return Array.from(byId.values())
        })

        setStatusMessage(
          `Imported ${importedItems.length} item${importedItems.length === 1 ? '' : 's'} (merged into current list).`,
        )
      } catch {
        setStatusMessage(
          'Failed to import file. Is it a valid export from this app?',
        )
      } finally {
        input.value = ''
      }
    }

    input.click()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-text">
          <H1 style={{ marginTop: 0 }}>Vocabulary practice</H1>
          <p
            className={`${Classes.RUNNING_TEXT} ${Classes.TEXT_LARGE} ${Classes.TEXT_MUTED} lede`}
          >
            Build a word list locally. IPA from{' '}
            <a href="https://dictionaryapi.dev/" target="_blank" rel="noreferrer">
              Free Dictionary API
            </a>
            {' · '}
            {translateLanguageLabel} via MyMemory (daily limits). Speech uses the
            browser&apos;s voice.
          </p>
        </div>
        <div className="app-header-actions">
          <Button
            icon="cog"
            aria-label="Open preferences"
            title="Preferences"
            onClick={() => setIsPrefsOpen(true)}
            text="Preferences"
          />
        </div>
      </header>

      {statusMessage ? (
        <>
          <Callout
            className="vocab-margin-top"
            compact
            icon="warning-sign"
            intent={Intent.WARNING}
            title={statusMessage}
          />
          <Divider className="vocab-margin-top" />
        </>
      ) : null}

      <main className="app-main">
        <div className="app-top-row">
          <AddWordForm disabled={addingBusy} onSubmit={handlePreviewWord} />
        </div>
        <VocabularyList
          items={sortedItems}
          query={query}
          onQueryChange={setQuery}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          speechVoiceURI={speechVoiceURI}
          translationLanguageLabel={translateLanguageLabel}
        />
      </main>

      <footer className="app-footer vocab-margin-top">
        <Divider />
        <div
          className={`footer-note vocab-footer-inner ${Classes.RUNNING_TEXT} ${Classes.TEXT_SMALL} ${Classes.TEXT_MUTED}`}
        >
          <Tag minimal intent="primary" round className="vocab-footer-tag">
            local-first
          </Tag>
          Data stays in <code className={Classes.CODE}>localStorage</code>
          {user ? (
            <>
              {' '}
              and syncs to your Google account when signed in
            </>
          ) : (
            <>
              {' '}
              — sign in with Google in Preferences to sync across devices
            </>
          )}
          . UI:{' '}
          <a href="https://blueprintjs.com/">Blueprint&nbsp;6</a> + React.
        </div>
      </footer>

      <AddWordPreviewDialog
        key={addPreview?.id ?? 'closed'}
        isOpen={addPreview !== null}
        word={addPreview?.word ?? ''}
        translationZh={addPreview?.translationZh ?? ''}
        ipa={addPreview?.ipa ?? ''}
        hints={addPreview?.hints ?? []}
        translationLanguageLabel={translateLanguageLabel}
        onConfirm={handleConfirmAddPreview}
        onDiscard={handleDiscardAddPreview}
      />

      <Dialog
        className="preferences-dialog"
        isOpen={isPrefsOpen}
        onClose={() => setIsPrefsOpen(false)}
        title="Preferences"
        icon="cog"
      >
        <div className={Classes.DIALOG_BODY}>
          <H5 style={{ marginTop: 0 }}>Appearance</H5>
          <SegmentedControl
            intent={Intent.PRIMARY}
            options={[
              { value: 'light', icon: 'flash', label: 'Light' },
              { value: 'dark', icon: 'moon', label: 'Dark' },
              { value: 'system', icon: 'desktop', label: 'System' },
            ]}
            size="small"
            value={themePreference}
            onValueChange={(v) => setThemePreference(v as ThemePreference)}
          />

          <Divider className="prefs-divider" />

          <H5>Voice</H5>
          {!speechSupported ? (
            <Callout
              compact
              intent={Intent.WARNING}
              title="Speech not supported in this browser."
            />
          ) : null}
          {speechSupported && voices.length === 0 ? (
            <p className={`${Classes.RUNNING_TEXT} ${Classes.TEXT_MUTED}`}>
              Loading voices…
            </p>
          ) : null}
          <div className="prefs-voice-row">
            <HTMLSelect
              fill
              disabled={!speechSupported || voices.length === 0}
              value={speechVoiceURI}
              onChange={(e) => setSpeechVoiceURI(e.currentTarget.value)}
            >
              <option value="">Browser default</option>
              {voiceGroups.map((group) => (
                <optgroup key={group.lang} label={group.lang}>
                  {group.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </HTMLSelect>
            <Button
              icon="volume-up"
              text="Preview"
              disabled={!speechSupported}
              onClick={() =>
                pronounceWord(PREVIEW_SAMPLE, { voiceURI: speechVoiceURI })
              }
            />
          </div>

          <Divider className="prefs-divider" />

          <H5>Translate</H5>
          <div className="prefs-voice-row">
            <HTMLSelect
              fill
              value={translateLanguage}
              onChange={(e) =>
                setTranslateLanguage(e.currentTarget.value as TranslateLanguage)
              }
            >
              {TRANSLATE_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </HTMLSelect>
          </div>

          <Divider className="prefs-divider" />

          <H5>Account</H5>
          {firebaseConfigIssue ? (
            <Callout compact intent={Intent.WARNING} title={firebaseConfigIssue} />
          ) : null}
          {authLoading ? (
            <p className={`${Classes.RUNNING_TEXT} ${Classes.TEXT_MUTED}`}>
              Checking sign-in status…
            </p>
          ) : user ? (
            <div className="prefs-account-block">
              <p className={`${Classes.RUNNING_TEXT} prefs-account-email`}>
                Signed in as <strong>{user.email ?? user.uid}</strong>
              </p>
              {syncStatusLabel ? (
                <Tag
                  minimal
                  round
                  intent={
                    syncStatus === 'error'
                      ? Intent.DANGER
                      : syncStatus === 'syncing'
                        ? Intent.WARNING
                        : Intent.SUCCESS
                  }
                >
                  {syncStatusLabel}
                </Tag>
              ) : null}
              {syncError ? (
                <Callout compact intent={Intent.DANGER} title={syncError} />
              ) : null}
              <Button
                icon="log-out"
                text="Sign out"
                disabled={authBusy}
                onClick={handleSignOut}
              />
            </div>
          ) : (
            <div className="prefs-account-block">
              <p className={`${Classes.RUNNING_TEXT} ${Classes.TEXT_MUTED}`}>
                Optional: sign in with Google to sync your vocabulary across
                devices.
              </p>
              <Button
                icon="log-in"
                intent={Intent.PRIMARY}
                text="Sign in with Google"
                disabled={authBusy}
                onClick={handleSignIn}
              />
            </div>
          )}

          <Divider className="prefs-divider" />

          <H5>Data</H5>
          <div className="prefs-data-row">
            <Button
              icon="download"
              onClick={handleExport}
              text="Export"
            />
            <Button
              icon="upload"
              onClick={handleImportClick}
              text="Import"
            />
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsPrefsOpen(false)} text="Close" />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default App
