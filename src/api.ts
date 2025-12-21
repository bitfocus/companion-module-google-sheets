import type GoogleSheetsInstance from './'
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
    this.pollAPIInterval = setTimeout(() => {
      this.pollAPI()
    }, this.instance.config.pollInterval * 1000)
  }

  private instance: GoogleSheetsInstance
  public pollAPIInterval: ReturnType<typeof setTimeout>
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
  public refreshTokenInterval: ReturnType<typeof setInterval> = setInterval(() => {
    this.refreshToken()
  }, 3000000)
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

    this.instance.log('debug', `Attempting to Add Sheet: ${JSON.stringify(body)}`)

    fetch(url, { method: 'POST', body: JSON.stringify(body) })
      .then(async (res) => res.json())
      .then((res: any) => {
        if (res.error) {
          if (res.error.code === 429) {
            this.instance.log('warn', 'Rate Limit exceeded')
            this.rateLimit.incrementRequest('exceeded')
          } else {
            this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
          }
          this.instance.log('debug', res.error.message)
        } else {
          this.instance.log('info', `Sheet ${sheetName} added`)
          this.instance.log('debug', `Add Sheet Response: ${JSON.stringify(res)}`)
        }
      })
      .catch((err) => {
        let body = err?.response?.body

        try {
          body = JSON.parse(body)
          this.instance.log('warn', body.error.message)
          this.instance.log('debug', JSON.stringify(body))
        } catch (e) {
          this.instance.log('warn', `API Error - Unable to parse response`)
          this.instance.log('debug', `${e}`)
        }
      })
  }

  /**
   * @description API request to modify a cell
   */
  public adjustCell = async (spreadsheet: string, cell: string, value: string): Promise<void> => {
    if (!this.ready || !this.instance.config.sheetIDs) return
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}/values/${encodeURIComponent(cell)}?access_token=${this.instance.config.accessToken}&valueInputOption=USER_ENTERED`

    const body = {
      range: cell,
      values: [[value]],
    }

    this.instance.log('debug', `Adjusting Sheet: ${spreadsheet} Cell: ${cell} Value: ${value}`)

    fetch(url, { method: 'PUT', body: JSON.stringify(body) })
      .then(async (res) => res.json())
      .then((res: any) => {
        if (res.error) {
          if (res.error.code === 429) {
            this.instance.log('warn', 'Rate Limit exceeded')
            this.rateLimit.incrementRequest('exceeded')
          } else {
            this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
          }
          this.instance.log('debug', res.error.message)
        } else {
          this.instance.log('info', `${cell} successfully changed to ${value}`)
          this.instance.log('debug', `Adjust Cell Response: ${JSON.stringify(res)}`)
        }
      })
      .catch((err) => {
        this.instance.log('warn', `Error changing cell: ${JSON.stringify(err)}`)
      })
  }

  public clearSheet = async (spreadsheet: string, sheet: number): Promise<void> => {
    if (!this.ready || !this.instance.config.sheetIDs) return
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}:batchUpdate?access_token=${this.instance.config.accessToken}`

    const body = {
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheet,
            },
            fields: 'userEnteredValue',
          },
        },
      ],
    }

    const options = {
      method: 'POST',
      body: JSON.stringify(body),
    }

    this.instance.log('debug', `Attempting to Clear Sheet: ${spreadsheet} Sheet: ${sheet}`)

    return fetch(url, options)
      .then(async (res) => res.json())
      .then((res: any) => {
        if (res.error) {
          if (res.error.code === 429) {
            this.instance.log('warn', 'Rate Limit exceeded')
            this.rateLimit.incrementRequest('exceeded')
          } else {
            this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
          }
          this.instance.log('debug', res.error.message)
        }
      })
      .catch((err) => {
        this.instance.log('debug', `clearSheet err: ${err.message} - url: ${url}`)
        if (err.message.includes('429')) this.rateLimit.incrementRequest('exceeded')
      })
  }

  public deleteRowColumn = async (spreadsheet: string, sheet: number, type: 'ROWS' | 'COLUMNS', start: number, stop: number): Promise<void> => {
    if (!this.ready || !this.instance.config.sheetIDs) return
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}:batchUpdate?access_token=${this.instance.config.accessToken}`

    const body = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet,
              dimension: type,
              startIndex: start,
              endIndex: stop,
            },
          },
        },
      ],
    }

    const options = {
      method: 'POST',
      body: JSON.stringify(body),
    }

    return fetch(url, options)
      .then(async (res) => res.json())
      .then((res: any) => {
        if (res.error) {
          if (res.error.code === 429) {
            this.instance.log('warn', 'Rate Limit exceeded')
            this.rateLimit.incrementRequest('exceeded')
          } else {
            this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
          }
          this.instance.log('debug', res.error.message)
        }
      })
      .catch((err) => {
        this.instance.log('debug', `deleteRowColumn err: ${err.message} - url: ${url}`)
        if (err.message.includes('429')) this.rateLimit.incrementRequest('exceeded')
      })
  }

  /**
   * @description API request to duplicate a sheet
   */
  public duplicateSheet = async (spreadsheet: string, originalSheet: number, newSheet: string, index: number): Promise<void> => {
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

    fetch(url, { method: 'POST', body: JSON.stringify(body) })
      .then(async (res) => res.json())
      .then((res) => {
        this.instance.log('info', `Sheet ${newSheet} added`)
        this.instance.log('debug', `Duplicating Sheet Response: ${JSON.stringify(res)}`)
      })
      .catch((err) => {
        let body = err?.response?.body

        try {
          body = JSON.parse(body)
          this.instance.log('debug', JSON.stringify(body))
          this.instance.log('warn', body.error.message)
        } catch (e) {
          this.instance.log('warn', 'API Error - Unable to parse response')
          this.instance.log('debug', `${e}`)
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
    ]).toString()

    this.instance.log('debug', `Attempting to exchange Code for Token - ${this.instance.config.code}`)

    return fetch(`https://oauth2.googleapis.com/token?${searchParams}`, { method: 'POST' })
      .then(async (res) => res.json())
      .then((res: any) => {
        this.instance.log('debug', `Exchanged code - ${JSON.stringify(res)}`)
        this.instance.updateStatus(InstanceStatus.Ok)

        this.instance.config.accessToken = res.access_token
        this.instance.config.refreshToken = res.refresh_token
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
    if (!this.instance.config.clientID || !this.instance.config.clientSecret || !this.instance.config.refreshToken) return false

    this.instance.log('debug', `Attempting to refresh token - ${this.instance.config.refreshToken}`)

    const searchParams = new URLSearchParams([
      ['client_id', this.instance.config.clientID],
      ['client_secret', this.instance.config.clientSecret],
      ['refresh_token', this.instance.config.refreshToken],
      ['grant_type', 'refresh_token'],
    ]).toString()

    return fetch(`https://oauth2.googleapis.com/token?${searchParams}`, { method: 'POST' })
      .then(async (res) => res.json())
      .then((res: any) => {
        this.instance.log('debug', `Token Refreshed - ${JSON.stringify(res)}`)
        this.instance.updateStatus(InstanceStatus.Ok)

        this.instance.config.accessToken = res.access_token
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
      return valueRange.range.split('!')[0] === cellID.split('!')[0] || valueRange.range.split('!')[0] === `'${cellID.split('!')[0]}'`
    })

    if (!sheet) {
      this.instance.log('debug', `valueRanges - ${JSON.stringify(spreadsheet.valueRanges)} -  ${cellID}`)
      return null
    }

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
    const getSheet = async (id: string): Promise<void> => {
      this.rateLimit.incrementRequest('read')
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?access_token=${this.instance.config.accessToken}`

      return fetch(url)
        .then(async (res) => res.json())
        .then((res: any) => {
          if (res.error) {
            if (res.error.code === 429) {
              this.instance.log('warn', 'Rate Limit exceeded')
              this.rateLimit.incrementRequest('exceeded')
            } else {
              this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
            }
            this.instance.log('debug', res.error.message)
          } else {
            this.instance.data.sheetData.set(id, res)
            return
          }
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
      const individualSheets = sheet.sheets.map((doc: any) => `'${encodeURIComponent(doc.properties.title)}'`)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?access_token=${this.instance.config.accessToken}&ranges=${individualSheets.join('&ranges=')}`

      return fetch(url)
        .then(async (res) => res.json())
        .then((res: any) => {
          if (res.error) {
            if (res.error.code === 429) {
              this.instance.log('warn', 'Rate Limit exceeded')
              this.rateLimit.incrementRequest('exceeded')
            } else {
              this.instance.log('warn', `API Error ${res.error.code}: ${res.error.message}`)
            }
            this.instance.log('debug', res.error.message)
          } else {
            if (res.valueRanges === undefined) {
              return
            } else {
              sheet.valueRanges = res.valueRanges
              this.instance.data.sheetValues.set(id, sheet)
              this.instance.checkFeedbacks('cellValue')
            }
          }
        })
        .catch((err) => {
          this.instance.log('debug', `getSheetValues err: ${err.message} - url: ${url}`)
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
        .then(async () => {
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

    this.pollAPIInterval = setTimeout(() => {
      this.pollAPI()
    }, delay)
  }

  public getSpreadsheetID = (id: string): string | null => {
		let spreadsheetID = null
    const spreadsheetCheck = this.instance.config.sheetIDs.split(' ').includes(id)

    if (spreadsheetCheck) spreadsheetID = id

    if (this.instance.config.referenceIndex && !spreadsheetID) {
      const index = parseInt(id)
      spreadsheetID = this.instance.config.sheetIDs.split(' ')[index]
    }

    if (!spreadsheetID) {
      this.instance.log('warn', `Unable to find Spreadsheet ${id}`)
      return null
    }

		return spreadsheetID
  }
}
