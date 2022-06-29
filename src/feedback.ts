import GoogleSheetsInstance from './index'
import {
	CompanionFeedbackEvent,
	SomeCompanionInputField,
	CompanionBankRequiredProps,
	CompanionBankAdditionalStyleProps,
	CompanionFeedbackEventInfo,
	CompanionBankPNG,
} from '../../../instance_skel_types'

export interface GoogleSheetsFeedbacks {
	cellValue: GoogleSheetsFeedback<CellValueCallback>

	// Index signature
	[key: string]: GoogleSheetsFeedback<any>
}

interface CellValueCallback {
	type: 'cellValue'
	options: Readonly<{
		spreadsheet: string
		cell: string
		comparison: 'eq' | 'lt' | 'lte' | 'gt' | 'gte'
		value: string
	}>
}

// Callback type for Presets
export type FeedbackCallbacks = CellValueCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

// GoogleSheets Boolean and Advanced feedback types
interface GoogleSheetsFeedbackBoolean<T> {
	type: 'boolean'
	label: string
	description: string
	style: Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps>
	options: InputFieldWithDefault[]
	callback?: (
		feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>,
		bank: Readonly<CompanionBankPNG | null>,
		info: Readonly<CompanionFeedbackEventInfo | null>
	) => boolean
	subscribe?: (feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>) => boolean
	unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>) => boolean
}

interface GoogleSheetsFeedbackAdvanced<T> {
	type: 'advanced'
	label: string
	description: string
	options: InputFieldWithDefault[]
	callback?: (
		feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>,
		bank: Readonly<CompanionBankPNG | null>,
		info: Readonly<CompanionFeedbackEventInfo | null>
	) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
	subscribe?: (
		feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>
	) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
	unsubscribe?: (
		feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>
	) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
}

export type GoogleSheetsFeedback<T> = GoogleSheetsFeedbackBoolean<T> | GoogleSheetsFeedbackAdvanced<T>

export function getFeedbacks(instance: GoogleSheetsInstance): GoogleSheetsFeedbacks {
	return {
		cellValue: {
			type: 'boolean',
			label: 'Cell Value',
			description: '',
			options: [
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
					label: 'Cell (Sheet!A1)',
					id: 'cell',
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Comparison',
					id: 'comparison',
					default: 'eq',
					choices: [
						{ id: 'eq', label: '=' },
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
				},
			],
			style: {
				bgcolor: instance.rgb(255, 0, 0),
			},
			callback: (feedback) => {
				const cellValue = instance.api.parseCellValue(feedback.options.spreadsheet, feedback.options.cell)
				if (cellValue === null) return false

				if (feedback.options.comparison === 'eq') {
					return cellValue == feedback.options.value
				} else if (feedback.options.comparison === 'lt') {
					return cellValue < feedback.options.value
				} else if (feedback.options.comparison === 'lte') {
					return cellValue <= feedback.options.value
				} else if (feedback.options.comparison === 'gt') {
					return cellValue > feedback.options.value
				} else if (feedback.options.comparison === 'gte') {
					return cellValue >= feedback.options.value
				}

				return false
			},
		},
	}
}
