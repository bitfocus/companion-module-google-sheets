import instance_skel = require('../../../instance_skel')
import {
	CompanionActions,
	CompanionConfigField,
	CompanionFeedbacks,
	CompanionSystem,
	CompanionPreset,
	CompanionStaticUpgradeScript,
	CompanionInstanceHTTPRequest,
	CompanionInstanceHTTPResponse,
} from '../../../instance_skel_types'
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
class GoogleSheetsInstance extends instance_skel<Config> {
	constructor(system: CompanionSystem, id: string, config: Config) {
		super(system, id, config)
		this.config = config
		this.api = new API(this)
		this.variables = new Variables(this)
	}

	public readonly api
	public destroying = false
	public readonly variables
	public data = {
		sheetData: new Map<string, any>(),
		sheetValues: new Map<string, any>(),
	}

	static GetUpgradeScripts(): CompanionStaticUpgradeScript[] {
		return getUpgrades()
	}

	/**
	 * @description triggered on instance being enabled
	 */
	public init(): void {
		this.api.auth()
		this.updateInstance()
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public readonly destroy = (): void => {
		this.log('debug', `Instance destroyed: ${this.id}`)
		this.destroying = true
		if (this.api.pollAPIInterval) clearTimeout(this.api.pollAPIInterval)
		if (this.api.refreshTokenInterval) clearInterval(this.api.refreshTokenInterval)
	}

	/**
	 * @returns config options
	 * @description generates the config options available for this instance
	 */
	public readonly config_fields = (): CompanionConfigField[] => {
		return getConfigFields()
	}

	/**
	 * @param config new configuration data
	 * @description triggered every time the config for this instance is saved
	 */
	public async updateConfig(config: Config): Promise<void> {
		this.config = config
		this.api.auth()
		if (this.api.pollAPIInterval) clearTimeout(this.api.pollAPIInterval)
		this.api.updatePollInterval()

		this.updateInstance()
	}

	/**
	 * @description sets channels, token, actions, and feedbacks available for this instance
	 */
	public async updateInstance(): Promise<void> {
		// Cast actions and feedbacks from GoogleSheets types to Companion types
		const actions = getActions(this) as CompanionActions
		const feedbacks = getFeedbacks(this) as CompanionFeedbacks

		this.setActions(actions)
		this.setFeedbackDefinitions(feedbacks)
		this.setPresetDefinitions(getPresets(this) as unknown as CompanionPreset[])
		this.variables.updateVariables()
	}

	/**
	 * @param request HTTP request from Companion
	 * @returns HTTP response
	 */
	public handleHttpRequest(request: CompanionInstanceHTTPRequest): Promise<CompanionInstanceHTTPResponse> {
		return httpHandler(this, request)
	}
}

export = GoogleSheetsInstance
