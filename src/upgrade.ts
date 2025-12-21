import type { CompanionStaticUpgradeResult, CompanionStaticUpgradeScript } from '@companion-module/base'
import type { Config } from './config'

export const getUpgrades = (): CompanionStaticUpgradeScript<Config>[] => {
  const upgradeV1_7_0: CompanionStaticUpgradeScript<Config> = (_context, props): CompanionStaticUpgradeResult<Config> => {
    const currentConfig = props.config
    const changes: CompanionStaticUpgradeResult<Config> = {
      updatedConfig: null,
      updatedActions: [],
      updatedFeedbacks: [],
    }

    if (!currentConfig) return changes

    changes.updatedConfig = { ...currentConfig }
    changes.updatedConfig.referenceIndexVariables = changes.updatedConfig.referenceIndex

    return changes
  }

  return [upgradeV1_7_0]
}
