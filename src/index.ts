import {
  InstanceBase,
  runEntrypoint,
  CompanionActionDefinitions,
  CompanionFeedbackDefinitions,
  CompanionHTTPRequest,
  CompanionHTTPResponse,
  SomeCompanionConfigField,
} from '@companion-module/base'

import { getActions } from './actions'
import { API } from './api'
import { Config, getConfigFields } from './config'
import { getFeedbacks } from './feedback'
import { httpHandler } from './http'
import { getPresets } from './presets'
import { getUpgrades } from './upgrade'
import { Variables } from './variables'

/**
 * Companion instance class for Google Sheets API
 */
class GoogleSheetsInstance extends InstanceBase<Config> {
  public readonly api
  public destroying = false
  public readonly variables
  public config: Config = {
    clientID: '',
    clientSecret: '',
    redirectURI: '',
    code: '',
    sheetIDs: '',
    referenceIndex: false,
    pollInterval: 1.5,
    clearTokens: false,
  }
  public data = {
    sheetData: new Map<string, any>(),
    sheetValues: new Map<string, any>(),
  }

  constructor(internal: unknown) {
    super(internal)
    this.api = new API(this)
    this.variables = new Variables(this)
    this.instanceOptions.disableVariableValidation = true
  }

  /**
   * @description triggered on instance being enabled
   */
  public async init(config: Config): Promise<void> {
    this.config = config
    this.updateInstance()

    await this.configUpdated(config)
    this.log(
      'info',
      'Companion 3 makes some changes to Instance Variables, and limits certain symbols being used, such as !, so please check your variables are working and look at the examples showing how to reference A1 variiable in each sheet',
    )
  }

  /**
   * @param config new configuration data
   * @description triggered every time the config for this instance is saved
   */
  public async configUpdated(config: Config): Promise<void> {
    this.config = config
    if (this.config.clearTokens) {
      this.config.accessToken = undefined
      this.config.refreshToken = undefined
      this.config.code = ''
      this.config.clearTokens = false

      this.log('info', 'Clearing Access and Refresh Tokens')
      this.saveConfig(this.config)
    }

    await this.api.auth()
    if (this.api.pollAPIInterval) clearTimeout(this.api.pollAPIInterval)
    this.api.updatePollInterval()

    this.updateInstance()
    return
  }

  /**
   * @description close connections and stop timers/intervals
   */
  public async destroy(): Promise<void> {
    this.log('debug', `Instance destroyed: ${this.id}`)
    this.destroying = true
    if (this.api.pollAPIInterval) clearTimeout(this.api.pollAPIInterval)
    if (this.api.refreshTokenInterval) clearInterval(this.api.refreshTokenInterval)
  }

  /**
   * @returns config options
   * @description generates the config options available for this instance
   */
  public getConfigFields(): SomeCompanionConfigField[] {
    return getConfigFields(this)
  }

  /**
   * @description sets channels, token, actions, and feedbacks available for this instance
   */
  public async updateInstance(): Promise<void> {
    const actions = getActions(this) as CompanionActionDefinitions
    const feedbacks = getFeedbacks(this) as CompanionFeedbackDefinitions

    this.setActionDefinitions(actions)
    this.setFeedbackDefinitions(feedbacks)
    this.setPresetDefinitions(getPresets(this))
    this.variables.updateVariables()
  }

  /**
   * @param request HTTP request from Companion
   * @returns HTTP response
   */
  public async handleHttpRequest(request: CompanionHTTPRequest): Promise<CompanionHTTPResponse> {
    return httpHandler(this, request)
  }
}

export = GoogleSheetsInstance

runEntrypoint(GoogleSheetsInstance, getUpgrades())
