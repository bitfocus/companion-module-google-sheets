import type { CompanionFeedbackSchema, CompanionFeedbackDefinitions } from '@companion-module/base'
import type GoogleSheetsInstance from './index.js'
import { options } from './utils.js'

export type FeedbacksSchema = {
  cellValue: CompanionFeedbackSchema<{
    spreadsheet: string
    cell: string
    comparison: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'
    value: string
  }>
}

export function getFeedbacks(instance: GoogleSheetsInstance): CompanionFeedbackDefinitions<FeedbacksSchema> {
  return {
    cellValue: {
      type: 'boolean',
      name: 'Cell Value',
      description: '',
      options: [
        options.selectSpreadsheet(instance),
        options.selectCell,
        {
          type: 'dropdown',
          label: 'Comparison',
          id: 'comparison',
          default: 'eq',
          choices: [
            { id: 'eq', label: '=' },
            { id: 'ne', label: '!=' },
            { id: 'lt', label: '<' },
            { id: 'lte', label: '<=' },
            { id: 'gt', label: '>' },
            { id: 'gte', label: '>=' },
          ],
        },
        {
          type: 'textinput',
          label: 'Value',
          id: 'value',
          default: '',
          useVariables: true,
        },
      ],
      defaultStyle: {
        bgcolor: 0xff0000,
      },
      callback: async (feedback) => {
        const cell = feedback.options.cell
        const value = feedback.options.value

        let spreadsheetID = feedback.options.spreadsheet

        if (instance.config.referenceIndex) {
          const idIndex = parseInt(feedback.options.spreadsheet)
          if (isNaN(idIndex)) return false
          spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]
          if (spreadsheetID === undefined) return false
        }

        const cellValue = await instance.api.parseCellValue(spreadsheetID, cell)

        if (cellValue === null) return false

        if (feedback.options.comparison === 'eq') {
          return cellValue == value
        } else if (feedback.options.comparison === 'ne') {
          return cellValue != value
        } else if (feedback.options.comparison === 'lt') {
          return cellValue < value
        } else if (feedback.options.comparison === 'lte') {
          return cellValue <= value
        } else if (feedback.options.comparison === 'gt') {
          return cellValue > value
        } else if (feedback.options.comparison === 'gte') {
          return cellValue >= value
        }

        return false
      },
    },
  }
}
