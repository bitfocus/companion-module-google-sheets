import GoogleSheetsInstance from './index'
import { ActionCallbacks } from './actions'
import { FeedbackCallbacks } from './feedback'
import { CompanionAlignment } from '../../../instance_skel_types'

type PresetCategory = ''

export interface GoogleSheetPreset {
	category: PresetCategory
	label: string
	bank: {
		alignment?: CompanionAlignment
		bgcolor: number
		color: number
		pngalignment?: CompanionAlignment
		size: 'auto' | '7' | '14' | '18' | '24' | '30' | '44'
		style: 'text'
		text: string
	}
	actions: ActionCallbacks[]
	release_actions?: ActionCallbacks[]
	feedbacks: FeedbackCallbacks[]
}

export function getPresets(_instance: GoogleSheetsInstance): GoogleSheetPreset[] {
	const presets: GoogleSheetPreset[] = []

	return presets
}
