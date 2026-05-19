import type { CompanionInputFieldDropdown, CompanionInputFieldTextInput } from '@companion-module/base'
import type GoogleSheetsInstance from './index.js'
import type { Config } from './config.js'
import type { ActionsSchema } from './actions.js'
import type { FeedbacksSchema } from './feedback.js'
import type { VariablesSchema } from './variables.js'

export interface InstanceTypes {
  config: Config
  secrets: undefined
  actions: ActionsSchema
  feedbacks: FeedbacksSchema
  variables: VariablesSchema
}

export type Options = {
  selectCell: CompanionInputFieldTextInput<'cell'>
  selectSpreadsheet: (instance: GoogleSheetsInstance) => CompanionInputFieldDropdown<'spreadsheet'>
}

export const options: Options = {
  selectCell: {
    type: 'textinput',
    label: 'Cell',
    description: 'Sheet!A1 Notation',
    id: 'cell',
    default: '',
    useVariables: true,
  },
  selectSpreadsheet: (instance: GoogleSheetsInstance) => ({
    type: 'dropdown',
    label: 'Spreadsheet',
    description: 'Spreadsheet to adjust',
    id: 'spreadsheet',
    default: '',
    choices: [
      { label: 'Select Spreadsheet', id: '' },
      ...instance.config.sheetIDs
        .split(' ')
        .filter((id) => {
          const spreadsheet = instance.data.sheetData.get(id)
          return spreadsheet?.properties?.title !== undefined
        })
        .map((id, index) => {
          const spreadsheet = instance.data.sheetData.get(id)
          if (!spreadsheet) return { label: '', id: '' }
          return {
            label: spreadsheet.properties.title,
            id: instance.config.referenceIndex ? index.toString() : id,
          }
        })
        .filter((x) => x.id !== ''),
    ],
    expressionDescription: `Valid Values: ${instance.config.referenceIndex ? 'Spreadsheet Index' : 'Spreadsheet IDs'}`,
  }),
}

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
