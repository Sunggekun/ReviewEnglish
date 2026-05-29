import { useCallback, useMemo, useState } from 'react'
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
  InputGroup,
  NonIdealState,
  Dialog,
  Spinner,
  Tag,
} from '@blueprintjs/core'
import {
  Cell,
  Column,
  ColumnHeaderCell,
  SelectionModes,
  Table,
} from '@blueprintjs/table'
import type { VocabItem } from '../types/vocab'
import { pronounceWord } from '../services/pronounce'
import type { DictionaryMeaning } from '../services/dictionary'
import { useElementWidth, useMediaQuery } from '../hooks/useElementWidth'
import { vocabColumnWidths } from './vocabColumnWidths'
import {
  buildGroupedDisplayRows,
  collectFirstCharCategories,
  getWordFirstCharCategory,
  groupVocabByFirstChar,
  type VocabDisplayRow,
} from './vocabGroupByFirstChar'

export type VocabularyListProps = {
  items: VocabItem[]
  query: string
  onQueryChange: (value: string) => void
  onUpdate: (item: VocabItem) => void
  onRemove: (ids: string[]) => void
  speechVoiceURI?: string
  translationLanguageLabel?: string
}

const emDash = '—'
const TABLE_HEIGHT_PX = 560
const DEFAULT_ROW_HEIGHT = 52
const SECTION_HEADER_ROW_HEIGHT = 36

export function VocabularyList({
  items,
  query,
  onQueryChange,
  onUpdate,
  onRemove,
  speechVoiceURI = '',
  translationLanguageLabel = 'Translation',
}: VocabularyListProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.translationZh.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q),
    )
  }, [items, query])

  const availableCategories = useMemo(
    () => collectFirstCharCategories(searchFiltered),
    [searchFiltered],
  )

  const filtered = useMemo(() => {
    if (!categoryFilter) return searchFiltered
    return searchFiltered.filter(
      (item) => getWordFirstCharCategory(item.word) === categoryFilter,
    )
  }, [categoryFilter, searchFiltered])

  const displayRows = useMemo(
    () => buildGroupedDisplayRows(groupVocabByFirstChar(filtered)),
    [filtered],
  )

  const displayItems = useMemo(
    () =>
      displayRows.flatMap((row) => (row.kind === 'item' ? [row.item] : [])),
    [displayRows],
  )

  const getRow = useCallback(
    (rowIndex: number): VocabDisplayRow | undefined => displayRows[rowIndex],
    [displayRows],
  )

  const getItemAtRow = useCallback(
    (rowIndex: number): VocabItem | undefined => {
      const row = getRow(rowIndex)
      return row?.kind === 'item' ? row.item : undefined
    },
    [getRow],
  )

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
  const isMobile = useMediaQuery('(max-width: 640px)')
  const hasTable = displayRows.length > 0
  const [tableWrapRef, tableWidth] = useElementWidth<HTMLDivElement>(hasTable)
  const minColumnWidth = isMobile ? 32 : 50

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
    displayItems.length > 0 &&
    displayItems.every((item) => selectedIds.has(item.id))
  const someFilteredSelected =
    displayItems.some((item) => selectedIds.has(item.id)) && !allFilteredSelected

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const item of displayItems) next.delete(item.id)
        return next
      })
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of displayItems) next.add(item.id)
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

  const cellRendererDependencies = useMemo(
    () => [
      editingId,
      draftWord,
      draftZh,
      draftIpa,
      selectMode,
      selectedIds,
      displayRows,
      speechVoiceURI,
      translationLanguageLabel,
    ],
    [
      editingId,
      draftWord,
      draftZh,
      draftIpa,
      selectMode,
      selectedIds,
      displayRows,
      speechVoiceURI,
      translationLanguageLabel,
    ],
  )

  const rowHeights = useMemo(
    () =>
      displayRows.map((row) =>
        row.kind === 'header' ? SECTION_HEADER_ROW_HEIGHT : DEFAULT_ROW_HEIGHT,
      ),
    [displayRows],
  )

  const isSectionHeaderRow = useCallback(
    (rowIndex: number) => getRow(rowIndex)?.kind === 'header',
    [getRow],
  )

  const rowCellClass = useCallback(
    (item: VocabItem) =>
      selectMode && selectedIds.has(item.id) ? 'vocab-bp-cell-selected' : undefined,
    [selectMode, selectedIds],
  )

  const renderSelectHeader = useCallback(
    () => (
      <ColumnHeaderCell name="">
        <Checkbox
          aria-label="Select all visible words"
          checked={allFilteredSelected}
          indeterminate={someFilteredSelected}
          onChange={toggleSelectAllFiltered}
        />
      </ColumnHeaderCell>
    ),
    [allFilteredSelected, someFilteredSelected, toggleSelectAllFiltered],
  )

  const renderSelectCell = useCallback(
    (rowIndex: number) => {
      if (isSectionHeaderRow(rowIndex)) {
        return <Cell className="vocab-bp-cell-section-header" />
      }
      const item = getItemAtRow(rowIndex)
      if (!item) return <Cell />
      return (
        <Cell interactive className={rowCellClass(item)}>
          <Checkbox
            aria-label={`Select ${item.word}`}
            checked={selectedIds.has(item.id)}
            onChange={() => toggleSelected(item.id)}
          />
        </Cell>
      )
    },
    [getItemAtRow, isSectionHeaderRow, rowCellClass, selectedIds, toggleSelected],
  )

  const renderSectionHeaderCell = useCallback(
    (rowIndex: number) => {
      const row = getRow(rowIndex)
      if (row?.kind !== 'header') return null
      return (
        <Cell
          className="vocab-bp-cell-section-header"
          wrapText={false}
          truncated={false}
        />
      )
    },
    [getRow],
  )

  const renderSectionHeaderWordCell = useCallback(
    (rowIndex: number) => {
      const row = getRow(rowIndex)
      if (row?.kind !== 'header') return null
      return (
        <Cell
          className="vocab-bp-cell-section-header"
          wrapText={false}
          truncated={false}
        >
          <Tag minimal intent="primary" large>
            {row.letter}
          </Tag>
        </Cell>
      )
    },
    [getRow],
  )

  const renderWordCell = useCallback(
    (rowIndex: number) => {
      const sectionCell = renderSectionHeaderWordCell(rowIndex)
      if (sectionCell) return sectionCell

      const item = getItemAtRow(rowIndex)
      if (!item) return <Cell />

      return (
        <Cell interactive wrapText className={rowCellClass(item)}>
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
        </Cell>
      )
    },
    [
      draftWord,
      editingId,
      getItemAtRow,
      handlePronounce,
      openMeaningsDialog,
      renderSectionHeaderWordCell,
      rowCellClass,
      saveEdit,
      selectMode,
      startEdit,
    ],
  )

  const renderTranslationCell = useCallback(
    (rowIndex: number) => {
      const sectionCell = renderSectionHeaderCell(rowIndex)
      if (sectionCell) return sectionCell

      const item = getItemAtRow(rowIndex)
      if (!item) return <Cell />

      return (
        <Cell interactive wrapText className={rowCellClass(item)}>
          {editingId === item.id ? (
            <InputGroup
              className="vocab-cell-input"
              fill
              aria-label={`${translationLanguageLabel} for ${item.word}`}
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
              aria-label={`Edit ${translationLanguageLabel} for ${item.word}`}
              title="Click to edit"
            >
              {item.translationZh || emDash}
            </span>
          )}
        </Cell>
      )
    },
    [
      draftZh,
      editingId,
      getItemAtRow,
      renderSectionHeaderCell,
      rowCellClass,
      saveEdit,
      selectMode,
      startEdit,
      translationLanguageLabel,
    ],
  )

  const renderIpaCell = useCallback(
    (rowIndex: number) => {
      const sectionCell = renderSectionHeaderCell(rowIndex)
      if (sectionCell) return sectionCell

      const item = getItemAtRow(rowIndex)
      if (!item) return <Cell />

      return (
        <Cell
          interactive
          wrapText
          className={rowCellClass(item)}
          style={{ fontFamily: 'Georgia, serif' }}
        >
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
        </Cell>
      )
    },
    [draftIpa, editingId, getItemAtRow, renderSectionHeaderCell, rowCellClass, saveEdit, selectMode, startEdit],
  )

  const columnWidths = useMemo(
    () =>
      vocabColumnWidths(tableWidth, selectMode, {
        minColWidth: minColumnWidth,
        mobile: isMobile,
      }),
    [tableWidth, selectMode, minColumnWidth, isMobile],
  )

  const tableColumns = useMemo(() => {
    const columns = []
    if (selectMode) {
      columns.push(
        <Column
          key="select"
          id="select"
          name=""
          cellRenderer={renderSelectCell}
          columnHeaderCellRenderer={renderSelectHeader}
        />,
      )
    }
    columns.push(
      <Column key="word" id="word" name="Word" cellRenderer={renderWordCell} />,
      <Column
        key="translation"
        id="translation"
        name={translationLanguageLabel}
        cellRenderer={renderTranslationCell}
      />,
      <Column
        key="ipa"
        id="ipa"
        name="Phonics (IPA)"
        cellRenderer={renderIpaCell}
      />,
    )
    return columns
  }, [
    renderIpaCell,
    renderSelectCell,
    renderSelectHeader,
    renderTranslationCell,
    renderWordCell,
    selectMode,
    translationLanguageLabel,
  ])

  return (
    <section className="vocab-list-section">
      <Card elevation={Elevation.TWO} className="vocab-panel">
        <FormGroup fill label="Search" labelFor="search-vocab">
          <ControlGroup fill vertical={false}>
            <InputGroup
              fill
              id="search-vocab"
              leftIcon="search"
              placeholder={`Filter by word, ${translationLanguageLabel}, or IPA…`}
              value={query}
              type="search"
              autoComplete="off"
              onChange={(evt) => onQueryChange(evt.target.value)}
            />
            <Tag minimal intent="primary">
              {displayItems.length}/{items.length}
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

        {availableCategories.length > 0 ? (
          <div
            className="vocab-category-bar"
            role="toolbar"
            aria-label="Filter by first letter"
          >
            <Button
              small
              minimal
              active={categoryFilter === null}
              aria-pressed={categoryFilter === null}
              onClick={() => setCategoryFilter(null)}
            >
              All
            </Button>
            {availableCategories.map((letter) => (
              <Button
                key={letter}
                small
                minimal
                active={categoryFilter === letter}
                aria-pressed={categoryFilter === letter}
                aria-label={`Show words starting with ${letter}`}
                onClick={() =>
                  setCategoryFilter((prev) => (prev === letter ? null : letter))
                }
              >
                {letter}
              </Button>
            ))}
          </div>
        ) : null}

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

        {displayItems.length === 0 ? (
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
                : categoryFilter
                  ? `No words start with “${categoryFilter}”.`
                  : 'Try a different keyword or clear the filter.'
            }
          />
        ) : (
          <div
            ref={tableWrapRef}
            className="vocab-bp-table-wrap vocab-margin-top"
            style={{ height: TABLE_HEIGHT_PX }}
          >
            <Table
              numRows={displayRows.length}
              rowHeights={rowHeights}
              enableRowHeader={false}
              enableColumnResizing={!isMobile}
              enableRowResizing={false}
              defaultRowHeight={DEFAULT_ROW_HEIGHT}
              minColumnWidth={minColumnWidth}
              columnWidths={columnWidths}
              selectionModes={SelectionModes.NONE}
              cellRendererDependencies={cellRendererDependencies}
              className={
                isMobile
                  ? 'vocab-bp-table vocab-bp-table--mobile'
                  : 'vocab-bp-table'
              }
            >
              {tableColumns}
            </Table>
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
