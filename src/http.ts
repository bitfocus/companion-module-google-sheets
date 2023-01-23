import { CompanionHTTPRequest, CompanionHTTPResponse } from '@companion-module/base'
import GoogleSheetsInstance from './index'
import { columnIndexToLetter } from './utils'

interface Endpoints {
	GET: {
		[endpoint: string]: () => void
	}

	[method: string]: {
		[endpoint: string]: () => void
	}
}

interface Spreadsheets {
	id: string
	title: string
	sheets: string[]
}

/**
 * @returns HTTP Request
 * @description Creates a basic HTTP request to be used internally to call the HTTP handler functions
 */
export const defaultHTTPRequest = (): CompanionHTTPRequest => {
	return { method: 'GET', path: '', headers: {}, baseUrl: '', hostname: '', ip: '', originalUrl: '', query: {} }
}

/**
 * @param instance GoogleSheets Instance
 * @param request HTTP request
 * @returns HTTP response
 * @description Checks incoming HTTP requests to the instance for an appropriate handler or returns a 404
 */
export const httpHandler = async (
	instance: GoogleSheetsInstance,
	request: CompanionHTTPRequest
): Promise<CompanionHTTPResponse> => {
	const response: CompanionHTTPResponse = {
		status: 404,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ status: 404, message: 'Not Found' }),
	}

	/**
	 * GET Spreadsheet
	 * Required Params - id, sheet
	 * Optional Params - None
	 * @description Returns Sheet values
	 */
	const getSpreadsheet = () => {
		const id = request.query.id
		const title = request.query.sheet
		const spreadsheet = instance.data.sheetValues.get(id)

		if (spreadsheet) {
			const sheet = spreadsheet.valueRanges.find(
				(valueRange: any) => title === valueRange.range.split('!')[0] || `'${title}'` === valueRange.range.split('!')[0]
			)

			if (sheet) {
				response.status = 200
				const data: any[] = []

				sheet.values.forEach((row: any, rowIndex: number) => {
					data[rowIndex] = {}

					row.forEach((value: any, columnIndex: number) => {
						data[rowIndex][columnIndexToLetter(columnIndex) as string] = value
					})
				})
				response.body = JSON.stringify(data, null, 2)
			} else {
				response.body = JSON.stringify({ status: 404, message: 'Sheet Title not found' })
			}
		} else {
			response.body = JSON.stringify({ status: 404, message: 'Spreadsheet ID not found' })
		}
	}

	/**
	 * GET Spreadsheets
	 * Required Params - None
	 * Optional Params - None
	 * @description Returns Array of spreadsheets, including their IDs, Titles, and the links for individual sheets
	 */
	const getSpreadsheets = () => {
		const data: Spreadsheets[] = []

		for (const [key, value] of instance.data.sheetData.entries()) {
			data.push({
				id: key,
				title: value.properties.title,
				sheets:
					value.sheets.map(
						(sheet: any) =>
							`http://${request.headers.host}${request.baseUrl}/spreadsheet?id=${key}&sheet=${sheet.properties.title}`
					) || [],
			})
		}

		response.status = 200
		response.body = JSON.stringify(data, null, 2)
	}

	const endpoints: Endpoints = {
		GET: {
			spreadsheet: getSpreadsheet,
			spreadsheets: getSpreadsheets,
		},
	}

	const endpoint = request.path.replace('/', '').toLowerCase()

	if (endpoints[request.method][endpoint]) endpoints[request.method][endpoint]()

	return response
}
