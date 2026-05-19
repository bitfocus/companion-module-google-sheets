import type { CompanionVariableDefinitions } from '@companion-module/base'
import type GoogleSheetsInstance from './index.js'
import { columnIndexToLetter } from './utils.js'

export type VariablesSchema = {
  read_requests: number
  write_requests: number
  exceeded_requests: number
  backoff_timer: number
  [key: `${string | number}_id`]: string
  [key: `${string | number}_title`]: string
  [key: `${string | number}_index`]: number
  [key: `${string | number}_sheet_${number}`]: number
  [key: `${string | number}_${string}!${string}${number}`]: string
}

export class Variables {
  private readonly instance: GoogleSheetsInstance
  public currentDefinitions: Partial<CompanionVariableDefinitions<VariablesSchema>> = {}
  public currentValues: Partial<VariablesSchema> = {}

  constructor(instance: GoogleSheetsInstance) {
    this.instance = instance
  }

  private readonly getDefinitions = (): CompanionVariableDefinitions<VariablesSchema> => {
    const definitions: CompanionVariableDefinitions<VariablesSchema> = {
      read_requests: { name: 'Read Requests per Min' },
      write_requests: { name: 'Write Requests per Min' },
      exceeded_requests: { name: 'Requests Exceeded per Min' },
      backoff_timer: { name: 'Request Backoff Timer' },
    }

    this.instance.data.sheetValues.forEach((spreadsheet, id) => {
      const title: string | number = this.instance.config.referenceIndexVariables ? this.instance.config.sheetIDs.split(' ').indexOf(id) : spreadsheet.properties.title
      definitions[`${title}_id`] = { name: `Spreadsheet ${title} ID` }

      if (this.instance.config.referenceIndexVariables) {
        definitions[`${title}_title`] = { name: `Spreadsheet ${title} Title` }
      } else {
        definitions[`${title}_index`] = { name: `Spreadsheet ${title} Index` }
      }

      spreadsheet.sheets?.forEach((sheet: any) => {
        definitions[`${title}_sheet_${sheet.properties.index}`] = { name: `${title} Sheet ${sheet.properties.index} Title` }
      })

      spreadsheet.valueRanges?.forEach((valueRange: any) => {
        let sheetName = valueRange.range.split('!')[0]
        if (sheetName.startsWith(`'`) && sheetName.endsWith(`'`)) sheetName = sheetName.slice(1, -1)
        sheetName = sheetName.replace(/#/g, '')

        const rowCount = valueRange?.values?.length || 0
        let columnCount = 0

        valueRange?.values?.forEach((row: any) => {
          if (row.length > columnCount) columnCount = row.length
        })

        // For empty sheets without values, set a default empty example
        if (valueRange.values === undefined) {
          definitions[`${title}_${sheetName}!A1`] = { name: `Example ${title} ${sheetName}!A1` }
        }

        for (let row = 0; row < rowCount; row++) {
          for (let column = 0; column < columnCount; column++) {
            if (row === 0 && column === 0) {
              definitions[`${title}_${sheetName}!${columnIndexToLetter(column) as string}${row + 1}`] = {
                name: `Example ${title} ${sheetName}!${columnIndexToLetter(column)}${row + 1}`,
              }
            }
          }
        }
      })
    })

    return definitions
  }

  private readonly getValues = (): VariablesSchema => {
    const variables: VariablesSchema = {
      read_requests: this.instance.api.rateLimit.read.reduce((previous, current) => previous + current, 0),
      write_requests: this.instance.api.rateLimit.write.reduce((previous, current) => previous + current, 0),
      exceeded_requests: this.instance.api.rateLimit.exceeded.reduce((previous, current) => previous + current, 0),
      backoff_timer: this.instance.api.rateLimit.backoff,
    }

    this.instance.data.sheetValues.forEach((spreadsheet, id) => {
      const title: string = this.instance.config.referenceIndexVariables ? this.instance.config.sheetIDs.split(' ').indexOf(id) : spreadsheet.properties.title
      variables[`${title}_id`] = spreadsheet.spreadsheetId

      if (this.instance.config.referenceIndexVariables) {
        variables[`${title}_title`] = spreadsheet.properties.title
      } else {
        variables[`${title}_index`] = this.instance.config.sheetIDs.split(' ').indexOf(id)
      }

      spreadsheet.sheets?.forEach((sheet: any) => {
        variables[`${title}_sheet_${sheet.properties.index}`] = sheet.properties.title
      })

      spreadsheet.valueRanges?.forEach((valueRange: any) => {
        let sheetName = valueRange.range.split('!')[0]
        if (sheetName.startsWith(`'`) && sheetName.endsWith(`'`)) sheetName = sheetName.slice(1, -1)
        sheetName = sheetName.replace(/#/g, '')

        const rowCount = valueRange?.values?.length || 0
        let columnCount = 0

        valueRange?.values?.forEach((row: any) => {
          if (row.length > columnCount) columnCount = row.length
        })

        // For empty sheets without values, set a default empty example
        if (valueRange.values === undefined) {
          variables[`${title}_${sheetName}!A1`] = ''
        }

        for (let row = 0; row < rowCount; row++) {
          for (let column = 0; column < columnCount; column++) {
            const data = valueRange.values[row]?.[column] || ''
            variables[`${title}_${sheetName}!${columnIndexToLetter(column) as string}${row + 1}`] = data
          }
        }
      })
    })

    return variables
  }

  public updateVariables = (): void => {
    const newDefinitions = this.getDefinitions()
    const newValues = this.getValues()

    if (JSON.stringify(this.currentDefinitions) !== JSON.stringify(newDefinitions)) {
      this.instance.setVariableDefinitions(newDefinitions)
      this.currentDefinitions = newDefinitions
    }

    const valueChanges: Partial<VariablesSchema> = {}

    Object.entries(newValues).forEach(([key, value]: [any, any]) => {
      if (this.currentValues[key] !== value) valueChanges[key] = value
    })

    Object.keys(this.currentValues).forEach((key: any) => {
      if (newValues[key] === undefined) valueChanges[key] = undefined
    })

    if (Object.keys(newValues).length > 0) {
      this.instance.setVariableValues(newValues)
      this.currentValues = newValues
    }
  }
}
