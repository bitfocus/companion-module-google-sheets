import { CompanionActionEvent, CompanionActionContext, SomeCompanionActionInputField } from '@companion-module/base'
import GoogleSheetsInstance from './index'
import { colToIndex } from './utils'

export interface GoogleSheetsActions {
  addSheet: GoogleSheetsAction<AddSheetCallback>
  adjustCell: GoogleSheetsAction<AdjustCellCallback>
	clearSheet: GoogleSheetsAction<ClearSheetCallback>
  deleteRowColumn: GoogleSheetsAction<DeleteRowColumnCallback>
  duplicateSheet: GoogleSheetsAction<DuplicateSheetCallback>

  // Index signature
  [key: string]: GoogleSheetsAction<any>
}

interface AddSheetCallback {
  actionId: 'addSheet'
  options: Readonly<{
    spreadsheet: string
    name: string
  }>
}

interface AdjustCellCallback {
  actionId: 'adjustCell'
  options: Readonly<{
    type: 'Set' | 'Increase' | 'Decrease'
    spreadsheet: string
    cell: string
    value: string
  }>
}

interface ClearSheetCallback {
	actionId: 'clearSheet'
	options: Readonly<{
		spreadsheet: string
		sheet: string
	}>
}

interface DeleteRowColumnCallback {
  actionId: 'deleteRowColumn'
  options: Readonly<{
    spreadsheet: string
    sheet: string
    type: 'ROWS' | 'COLUMNS'
    rowStart: string
    rowStop: string
    columnStart: string
    columnStop: string
  }>
}

interface DuplicateSheetCallback {
  actionId: 'duplicateSheet'
  options: Readonly<{
    spreadsheet: string
    duplicateName: string
    newName: string
  }>
}

export type ActionCallbacks = AddSheetCallback | AdjustCellCallback | DeleteRowColumnCallback | DuplicateSheetCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionActionInputField, 'default'> & {
  default: string | number | boolean | null
}

// Actions specific to GoogleSheets
export interface GoogleSheetsAction<T> {
  name: string
  description?: string
  options: InputFieldWithDefault[]
  callback: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>, context: CompanionActionContext) => void | Promise<void>
  subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
  unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: GoogleSheetsInstance): GoogleSheetsActions {
  return {
    addSheet: {
      name: 'Add Sheet',
      options: [
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          tooltip: 'Spreadsheet to adjust',
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
        },
        {
          type: 'textinput',
          label: 'Name',
          tooltip: 'Name for the new Sheet',
          id: 'name',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const name = await context.parseVariablesInString(action.options.name)
        const idIndex = parseInt(action.options.spreadsheet)
        if (instance.config.referenceIndex && isNaN(idIndex)) return

        const spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]

        instance.api.addSheet(spreadsheetID, name)
      },
    },

    adjustCell: {
      name: 'Adjust Cell',
      options: [
        {
          type: 'dropdown',
          label: 'Type',
          tooltip: 'Type of cell adjustment',
          id: 'type',
          default: 'Set',
          choices: [
            { label: 'Set', id: 'Set' },
            { label: 'Increase', id: 'Increase' },
            { label: 'Decrease', id: 'Decrease' },
          ],
        },
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          tooltip: 'Spreadsheet to adjust',
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
          label: 'Cell',
          tooltip: 'Sheet!A1 Notation',
          id: 'cell',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Value',
          tooltip: 'Value to set/increase/decrease',
          id: 'value',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const cell = await context.parseVariablesInString(action.options.cell)
        if (!cell || !cell.includes('!') || action.options.spreadsheet === '') return
        let newValue: string | number = await context.parseVariablesInString(action.options.value)

        let spreadsheetID = action.options.spreadsheet
        if (instance.config.referenceIndex) {
          const idIndex = parseInt(action.options.spreadsheet)
          if (isNaN(idIndex)) return
          spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]
          if (spreadsheetID === undefined) return
        }

        if (action.options.type === 'Set') {
          instance.log('debug', `Setting Sheet: ${spreadsheetID} Cell: ${cell} Value: ${newValue}`)
          instance.api.adjustCell(spreadsheetID, cell, newValue)
        } else {
          newValue = parseFloat(newValue)

          if (isNaN(newValue)) {
            instance.log('warn', `Unable to adjust cell: ${newValue} is not a number`)
            return
          }

          const cellValue = await instance.api.parseCellValue(spreadsheetID, cell)
          if (cellValue === null) return

          if (action.options.type === 'Increase') {
            newValue = parseFloat(cellValue) + newValue
          } else if (action.options.type === 'Decrease') {
            newValue = parseFloat(cellValue) - newValue
          }

          instance.log('debug', `Adjusting Sheet: ${action.options.spreadsheet} Cell: ${cell} Value: ${newValue}`)
          instance.api.adjustCell(spreadsheetID, cell, newValue.toString())
        }
      },
    },

    clearSheet: {
      name: 'Clear Sheet',
      options: [
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          tooltip: 'Spreadsheet to adjust',
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
        },
        {
          type: 'textinput',
          label: 'Sheet to clear',
          id: 'sheet',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        let spreadsheetID = action.options.spreadsheet
        if (instance.config.referenceIndex) {
          const idIndex = parseInt(action.options.spreadsheet)
          if (isNaN(idIndex)) return
          spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]
          if (spreadsheetID === undefined) return
        }

        const sheetName = await context.parseVariablesInString(action.options.sheet)
        let sheetId

        const sheetData = instance.data.sheetData.get(spreadsheetID)
        sheetData.sheets.forEach((sheet: any) => {
          if (sheet?.properties?.title === sheetName) sheetId = sheet?.properties?.sheetId
        })

        if (sheetId === undefined) {
          instance.log('warn', 'Invalid sheet name')
          return
        }

				instance.api.clearSheet(spreadsheetID, sheetId)
      },
    },

    deleteRowColumn: {
      name: 'Delete Rows or Columns',
      options: [
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          tooltip: 'Spreadsheet to adjust',
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
          label: 'Sheet Name',
          id: 'sheet',
          default: '',
          useVariables: true,
        },
        {
          type: 'dropdown',
          label: 'Type',
          tooltip: 'Type to delete',
          id: 'type',
          default: 'ROWS',
          choices: [
            { label: 'Rows', id: 'ROWS' },
            { label: 'Columns', id: 'COLUMNS' },
          ],
        },
        {
          type: 'textinput',
          label: 'Row Start',
          tooltip: 'Starting Row Number',
          id: 'rowStart',
          default: '',
          useVariables: true,
          isVisible: (options) => options.type === 'ROWS',
        },
        {
          type: 'textinput',
          label: 'Row Stop (non-inclusive)',
          tooltip: 'Stop Row Number',
          id: 'rowStop',
          default: '',
          useVariables: true,
          isVisible: (options) => options.type === 'ROWS',
        },
        {
          type: 'textinput',
          label: 'Column Start',
          tooltip: 'Starting Column Letter or Number',
          id: 'columnStart',
          default: '',
          useVariables: true,
          isVisible: (options) => options.type === 'COLUMNS',
        },
        {
          type: 'textinput',
          label: 'Column Stop (non-inclusive)',
          tooltip: 'Stop Column Letter or Number',
          id: 'columnStop',
          default: '',
          useVariables: true,
          isVisible: (options) => options.type === 'COLUMNS',
        },
      ],
      callback: async (action, context) => {
        let spreadsheetID = action.options.spreadsheet
        if (instance.config.referenceIndex) {
          const idIndex = parseInt(action.options.spreadsheet)
          if (isNaN(idIndex)) return
          spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]
          if (spreadsheetID === undefined) return
        }

        const sheetName = await context.parseVariablesInString(action.options.sheet)
        let sheetId

        const sheetData = instance.data.sheetData.get(spreadsheetID)
        sheetData.sheets.forEach((sheet: any) => {
          if (sheet?.properties?.title === sheetName) sheetId = sheet?.properties?.sheetId
        })

        if (sheetId === undefined) {
          instance.log('warn', 'Invalid sheet name')
          return
        }

        if (action.options.type === 'ROWS') {
          let start = parseInt(await context.parseVariablesInString(action.options.rowStart))
          let stop = parseInt(await context.parseVariablesInString(action.options.rowStop))

          instance.api.deleteRowColumn(spreadsheetID, sheetId, action.options.type, start - 1, stop - 1)
        } else {
          let start: string | number | null = await context.parseVariablesInString(action.options.columnStart)
          let stop: string | number | null = await context.parseVariablesInString(action.options.columnStop)

          if (isNaN(parseInt(start))) {
            start = colToIndex(start)
          } else {
            start = parseInt(start) - 1
          }

          if (isNaN(parseInt(stop))) {
            stop = colToIndex(stop)
          } else {
            stop = parseInt(stop) - 1
          }

          if (start !== null && stop !== null && start < stop) {
            instance.api.deleteRowColumn(spreadsheetID, sheetId, action.options.type, start, stop)
          } else {
            instance.log('warn', 'Invalid start and stop indexes')
          }
        }
      },
    },

    duplicateSheet: {
      name: 'Duplicate Sheet',
      options: [
        {
          type: 'dropdown',
          label: 'Spreadsheet',
          tooltip: 'Spreadsheet to adjust',
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
          label: 'Original Sheet Name',
          tooltip: 'Name for the sheet to be duplicated',
          id: 'duplicateName',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'New Sheet Name',
          tooltip: 'Name for the new sheet',
          id: 'newName',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const duplicateName = await context.parseVariablesInString(action.options.duplicateName)
        const newName = await context.parseVariablesInString(action.options.newName)
        const idIndex = parseInt(action.options.spreadsheet)
        if (isNaN(idIndex)) return
        const spreadsheetID = instance.config.sheetIDs.split(' ')[idIndex]
        const spreadsheet = instance.data.sheetData.get(spreadsheetID)
        if (!spreadsheet) return

        const originalSheet = spreadsheet.sheets.find((sheet: any) => {
          return sheet.properties.title === duplicateName
        })

        if (originalSheet) {
          instance.api.duplicateSheet(spreadsheetID, originalSheet.properties.sheetId, newName, spreadsheet.sheets.length)
        } else {
          instance.log('warn', `Unable to find sheet ${duplicateName} to duplicate`)
        }
      },
    },
  }
}
