import { type CompanionActionDefinitions, type CompanionActionSchema, createModuleLogger } from '@companion-module/base'
import type GoogleSheetsInstance from './index.js'
import { colToIndex, options } from './utils.js'

export type ActionsSchema = {
  addSheet: CompanionActionSchema<{
    spreadsheet: string
    name: string
  }>
  adjustCell: CompanionActionSchema<{
    type: 'Set' | 'Increase' | 'Decrease'
    spreadsheet: string
    cell: string
    value: string
  }>
  clearSheet: CompanionActionSchema<{
    spreadsheet: string
    sheet: string
  }>
  deleteRowColumn: CompanionActionSchema<{
    spreadsheet: string
    sheet: string
    type: 'ROWS' | 'COLUMNS'
    rowStart: string
    rowStop: string
    columnStart: string
    columnStop: string
  }>
  duplicateSheet: CompanionActionSchema<{
    spreadsheet: string
    duplicateName: string
    newName: string
  }>
}

const log = createModuleLogger('Actions')

export function getActions(instance: GoogleSheetsInstance): CompanionActionDefinitions<ActionsSchema> {
  return {
    addSheet: {
      name: 'Add Sheet',
      options: [
        options.selectSpreadsheet(instance),
        {
          type: 'textinput',
          label: 'Name',
          description: 'Name for the new Sheet',
          id: 'name',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const spreadsheetID = instance.api.getSpreadsheetID(action.options.spreadsheet)
        if (spreadsheetID === null) return log.warn(`Unable to Add Sheet - Unknown Spreadsheet ${action.options.spreadsheet}`)

        return instance.api.addSheet(spreadsheetID, action.options.name)
      },
    },

    adjustCell: {
      name: 'Adjust Cell',
      options: [
        {
          type: 'dropdown',
          label: 'Type',
          description: 'Type of cell adjustment',
          id: 'type',
          default: 'Set',
          choices: [
            { label: 'Set', id: 'Set' },
            { label: 'Increase', id: 'Increase' },
            { label: 'Decrease', id: 'Decrease' },
          ],
          expressionDescription: `Valid Values: 'Set', 'Increase', or 'Decrease'`,
        },
        options.selectSpreadsheet(instance),
        {
          type: 'textinput',
          label: 'Cell',
          description: 'Sheet!A1 Notation',
          id: 'cell',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Value',
          description: 'Value to set/increase/decrease',
          id: 'value',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const spreadsheetID = instance.api.getSpreadsheetID(action.options.spreadsheet)
        if (spreadsheetID === null) return

        const cell = action.options.cell
        if (!cell || !cell.includes('!') || action.options.spreadsheet === '') return

        let newValue: string | number = action.options.value

        if (action.options.type === 'Set') {
          log.debug(`Setting Sheet: ${spreadsheetID} Cell: ${cell} Value: ${newValue}`)
          instance.api.adjustCell(spreadsheetID, cell, newValue)
        } else {
          newValue = parseFloat(newValue)

          if (isNaN(newValue)) {
            return log.warn(`Unable to adjust cell: ${newValue} is not a number`)
          }

          const cellValue = await instance.api.parseCellValue(spreadsheetID, cell)
          if (cellValue === null) return

          if (action.options.type === 'Increase') {
            newValue = parseFloat(cellValue) + newValue
          } else if (action.options.type === 'Decrease') {
            newValue = parseFloat(cellValue) - newValue
          }

          return instance.api.adjustCell(spreadsheetID, cell, newValue.toString())
        }
      },
    },

    clearSheet: {
      name: 'Clear Sheet',
      options: [
        options.selectSpreadsheet(instance),
        {
          type: 'textinput',
          label: 'Sheet to clear',
          id: 'sheet',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const spreadsheetID = instance.api.getSpreadsheetID(action.options.spreadsheet)
        if (spreadsheetID === null) return

        let sheetId

        const sheetData = instance.data.sheetData.get(spreadsheetID)
        sheetData.sheets.forEach((sheet: any) => {
          if (sheet?.properties?.title === action.options.sheet) sheetId = sheet?.properties?.sheetId
        })

        if (sheetId === undefined) {
          return log.warn('Invalid sheet name')
        }

        return instance.api.clearSheet(spreadsheetID, sheetId)
      },
    },

    deleteRowColumn: {
      name: 'Delete Rows or Columns',
      options: [
        options.selectSpreadsheet(instance),
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
          description: 'Type to delete',
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
          description: 'Starting Row Number',
          id: 'rowStart',
          default: '',
          useVariables: true,
          isVisibleExpression: `$(options:type) === 'ROWS'`,
        },
        {
          type: 'textinput',
          label: 'Row Stop (non-inclusive)',
          description: 'Stop Row Number',
          id: 'rowStop',
          default: '',
          useVariables: true,
          isVisibleExpression: `$(options:type) === 'ROWS'`,
        },
        {
          type: 'textinput',
          label: 'Column Start',
          description: 'Starting Column Letter or Number',
          id: 'columnStart',
          default: '',
          useVariables: true,
          isVisibleExpression: `$(options:type) === 'COLUMNS'`,
        },
        {
          type: 'textinput',
          label: 'Column Stop (non-inclusive)',
          description: 'Stop Column Letter or Number',
          id: 'columnStop',
          default: '',
          useVariables: true,
          isVisibleExpression: `$(options:type) === 'COLUMNS'`,
        },
      ],
      callback: async (action) => {
        const spreadsheetID = instance.api.getSpreadsheetID(action.options.spreadsheet)
        if (spreadsheetID === null) return

        let sheetId

        const sheetData = instance.data.sheetData.get(spreadsheetID)
        sheetData.sheets.forEach((sheet: any) => {
          if (sheet?.properties?.title === action.options.sheet) sheetId = sheet?.properties?.sheetId
        })

        if (sheetId === undefined) {
          log.warn('Invalid sheet name')
          return
        }

        if (action.options.type === 'ROWS') {
          const start = parseInt(action.options.rowStart)
          const stop = parseInt(action.options.rowStop)

          instance.api.deleteRowColumn(spreadsheetID, sheetId, action.options.type, start - 1, stop - 1)
        } else {
          let start: string | number | null = action.options.columnStart
          let stop: string | number | null = action.options.columnStop

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
            return instance.api.deleteRowColumn(spreadsheetID, sheetId, action.options.type, start, stop)
          } else {
            return log.warn('Invalid start and stop indexes')
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
          description: 'Spreadsheet to adjust',
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
          description: 'Name for the sheet to be duplicated',
          id: 'duplicateName',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'New Sheet Name',
          description: 'Name for the new sheet',
          id: 'newName',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const spreadsheetID = instance.api.getSpreadsheetID(action.options.spreadsheet)
        if (spreadsheetID === null) return

        const duplicateName = action.options.duplicateName
        const newName = action.options.newName
        const spreadsheet = instance.data.sheetData.get(spreadsheetID)
        if (!spreadsheet) return

        const originalSheet = spreadsheet.sheets.find((sheet: any) => {
          return sheet.properties.title === duplicateName
        })

        if (originalSheet) {
          return instance.api.duplicateSheet(spreadsheetID, originalSheet.properties.sheetId, newName, spreadsheet.sheets.length)
        } else {
          return log.warn(`Unable to find sheet ${duplicateName} to duplicate`)
        }
      },
    },
  }
}
