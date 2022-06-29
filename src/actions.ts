import { CompanionActionEventInfo, CompanionActionEvent, SomeCompanionInputField } from '../../../instance_skel_types'
import GoogleSheetsInstance from './index'

export interface GoogleSheetsActions {
	adjustCell: GoogleSheetsAction<AdjustCellCallback>

	// Index signature
	[key: string]: GoogleSheetsAction<any>
}

interface AdjustCellCallback {
	action: 'adjustCell'
	options: Readonly<{
		type: 'Set' | 'Increase' | 'Decrease'
		spreadsheet: string
		cell: string
		value: string
	}>
}

export type ActionCallbacks = ''

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

// Actions specific to GoogleSheets
export interface GoogleSheetsAction<T> {
	label: string
	description?: string
	options: InputFieldWithDefault[]
	callback: (
		action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>,
		info: Readonly<CompanionActionEventInfo | null>
	) => void
	subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
	unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: GoogleSheetsInstance): GoogleSheetsActions {
	return {
		adjustCell: {
			label: 'Adjust Cell',
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
				if (!action.options.cell || !action.options.cell.includes('!') || !action.options.spreadsheet) return
				let newValue: string | number = action.options.value

				if (action.options.type === 'Set') {
					instance.api.adjustCell(action.options.spreadsheet, action.options.cell, newValue.toString())
				} else {
					const cellValue = instance.api.parseCellValue(action.options.spreadsheet, action.options.cell)
					if (cellValue === null) return

					if (action.options.type === 'Increase') {
						newValue = parseFloat(cellValue) + parseFloat(action.options.value)
					} else if (action.options.type === 'Decrease') {
						newValue = parseFloat(cellValue) - parseFloat(action.options.value)
					}

					instance.api.adjustCell(action.options.spreadsheet, action.options.cell, newValue.toString())
				}
			},
		},
	}
}
