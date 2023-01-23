import GoogleSheetsInstance from './index'
import { ActionCallbacks } from './actions'
import { FeedbackCallbacks } from './feedback'
import { CompanionAlignment, CompanionButtonPresetOptions, CompanionPresetDefinitions } from '@companion-module/base'

type PresetCategory = ''

export interface GoogleSheetPreset {
	type: 'button'
	category: PresetCategory
	name: string
	options?: CompanionButtonPresetOptions
	style: {
		alignment?: CompanionAlignment
		bgcolor: number
		color: number
		pngalignment?: CompanionAlignment
		size: 'auto' | '7' | '14' | '18' | '24' | '30' | '44'
		text: string
	}
	actions: ActionCallbacks[]
	release_actions?: ActionCallbacks[]
	feedbacks: FeedbackCallbacks[]
}

export function getPresets(_instance: GoogleSheetsInstance): CompanionPresetDefinitions {
	const presets: GoogleSheetPreset[] = []

	return presets as unknown as CompanionPresetDefinitions
}
