import GoogleSheetsInstance from './index'
import {
  combineRgb,
  CompanionAdvancedFeedbackResult,
  CompanionFeedbackButtonStyleResult,
  CompanionFeedbackAdvancedEvent,
  CompanionFeedbackBooleanEvent,
  SomeCompanionFeedbackInputField,
  CompanionFeedbackContext,
} from '@companion-module/base'

export interface GoogleSheetsFeedbacks {
  cellValue: GoogleSheetsFeedback<CellValueCallback>

  // Index signature
  [key: string]: GoogleSheetsFeedback<any>
}

interface CellValueCallback {
  feedbackId: 'cellValue'
  options: Readonly<{
    spreadsheet: string
    cell: string
    comparison: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'
    value: string
  }>
}

// Callback type for Presets
export type FeedbackCallbacks = CellValueCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionFeedbackInputField, 'default'> & {
  default: string | number | boolean | null
}

// GoogleSheets Boolean and Advanced feedback types
interface GoogleSheetsFeedbackBoolean<T> {
  type: 'boolean'
  name: string
  description: string
  style: Partial<CompanionFeedbackButtonStyleResult>
  options: InputFieldWithDefault[]
  callback: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>, context: CompanionFeedbackContext) => boolean | Promise<boolean>
  subscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
  unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
}

interface GoogleSheetsFeedbackAdvanced<T> {
  type: 'advanced'
  name: string
  description: string
  options: InputFieldWithDefault[]
  callback: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>, context: CompanionFeedbackContext) => CompanionAdvancedFeedbackResult
  subscribe?: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>) => CompanionAdvancedFeedbackResult
  unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>) => CompanionAdvancedFeedbackResult
}

export type GoogleSheetsFeedback<T> = GoogleSheetsFeedbackBoolean<T> | GoogleSheetsFeedbackAdvanced<T>

export function getFeedbacks(instance: GoogleSheetsInstance): GoogleSheetsFeedbacks {
  return {
    cellValue: {
      type: 'boolean',
      name: 'Cell Value',
      description: '',
      options: [
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          id: 'spreadsheet',
          default: '',
          choices: [
            { label: 'Select Spreadsheet', id: '' },
            ...instance.config.sheetIDs
              .split(' ')
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
        },
        {
          type: 'textinput',
          label: 'Cell (Sheet!A1)',
          id: 'cell',
          default: '',
          useVariables: true,
        },
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
      style: {
        bgcolor: combineRgb(255, 0, 0),
      },
      callback: async (feedback, context) => {
        const cell = await context.parseVariablesInString(feedback.options.cell)
        const value = await context.parseVariablesInString(feedback.options.value)

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
