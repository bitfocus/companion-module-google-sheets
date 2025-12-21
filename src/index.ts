import type { CompanionActionDefinitions, CompanionFeedbackDefinitions, CompanionPresetDefinitions, CompanionHTTPRequest, CompanionHTTPResponse, SomeCompanionConfigField } from '@companion-module/base'
import { InstanceBase, runEntrypoint } from '@companion-module/base'

import { getActions } from './actions'
import { API } from './api'
import type { Config } from './config'
import { getConfigFields } from './config'
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
    referenceIndexVariables: false,
    pollInterval: 1.5,
    clearTokens: false,
  }
  public data = {
    sheetData: new Map<string, any>(),
    sheetValues: new Map<string, any>(),
  }
	private actionCache: CompanionActionDefinitions = {}
	private feedbackCache: CompanionFeedbackDefinitions = {}
	private presetCache: CompanionPresetDefinitions = {}

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
		const presets = getPresets(this) as CompanionPresetDefinitions

		if (JSON.stringify(actions) !== JSON.stringify(this.actionCache)) {
			this.actionCache = actions
			this.setActionDefinitions(actions)
		}
    if (JSON.stringify(feedbacks) !== JSON.stringify(this.feedbackCache)) {
			this.feedbackCache = feedbacks
			this.setFeedbackDefinitions(feedbacks)
		}

    if (JSON.stringify(presets) !== JSON.stringify(this.presetCache)) {
			this.presetCache = presets
			this.setPresetDefinitions(presets)
		}
		
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
