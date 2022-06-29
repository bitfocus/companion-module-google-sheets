import GoogleSheetsInstance from './'
import { columnIndexToLetter } from './utils'

interface InstanceVariableDefinition {
	label: string
	name: string
	type?: string
}

type InstanceVariables = Map<string, string | number | undefined>

export class Variables {
	private readonly instance: GoogleSheetsInstance
	private currentVariables: InstanceVariables = new Map()
	private dataCache = new Map()

	constructor(instance: GoogleSheetsInstance) {
		this.instance = instance
	}

	/**
	 * @param variables Object of variablenames and their values
	 * @description Updates or removes variable for current instance
	 */
	public readonly set = (variables: InstanceVariables): void => {
		const newVariables: { [variableId: string]: string | undefined } = {}

		for (const [key, value] of variables.entries()) {
			newVariables[key] = value + ''
			this.currentVariables.set(key, value)
		}

		this.instance.setVariables(newVariables)
	}

	/**
	 * @description Sets variable definitions
	 */
	public readonly updateDefinitions = (): void => {
		const variables: Set<InstanceVariableDefinition> = new Set([
			{ label: 'Read Requests per Min', name: 'read_requests' },
			{ label: 'Write Requests per Min', name: 'write_requests' },
			{ label: 'Requests Exceeded per Min', name: 'exceeded_requests' },
			{ label: 'Request Backoff Timer', name: 'backoff_timer' },
		])

		this.instance.data.sheetValues.forEach((spreadsheet, _id) => {
			variables.add({
				label: `Spreadsheet ${spreadsheet.properties.title} ID`,
				name: `${spreadsheet.properties.title}_id`,
			})

			spreadsheet.sheets.forEach((sheet: any) => {
				variables.add({
					label: `${spreadsheet.properties.title} Sheet ${sheet.properties.index} Title`,
					name: `${spreadsheet.properties.title}_sheet_${sheet.properties.index}`,
				})
			})

			// Instance variables for individual cells limited to an example of A1 for each spreadsheet and sheet for performance reasons
			spreadsheet.valueRanges.forEach((valueRange: any) => {
				const sheetName = valueRange.range.split('!')[0]
				variables.add({
					label: `Cell Example ${spreadsheet.properties.title} ${sheetName}!A1`,
					name: `${spreadsheet.properties.title}_${sheetName}!A1`,
				})
			})
		})

		this.instance.setVariableDefinitions([...variables])
	}

	/**
	 * @description Update variables
	 */
	public readonly updateVariables = (): void => {
		const newVariables: InstanceVariables = new Map()

		newVariables.set(
			'read_requests',
			this.instance.api.rateLimit.read.reduce((previous, current) => previous + current, 0)
		)
		newVariables.set(
			'write_requests',
			this.instance.api.rateLimit.write.reduce((previous, current) => previous + current, 0)
		)
		newVariables.set(
			'exceeded_requests',
			this.instance.api.rateLimit.exceeded.reduce((previous, current) => previous + current, 0)
		)
		newVariables.set('backoff_timer', this.instance.api.rateLimit.backoff)

		this.instance.data.sheetValues.forEach((spreadsheet, _id) => {
			newVariables.set(`${spreadsheet.properties.title}_id`, spreadsheet.spreadsheetId)

			spreadsheet.sheets.forEach((sheet: any) => {
				newVariables.set(`${spreadsheet.properties.title}_sheet_${sheet.properties.index}`, sheet.properties.title)
			})

			spreadsheet.valueRanges.forEach((valueRange: any) => {
				const sheetName = valueRange.range.split('!')[0]
				const sheetData = spreadsheet.sheets.find(
					(sheet: any) => sheet.properties.title === sheetName || `'${sheet.properties.title}'` === sheetName
				)

				if (!sheetData) return

				const rowCount = valueRange.values.length
				let columnCount = 0

				valueRange.values.forEach((row: any) => {
					if (row.length > columnCount) columnCount = row.length
				})

				for (let row = 0; row < rowCount; row++) {
					for (let column = 0; column < columnCount; column++) {
						const data = valueRange.values[row]?.[column] || ''

						if (
							this.dataCache.get(
								`${spreadsheet.properties.title}_${sheetName}!${columnIndexToLetter(column)}${row + 1}`
							) !== data
						) {
							newVariables.set(
								`${spreadsheet.properties.title}_${sheetName}!${columnIndexToLetter(column)}${row + 1}`,
								data
							)
							this.dataCache.set(
								`${spreadsheet.properties.title}_${sheetName}!${columnIndexToLetter(column)}${row + 1}`,
								data
							)
						}
					}
				}
			})
		})

		this.set(newVariables)
		this.updateDefinitions()
	}
}
