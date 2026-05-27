import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  Classes,
  Divider,
  Elevation,
  H1,
  H5,
  HTMLSelect,
  Intent,
  SegmentedControl,
  Tag,
} from '@blueprintjs/core'
import { AddWordForm } from './components/AddWordForm'
import { VocabularyList } from './components/VocabularyList'
import {
  loadVocabulary,
  newVocabItem,
  parseVocabularyImport,
  saveVocabulary,
  serializeVocabulary,
} from './storage/vocabStore'
import type { VocabItem } from './types/vocab'
import { lookupEnglishWord } from './services/dictionary'
import { translateEnglishToZh } from './services/translation'
import type { ThemePreference } from './storage/themePreference'
import { useThemePreference } from './hooks/useThemePreference'

import './index.css'

function sortWords(a: VocabItem, b: VocabItem): number {
  return a.word.localeCompare(b.word, undefined, {
    sensitivity: 'base',
  })
}

function App() {
  const [items, setItems] = useState<VocabItem[]>(() => loadVocabulary())
  const [query, setQuery] = useState('')
  const [speechLang, setSpeechLang] = useState<'en-US' | 'en-GB'>('en-US')
  const [addingBusy, setAddingBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const sortedItems = useMemo(() => [...items].sort(sortWords), [items])

  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference()

  useEffect(() => {
    saveVocabulary(items)
  }, [items])

  const handleAddWord = async (word: string) => {
    const lowered = word.toLowerCase()
    if (sortedItems.some((i) => i.word.toLowerCase() === lowered)) {
      throw new Error(`"${word}" is already in your list.`)
    }

    setAddingBusy(true)
    setStatusMessage(null)

    try {
      const [dictOutcome, zhOutcome] = await Promise.allSettled([
        lookupEnglishWord(word),
        translateEnglishToZh(word),
      ])

      let ipa = ''
      if (dictOutcome.status === 'fulfilled')
        ipa = dictOutcome.value.ipa.trim()

      let translationZh = ''
      if (zhOutcome.status === 'fulfilled')
        translationZh = zhOutcome.value.trim()

      const item = newVocabItem({
        word,
        translationZh,
        ipa,
        phonics: ipa,
      })

      setItems((prev) => [...prev, item])

      const hints: string[] = []
      if (dictOutcome.status === 'rejected')
        hints.push(
          `Could not look up IPA (${dictOutcome.reason instanceof Error ? dictOutcome.reason.message : String(dictOutcome.reason)}). You can edit it.`,
        )
      else if (!ipa)
        hints.push(
          'No IPA returned for this word. You can edit phonics/IPA manually.',
        )

      if (zhOutcome.status === 'rejected')
        hints.push(
          `Could not translate automatically (${zhOutcome.reason instanceof Error ? zhOutcome.reason.message : String(zhOutcome.reason)}). Edit Chinese manually.`,
        )
      else if (!translationZh)
        hints.push(
          'Chinese translation missing. Paste or type it manually in Edit.',
        )

      setStatusMessage(hints.length ? hints.join(' ') : null)
    } finally {
      setAddingBusy(false)
    }
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
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setItems((prev) => prev.filter((i) => !idSet.has(i.id)))
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
        <div>
          <H1 style={{ marginTop: 0 }}>Vocabulary practice</H1>
          <p
            className={`${Classes.RUNNING_TEXT} ${Classes.TEXT_LARGE} ${Classes.TEXT_MUTED} lede`}
          >
            Build a word list locally. IPA from{' '}
            <a href="https://dictionaryapi.dev/" target="_blank" rel="noreferrer">
              Free Dictionary API
            </a>
            {' · '}
            Chinese (Traditional, zh-TW) via MyMemory (daily limits). Speech uses
            the browser&apos;s voice.
          </p>
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
          <AddWordForm disabled={addingBusy} onSubmit={handleAddWord} />
          <Card elevation={Elevation.ONE} className="preferences-card">
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

            <H5>Accent</H5>
            <HTMLSelect
              fill
              value={speechLang}
              onChange={(e) =>
                setSpeechLang(
                  e.currentTarget.value === 'en-GB' ? 'en-GB' : 'en-US',
                )
              }
              options={[
                { label: 'American (en-US)', value: 'en-US' },
                { label: 'British (en-GB)', value: 'en-GB' },
              ]}
            />

            <Divider className="prefs-divider" />

            <H5>Data</H5>
            <div className="prefs-data-row">
              <Button
                small
                icon="download"
                onClick={handleExport}
                text="Export"
              />
              <Button
                small
                icon="upload"
                onClick={handleImportClick}
                style={{ marginLeft: 8 }}
                text="Import"
              />
            </div>
          </Card>
        </div>
        <VocabularyList
          items={sortedItems}
          query={query}
          onQueryChange={setQuery}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          speechLang={speechLang}
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
          Data stays in <code className={Classes.CODE}>localStorage</code> — clear site
          data to reset. UI:{' '}
          <a href="https://blueprintjs.com/">Blueprint&nbsp;6</a> + React.
        </div>
      </footer>
    </div>
  )
}

export default App
