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
		comparison: 'eq' | 'lt' | 'lte' | 'gt' | 'gte'
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
	callback: (
		feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>,
		context: CompanionFeedbackContext
	) => boolean | Promise<boolean>
	subscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
	unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
}

interface GoogleSheetsFeedbackAdvanced<T> {
	type: 'advanced'
	name: string
	description: string
	options: InputFieldWithDefault[]
	callback: (
		feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>,
		context: CompanionFeedbackContext
	) => CompanionAdvancedFeedbackResult
	subscribe?: (
		feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>
	) => CompanionAdvancedFeedbackResult
	unsubscribe?: (
		feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>
	) => CompanionAdvancedFeedbackResult
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
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: async (feedback, context) => {
				const cell = await context.parseVariablesInString(feedback.options.cell)
				const value = await context.parseVariablesInString(feedback.options.value)
				const cellValue = await instance.api.parseCellValue(feedback.options.spreadsheet, cell)

				if (cellValue === null) return false

				if (feedback.options.comparison === 'eq') {
					return cellValue == value
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
