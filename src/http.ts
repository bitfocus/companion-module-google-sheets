import { CompanionHTTPRequest, CompanionHTTPResponse } from '@companion-module/base'
import GoogleSheetsInstance from './index'
import { columnIndexToLetter } from './utils'
import { Parser } from '@json2csv/plainjs'

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
  json: string[]
  csv: string[]
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
export const httpHandler = async (instance: GoogleSheetsInstance, request: CompanionHTTPRequest): Promise<CompanionHTTPResponse> => {
  const response: CompanionHTTPResponse = {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 404, message: 'Not Found' }),
  }

  const getAuth = () => {
    if (instance.config.clientID && instance.config.clientSecret && instance.config.redirectURI) {
      const oauthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${instance.config.clientID}&redirect_uri=${instance.config.redirectURI}&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&prompt=consent&access_type=offline`
      instance.log('warn', `OAuth URL: ${oauthURL}`)

      response.status = 302
      response.headers = { location: oauthURL }
    } else {
      response.body = JSON.stringify({
        status: 400,
        message: 'Config is missing Client ID, Client Secret, and/or Redirect URI',
      })
    }
  }

  /**
   * GET Spreadsheet
   * Required Params - id, sheet
   * Optional Params - format
   * @description Returns Sheet values
   */
  const getSpreadsheet = () => {
    const id = request.query.id
    const title = request.query.sheet
    const format = request.query?.format || 'json'
    const spreadsheet = instance.data.sheetValues.get(id)

    if (spreadsheet) {
      const sheet = spreadsheet.valueRanges.find((valueRange: any) => title === valueRange.range.split('!')[0] || `'${title}'` === valueRange.range.split('!')[0])

      if (sheet) {
        response.status = 200
        const data: any[] = []

        if (format === 'json') {
          sheet.values.forEach((row: any, rowIndex: number) => {
            data[rowIndex] = {}

            row.forEach((value: any, columnIndex: number) => {
              data[rowIndex][columnIndexToLetter(columnIndex) as string] = value
            })
          })

          response.body = JSON.stringify(data, null, 2)
        } else if (format === 'csv') {
          try {
            const csvOpts = {
              header: false,
            }
            const parser = new Parser(csvOpts)
            const csv = parser.parse(sheet.values)
            response.body = csv
          } catch (err) {
            instance.log('error', 'Error parsing spreadsheet JSON to CSV')
            instance.log('debug', `${err}`)
            response.body = JSON.stringify({ status: 500, message: 'Error parsing spreadsheet JSON to CSV' })
          }
        } else {
          response.body = JSON.stringify({ status: 400, message: 'Unsupported format type' })
        }
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
        json: value.sheets.map((sheet: any) => `http://${request.headers.host}${request.baseUrl}/spreadsheet?id=${key}&format=json&sheet=${sheet.properties.title}`) || [],
        csv: value.sheets.map((sheet: any) => `http://${request.headers.host}${request.baseUrl}/spreadsheet?id=${key}&format=csv&sheet=${sheet.properties.title}`) || [],
      })
    }

    response.status = 200
    response.body = JSON.stringify(data, null, 2)
  }

  const endpoints: Endpoints = {
    GET: {
      auth: getAuth,
      spreadsheet: getSpreadsheet,
      spreadsheets: getSpreadsheets,
    },
  }

  const endpoint = request.path.replace('/', '').toLowerCase()

  if (endpoints[request.method][endpoint]) endpoints[request.method][endpoint]()

  return response
}
