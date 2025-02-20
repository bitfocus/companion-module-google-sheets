import { CompanionActionEvent, SomeCompanionActionInputField } from '@companion-module/base'
import GoogleSheetsInstance from './index'

export interface GoogleSheetsActions {
  addSheet: GoogleSheetsAction<AddSheetCallback>
  adjustCell: GoogleSheetsAction<AdjustCellCallback>
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

interface DuplicateSheetCallback {
  actionId: 'duplicateSheet'
  options: Readonly<{
    spreadsheet: string
    duplicateName: string
    newName: string
  }>
}

export type ActionCallbacks = AddSheetCallback | AdjustCellCallback | DuplicateSheetCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionActionInputField, 'default'> & {
  default: string | number | boolean | null
}

// Actions specific to GoogleSheets
export interface GoogleSheetsAction<T> {
  name: string
  description?: string
  options: InputFieldWithDefault[]
  callback: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void | Promise<void>
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
      callback: async (action) => {
        const name = await instance.parseVariablesInString(action.options.name)
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
      callback: async (action) => {
        const cell = await instance.parseVariablesInString(action.options.cell)
        if (!cell || !cell.includes('!') || action.options.spreadsheet === '') return
        let newValue: string | number = await instance.parseVariablesInString(action.options.value)

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
          tooltip: 'Name for the sheet to be duplicataed',
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
      callback: async (action) => {
        const duplicateName = await instance.parseVariablesInString(action.options.duplicateName)
        const newName = await instance.parseVariablesInString(action.options.newName)
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
