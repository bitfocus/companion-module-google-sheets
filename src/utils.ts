/**
 * @param index col index
 * @returns col letter
 * @description Used to translate the index of a column to its letter
 */
export const columnIndexToLetter = (index: number): string | undefined => {
  index += 1
  let s = ''
  let t

  while (index > 0) {
    t = (index - 1) % 26
    s = String.fromCharCode(65 + t) + s
    index = ((index - t) / 26) | 0
  }
  return s || undefined
}

/**
 * @param column col letter
 * @returns col index
 * @description Translates a column letter to its index
 */
export const colToIndex = (col: string): number | null => {
  if (typeof col !== 'string' || col.length > 2) return null

  const A = 'A'.charCodeAt(0)
  let number = col.charCodeAt(col.length - 1) - A

  if (col.length == 2) number += 26 * (col.charCodeAt(0) - A + 1)

  return number
}

/**
 * @param cell A1 notation
 * @returns row and col index
 * @description Parses a cell in A1 notation to a row and col index
 */
export const cellToIndex = (cell: string): { col: number; row: number } | null => {
  const rowToIndex = (row: string): number => {
    return parseInt(row, 10) - 1
  }

  const match = cell.toUpperCase().match(/(^[A-Z]+)|([0-9]+$)/gm)

  if (match === null || match.length != 2) return null

  const col = colToIndex(match[0])
  const row = rowToIndex(match[1])

  if (col === null || row === null) return null

  return { row, col }
}
