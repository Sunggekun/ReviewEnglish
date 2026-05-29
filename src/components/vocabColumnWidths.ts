const SELECT_COL_WIDTH = 44

/** Word / translation / IPA share of the remaining table width. */
const COL_FRACTIONS = {
  word: 0.4,
  translation: 0.35,
  ipa: 0.25,
} as const

const MOBILE_COL_FRACTIONS = {
  word: 0.38,
  translation: 0.32,
  ipa: 0.3,
} as const

/** Approximate table width before the wrapper is measured (card + root padding). */
export function estimateTableWidth(): number {
  if (typeof window === 'undefined') return 320

  const root = document.getElementById('root')
  const rootPadding = root
    ? parseFloat(getComputedStyle(root).paddingLeft) +
      parseFloat(getComputedStyle(root).paddingRight)
    : 48

  return Math.max(200, Math.floor(window.innerWidth - rootPadding - 32))
}

function splitWidth(total: number, fractions: readonly number[]): number[] {
  if (total <= 0) return fractions.map(() => 0)

  const floored = fractions.map((f) => Math.floor(total * f))
  const used = floored.reduce((sum, w) => sum + w, 0)
  floored[floored.length - 1] += total - used
  return floored
}

function clampWidthsToContainer(
  widths: number[],
  containerWidth: number,
  minColWidth: number,
): number[] {
  const next = [...widths]
  let total = next.reduce((sum, w) => sum + w, 0)

  if (total <= containerWidth) return next

  const shrinkable = next.map((w) => Math.max(minColWidth, w))
  total = shrinkable.reduce((sum, w) => sum + w, 0)
  if (total <= containerWidth) return shrinkable

  const scale = containerWidth / total
  const scaled = shrinkable.map((w) => Math.max(1, Math.floor(w * scale)))
  const scaledTotal = scaled.reduce((sum, w) => sum + w, 0)
  scaled[scaled.length - 1] += containerWidth - scaledTotal
  return scaled
}

export function vocabColumnWidths(
  containerWidth: number,
  selectMode: boolean,
  options: { minColWidth?: number; mobile?: boolean } = {},
): number[] {
  const minColWidth = options.minColWidth ?? 50
  const fractions = options.mobile ? MOBILE_COL_FRACTIONS : COL_FRACTIONS
  const width =
    containerWidth > 0 ? containerWidth : estimateTableWidth()

  let widths: number[]
  if (selectMode) {
    const selectW = Math.min(SELECT_COL_WIDTH, width)
    const remaining = Math.max(0, width - selectW)
    widths = [selectW, ...splitWidth(remaining, [
      fractions.word,
      fractions.translation,
      fractions.ipa,
    ])]
  } else {
    widths = splitWidth(width, [
      fractions.word,
      fractions.translation,
      fractions.ipa,
    ])
  }

  widths = widths.map((w, index) => {
    if (selectMode && index === 0) return Math.min(SELECT_COL_WIDTH, w)
    return Math.max(minColWidth, w)
  })

  return clampWidthsToContainer(widths, width, minColWidth)
}
