import got from 'got-cjs'
import GoogleSheetsInstance from './'
import { cellToIndex } from './utils'
import { InstanceStatus } from '@companion-module/base'

interface RateLimit {
	backoff: number
	incrementRequest: (type: RateLimitType) => void
	interval: NodeJS.Timer
	exceeded: number[]
	read: number[]
	write: number[]
}

type RateLimitType = 'read' | 'write' | 'exceeded'

export class API {
	constructor(instance: GoogleSheetsInstance) {
		this.instance = instance
		this.pollAPIInterval = setTimeout(() => this.pollAPI(), this.instance.config.pollInterval * 1000)
	}

	private instance: GoogleSheetsInstance
	public pollAPIInterval: NodeJS.Timer
	private pollAPISheetData = 0
	public rateLimit: RateLimit = {
		backoff: 0,
		interval: setInterval(() => {
			;['read', 'write', 'exceeded'].forEach((value) => {
				const type = value as RateLimitType
				this.rateLimit[type].push(0)
				this.rateLimit[type].shift()
			})
		}, 1000),
		incrementRequest: (type) => {
			this.rateLimit[type][this.rateLimit[type].length - 1]++
		},
		exceeded: Array(60).fill(0),
		read: Array(60).fill(0),
		write: Array(60).fill(0),
	}
	private ready = false
	public refreshTokenInterval: NodeJS.Timer = setInterval(() => this.refreshToken(), 3000000)
	public spreadsheetIndexToID: string[] = []

	/**
	 * @description API request to create a sheet
	 */
	public addSheet = async (spreadsheet: string, sheetName: string): Promise<void> => {
		const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}:batchUpdate?access_token=${this.instance.config.accessToken}`

		const body = {
			requests: [
				{
					addSheet: {
						properties: {
							title: sheetName,
						},
					},
				},
			],
			includeSpreadsheetInResponse: false,
			responseRanges: [],
			responseIncludeGridData: false,
		}

		got
			.post(url, { body: JSON.stringify(body) })
			.then(() => {
				this.instance.log('info', `Sheet ${sheetName} added`)
			})
			.catch((err) => {
				let body = err?.response?.body

				try {
					body = JSON.parse(body)
					this.instance.log('debug', JSON.stringify(body))
					this.instance.log('warn', body.error.message)
				} catch (e) {
					this.instance.log('warn', 'API Error - Unable to parse response')
				}
			})
	}

	/**
	 * @description API request to modify a cell
	 */
	public adjustCell = async (spreadsheet: string, cell: string, value: string): Promise<void> => {
		if (!this.ready || !this.instance.config.sheetIDs) return
		const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}/values/${cell}?access_token=${this.instance.config.accessToken}&valueInputOption=USER_ENTERED`

		const body = {
			range: cell,
			values: [[value]],
		}

		got
			.put(url, { body: JSON.stringify(body) })
			.then(() => {
				this.instance.log('info', `${cell} succesfully changed to ${value}`)
			})
			.catch((err) => {
				this.instance.log('warn', `Error changing cell: ${JSON.stringify(err)}`)
			})
	}

	/**
	 * @description API request to duplicate a sheet
	 */
	public duplicateSheet = async (
		spreadsheet: string,
		originalSheet: number,
		newSheet: string,
		index: number
	): Promise<void> => {
		const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}:batchUpdate?access_token=${this.instance.config.accessToken}`

		const body = {
			requests: [
				{
					duplicateSheet: {
						sourceSheetId: originalSheet,
						insertSheetIndex: index,
						newSheetName: newSheet,
					},
				},
			],
			includeSpreadsheetInResponse: false,
			responseRanges: [],
			responseIncludeGridData: false,
		}

		got
			.post(url, { body: JSON.stringify(body) })
			.then(() => {
				this.instance.log('info', `Sheet ${newSheet} added`)
			})
			.catch((err) => {
				let body = err?.response?.body

				try {
					body = JSON.parse(body)
					this.instance.log('debug', JSON.stringify(body))
					this.instance.log('warn', body.error.message)
				} catch (e) {
					this.instance.log('warn', 'API Error - Unable to parse response')
				}
			})
	}

	/**
	 * @description Attempts to authenticate with Google OAuth
	 */
	public auth = async (): Promise<boolean> => {
		this.instance.updateStatus(InstanceStatus.Connecting, 'Authenticating')

		if (await this.refreshToken()) return true
		if (await this.codeExchange()) return true
		return false
	}

	/**
	 * @description Exchanges the code from the Auth Code flow for an Access Token and Refresh Token pair, and saves them to config
	 */
	private codeExchange = async (): Promise<boolean> => {
		if (!this.instance.config.code) return false

		const searchParams = new URLSearchParams([
			['code', this.instance.config.code],
			['client_id', this.instance.config.clientID],
			['client_secret', this.instance.config.clientSecret],
			['redirect_uri', this.instance.config.redirectURI],
			['grant_type', 'authorization_code'],
		])

		this.instance.log('debug', `Attempting to exchange Code for Token - ${this.instance.config.code}`)

		return got
			.post('https://oauth2.googleapis.com/token', { searchParams, responseType: 'json' })
			.then((res: any) => {
				this.instance.log('debug', `Exchaned code - ${JSON.stringify(res.body)}`)
				this.instance.updateStatus(InstanceStatus.Ok)

				this.instance.config.accessToken = res.body.access_token
				this.instance.config.refreshToken = res.body.refresh_token
				this.instance.config.code = ''
				this.ready = true
				this.instance.saveConfig(this.instance.config)

				return true
			})
			.catch((err) => {
				this.instance.updateStatus(InstanceStatus.UnknownError, `Error exchanging code`)
				this.instance.log('warn', `Error exchanging code - ${err.message}`)
				this.instance.saveConfig({ ...this.instance.config, code: '' })

				return false
			})
	}

	/**
	 * @description Refreshes a Google OAuth token using app credentials
	 */
	private refreshToken = async (): Promise<boolean> => {
		if (!this.instance.config.clientID || !this.instance.config.clientSecret || !this.instance.config.refreshToken)
			return false

		this.instance.log('debug', `Attempting to refresh token - ${this.instance.config.refreshToken}`)

		const searchParams = new URLSearchParams([
			['client_id', this.instance.config.clientID],
			['client_secret', this.instance.config.clientSecret],
			['refresh_token', this.instance.config.refreshToken],
			['grant_type', 'refresh_token'],
		])

		return got
			.post(`https://oauth2.googleapis.com/token`, { searchParams, responseType: 'json' })
			.then((res: any) => {
				this.instance.log('debug', `Token Refreshed - ${JSON.stringify(res.body)}`)
				this.instance.updateStatus(InstanceStatus.Ok)

				this.instance.config.accessToken = res.body.access_token
				this.ready = true
				this.instance.saveConfig(this.instance.config)
				this.pollAPI()

				return true
			})
			.catch((err) => {
				this.instance.log('error', err.message)
				return false
			})
	}

	/**
	 * @param sheetID Spreadsheet ID
	 * @param cell Sheet!A1 notation
	 * @returns value of the cell or null
	 */
	public parseCellValue = async (sheetID: string, cell: string): Promise<string | null> => {
		const cellID = (await this.instance.parseVariablesInString(cell)) || ''
		const spreadsheet = this.instance.data.sheetValues.get(sheetID)

		if (!spreadsheet || cellID === '') return null

		const cellIndex = cellToIndex(cellID.split('!')[1])

		if (cellIndex === null) return null

		const sheet = spreadsheet.valueRanges.find((valueRange: any) => {
			return (
				valueRange.range.split('!')[0] === cellID.split('!')[0] ||
				valueRange.range.split('!')[0] === `'${cellID.split('!')[0]}'`
			)
		})

		const value = sheet.values[cellIndex.row]?.[cellIndex.col]

		return value !== undefined ? value : null
	}

	/**
	 * @description Requests Sheet values every request, and Spreadsheet metadata every 4 requests
	 */
	private pollAPI = async (): Promise<void> => {
		const pollStart = new Date()
		if (!this.ready || !this.instance.config.sheetIDs) {
			this.updatePollInterval(pollStart)
			return
		}

		/**
		 * @param id Spreadsheet ID
		 * @description Gets the metadata on a spreadsheet, and the titles of the sheets within
		 */
		const getSheet = (id: string): Promise<void> => {
			this.rateLimit.incrementRequest('read')
			const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?access_token=${this.instance.config.accessToken}`

			return got(url, { responseType: 'json' })
				.then((res) => {
					this.instance.data.sheetData.set(id, res.body)
					return
				})
				.catch((err) => {
					this.instance.log('debug', `getSheet err: ${err.message}`)
					if (err.message.includes('429')) this.rateLimit.incrementRequest('exceeded')
					return
				})
		}

		/**
		 * @param id Spreadsheet ID
		 * @description Batch gets the values for each sheet within a spreadsheet
		 */
		const getSheetValues = async (id: string): Promise<void> => {
			this.rateLimit.incrementRequest('read')
			const sheet = this.instance.data.sheetData.get(id)
			if (!sheet) return

			// Surround title in single quote to prevent Google mistaking Title for Cell
			const individualSheets = sheet.sheets.map((doc: any) => `'${doc.properties.title}'`)
			const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?access_token=${
				this.instance.config.accessToken
			}&ranges=${individualSheets.join('&ranges=')}`

			return got(url, { responseType: 'json' })
				.then((res: any) => {
					sheet.valueRanges = res.body.valueRanges
					this.instance.data.sheetValues.set(id, sheet)
					this.instance.checkFeedbacks('cellValue')
				})
				.catch((err) => {
					this.instance.log('debug', `getSheetValues err: ${err.message}`)
					if (err.message.includes('429')) this.rateLimit.incrementRequest('exceeded')
				})
		}

		const sheetIDs = this.instance.config.sheetIDs.split(' ')
		this.spreadsheetIndexToID = sheetIDs

		// Limit requests for spreadsheet metadata to 1 in 4 requests
		if (this.pollAPISheetData === 0) {
			const spreadsheetRequests: Promise<void>[] = []
			sheetIDs.forEach((id) => spreadsheetRequests.push(getSheet(id)))

			Promise.allSettled(spreadsheetRequests)
				.then(() => {
					const sheetValuesRequest: Promise<void>[] = []
					sheetIDs.forEach((id) => sheetValuesRequest.push(getSheetValues(id)))

					return Promise.allSettled(sheetValuesRequest)
				})
				.catch((err) => {
					this.instance.log('warn', `API Polling err: ${JSON.stringify(err)}`)
				})
				.finally(() => {
					this.instance.updateInstance()
					this.updatePollInterval(pollStart)
				})
		} else {
			const sheetValuesRequest: Promise<void>[] = []
			sheetIDs.forEach((id) => sheetValuesRequest.push(getSheetValues(id)))

			Promise.allSettled(sheetValuesRequest)
				.catch((err) => {
					this.instance.log('warn', `API Polling err: ${JSON.stringify(err)}`)
				})
				.finally(() => {
					this.instance.updateInstance()
					this.updatePollInterval(pollStart)
				})
		}

		this.pollAPISheetData = (this.pollAPISheetData + 1) % 4
	}

	/**
	 * @param prevReq Date of the previous request
	 * @description Subtracts the time taken for previous request from the polling interval, and adds an exponential backoff if required
	 */
	public updatePollInterval = (prevReq: Date = new Date()): void => {
		if (this.instance.destroying) return
		if (this.pollAPIInterval) clearTimeout(this.pollAPIInterval)

		const prevReqTime = new Date().getTime() - prevReq.getTime()
		const pollInterval = this.instance.config.pollInterval < 0.1 ? 0.1 : this.instance.config.pollInterval
		const errorCount = this.rateLimit.exceeded.reduce((previous, current) => previous + current, 0)
		this.rateLimit.backoff = errorCount > 0 ? 2 ** errorCount * 10 : 0
		let delay = pollInterval * 1000 + this.rateLimit.backoff - prevReqTime
		if (delay < 0) delay = 0

		this.pollAPIInterval = setTimeout(() => this.pollAPI(), delay)
	}
}
