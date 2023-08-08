import { CompanionActionEvent, SomeCompanionActionInputField } from '@companion-module/base'
import GoogleSheetsInstance from './index'

export interface GoogleSheetsActions {
	adjustCell: GoogleSheetsAction<AdjustCellCallback>

	// Index signature
	[key: string]: GoogleSheetsAction<any>
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

export type ActionCallbacks = ''

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionActionInputField, 'default'> & {
	default: string | number | boolean | null
}

// Actions specific to GoogleSheets
export interface GoogleSheetsAction<T> {
	name: string
	description?: string
	options: InputFieldWithDefault[]
	callback: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
	subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
	unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: GoogleSheetsInstance): GoogleSheetsActions {
	return {
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
					tooltip: 'Type of cell adjustment',
					id: 'spreadsheet',
					default: '',
					choices: [
						{ label: 'Select Spreadsheet', id: '' },
						...Array.from(instance.data.sheetData, ([id, spreadsheet]: any) => ({
							label: spreadsheet.properties.title,
							id,
						})),
					],
				},
				{
					type: 'textinput',
					label: 'Cell',
					tooltip: 'Sheet!A1 Notation',
					id: 'cell',
					default: '',
				},
				{
					type: 'textinput',
					label: 'Value',
					tooltip: 'Value to set/increase/decrease',
					id: 'value',
					default: '',
				},
			],
			callback: async (action) => {
				const cell = await instance.parseVariablesInString(action.options.cell)
				if (!cell || !cell.includes('!') || !action.options.spreadsheet) return
				let newValue: string | number = await instance.parseVariablesInString(action.options.value)


				if (action.options.type === 'Set') {
					instance.log('debug', `Setting Sheet: ${action.options.spreadsheet} Cell: ${cell} Value: ${newValue}`)
					instance.api.adjustCell(action.options.spreadsheet, cell, newValue)
				} else {
					newValue = parseFloat(newValue)
					
					if (isNaN(newValue)) {
						instance.log('warn', `Unable to adjust cell: ${newValue} is not a number`)
						return
					}

					const cellValue = await instance.api.parseCellValue(action.options.spreadsheet, cell)
					if (cellValue === null) return

					if (action.options.type === 'Increase') {
						newValue = parseFloat(cellValue) + newValue
					} else if (action.options.type === 'Decrease') {
						newValue = parseFloat(cellValue) - newValue
					}

					instance.log('debug', `Setting Sheet: ${action.options.spreadsheet} Cell: ${cell} Value: ${newValue}`)
					instance.api.adjustCell(action.options.spreadsheet, cell, newValue.toString())
				}
			},
		},
	}
}
