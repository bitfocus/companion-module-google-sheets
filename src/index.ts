import {
  InstanceBase,
  createModuleLogger,
  type CompanionActionDefinitions,
  type CompanionFeedbackDefinitions,
  type CompanionHTTPRequest,
  type CompanionHTTPResponse,
  type SomeCompanionConfigField,
} from '@companion-module/base'
import type { InstanceTypes } from './utils.js'
import { getActions } from './actions.js'
import { API } from './api.js'
import type { Config } from './config.js'
import { getConfigFields } from './config.js'
import { getFeedbacks } from './feedback.js'
import { httpHandler } from './http.js'
import { getPresetDefinitions, getPresetStructure } from './presets.js'
import { getUpgrades } from './upgrade.js'
import { Variables } from './variables.js'

const log = createModuleLogger('Main')

/**
 * Companion instance class for Google Sheets API
 */
export default class GoogleSheetsInstance extends InstanceBase<InstanceTypes> {
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
    referenceIndexVariables: false,
    pollInterval: 1.5,
    clearTokens: false,
    accessToken: null,
    refreshToken: null,
  }
  public data = {
    sheetData: new Map<string, any>(),
    sheetValues: new Map<string, any>(),
  }
  private actionCache: CompanionActionDefinitions<any> = {}
  private feedbackCache: CompanionFeedbackDefinitions<any> = {}

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
    console.log(123)
    this.config = config
    this.updateInstance()

    await this.configUpdated(config)
  }

  /**
   * @param config new configuration data
   * @description triggered every time the config for this instance is saved
   */
  public async configUpdated(config: Config): Promise<void> {
    this.config = config
    if (this.config.clearTokens) {
      this.config.accessToken = null
      this.config.refreshToken = null
      this.config.code = ''
      this.config.clearTokens = false

      log.info('Clearing Access and Refresh Tokens')
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
    log.debug(`Instance destroyed: ${this.id}`)
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
    const actions = getActions(this)
    const feedbacks = getFeedbacks(this)

    if (JSON.stringify(actions) !== JSON.stringify(this.actionCache)) {
      this.actionCache = actions
      this.setActionDefinitions(actions)
    }
    if (JSON.stringify(feedbacks) !== JSON.stringify(this.feedbackCache)) {
      this.feedbackCache = feedbacks
      this.setFeedbackDefinitions(feedbacks)
    }

    this.setPresetDefinitions(getPresetStructure, getPresetDefinitions(this))

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

export const UpgradeScripts = getUpgrades()
