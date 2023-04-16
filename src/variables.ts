import GoogleSheetsInstance from './'
import { columnIndexToLetter } from './utils'

type InstanceVariables = Map<string, string | number | undefined>
type instanceDefinitions = Map<string, string>

export class Variables {
	private readonly instance: GoogleSheetsInstance
	private currentVariables: InstanceVariables = new Map()
	private currentDefinitions: instanceDefinitions = new Map()

	constructor(instance: GoogleSheetsInstance) {
		this.instance = instance
	}

	/**
	 * @description Sets variable definitions
	 */
	public readonly updateVariables = (): void => {
		const newDefinitions: instanceDefinitions = new Map()
		const newVariables: InstanceVariables = new Map()

		newDefinitions.set('read_requests', 'Read Requests per Min')
		newVariables.set(
			'read_requests',
			this.instance.api.rateLimit.read.reduce((previous, current) => previous + current, 0)
		)

		newDefinitions.set('write_requests', 'Write Requests per Min')
		newVariables.set(
			'write_requests',
			this.instance.api.rateLimit.write.reduce((previous, current) => previous + current, 0)
		)

		newDefinitions.set('exceeded_requests', 'Requests Exceeded per Min')
		newVariables.set(
			'exceeded_requests',
			this.instance.api.rateLimit.exceeded.reduce((previous, current) => previous + current, 0)
		)

		newDefinitions.set('backoff_timer', 'Request Backoff Timer')
		newVariables.set('backoff_timer', this.instance.api.rateLimit.backoff)

		this.instance.data.sheetValues.forEach((spreadsheet, _id) => {
			newDefinitions.set(`${spreadsheet.properties.title}_id`, `Spreadsheet ${spreadsheet.properties.title} ID`)
			newVariables.set(`${spreadsheet.properties.title}_id`, spreadsheet.spreadsheetId)

			spreadsheet.sheets.forEach((sheet: any) => {
				newDefinitions.set(
					`${spreadsheet.properties.title}_sheet_${sheet.properties.index}`,
					`${spreadsheet.properties.title} Sheet ${sheet.properties.index} Title`
				)
				newVariables.set(`${spreadsheet.properties.title}_sheet_${sheet.properties.index}`, sheet.properties.title)
			})

			spreadsheet.valueRanges.forEach((valueRange: any) => {
				const sheetName = valueRange.range.split('!')[0]
				const rowCount = valueRange?.values?.length || 0
				let columnCount = 0

				valueRange?.values.forEach((row: any) => {
					if (row.length > columnCount) columnCount = row.length
				})

				for (let row = 0; row < rowCount; row++) {
					for (let column = 0; column < columnCount; column++) {
						const data = valueRange.values[row]?.[column] || ''
						if (row === 0 && column === 0) {
							newDefinitions.set(
								`${spreadsheet.properties.title}_${sheetName}!${columnIndexToLetter(column)}${row + 1}`,
								`Example ${spreadsheet.properties.title} ${sheetName}!${columnIndexToLetter(column)}${row + 1}`
							)
						}
						newVariables.set(
							`${spreadsheet.properties.title}_${sheetName}!${columnIndexToLetter(column)}${row + 1}`,
							data
						)
						if (sheetName === 'Controller' && row === 0 && column === 0) console.log(`Controller A1:${data}`)
					}
				}
			})
		})

		let definitionChange = false

		newDefinitions.forEach((name, variableId) => {
			if (this.currentDefinitions.get(variableId) !== name) definitionChange = true
		})

		this.currentDefinitions.forEach((name, variableId) => {
			if (newDefinitions.get(variableId) !== name) definitionChange = true
		})

		if (definitionChange) {
			this.instance.log('debug', 'new definitions')
			this.instance.setVariableDefinitions(
				[...newDefinitions.entries()].map((entry) => ({
					variableId: entry[0]
						.replace(/ /g, '_')
						.replace(/!/g, '_')
						.replace(/'/g, '')
						.replace(/\(/g, '')
						.replace(/\)/g, ''),
					name: entry[1],
				}))
			)
			this.currentDefinitions = newDefinitions
		}

		const changedVariables: { [variableId: string]: string | number | undefined } = {}
		newVariables.forEach((value, variableId) => {
			if (this.currentVariables.get(variableId) !== value)
				changedVariables[
					variableId.replace(/ /g, '_').replace(/!/g, '_').replace(/'/g, '').replace(/\(/g, '').replace(/\)/g, '')
				] = value + ''
		})

		if (Object.keys(changedVariables).length > 0) {
			this.instance.setVariableValues(changedVariables)
			this.currentVariables = newVariables

			// Log large variable changes
			if (Object.keys(changedVariables).length > 1000) {
				this.instance.log('debug', `Updating ${Object.keys(changedVariables).length} of ${newVariables.size} variables`)
			}
		}
	}
}
