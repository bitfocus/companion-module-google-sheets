import { SomeCompanionConfigField } from '../../../instance_skel_types'

export interface Config {
	//
	clientID: string
	clientSecret: string
	redirectURI: string
	code: string
	sheetIDs: string
	pollInterval: number

	accessToken?: string
	refreshToken?: string
}

export const getConfigFields = (): SomeCompanionConfigField[] => {
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: `This module is currently in early beta, and requires creating an App in Googles Cloud Platform to gain access to read/writing to Sheets.
				<br /><br />
        1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">https://console.cloud.google.com/apis/credentials</a>, click 'Create Credentials', and select 'OAuth client ID',
				(you may need to create a project if you have not done so previously).
				<br />
        2. Select 'Web Application' as the Application Type, and give the app a name.
        <br />
        3. In the 'Authorised redirect URIs' section add a redirect to a localhost URL that's not in use, such as "http://localhost:8001'.
        <br />
        4. Copy and paste the Client ID, and Client Secret, and Redirect URI, into the config below. Click save and a page to authorize accessing Google Sheets will open to continue the process
        <br />
				5. After visiting the URL, and authorizing the app, you'll be redirected to your Redirect URL. Copy the "code" parameter that's in the URL of the redirect and paste that in the "Code" config below.
				`,
		},
		{
			type: 'textinput',
			label: 'Client ID',
			id: 'clientID',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			label: 'Client Secret',
			id: 'clientSecret',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			label: 'Redirect URI',
			id: 'redirectURI',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			label: 'OAuth Code',
			id: 'code',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			label: 'Spreadsheet IDs (space separated)',
			id: 'sheetIDs',
			width: 12,
			default: '',
		},
		{
			type: 'text',
			id: 'pollIntervalText',
			width: 12,
			label: 'Polling Interval Info',
			value: `By default Google allows for 1 request per second, but interval may take more 1 or 2 requests per spreadsheet. 
			Because of this, it is recommended to set the interval to around 1.3 x number of spreadsheets to avoid hitting the rate limit (which will start an increase backoff timer if it occurs)`,
		},
		{
			type: 'number',
			label: 'API Poll Interval in Seconds',
			id: 'pollInterval',
			width: 12,
			default: 1.5,
			min: 0.1,
			max: 86400,
		},
	]
}
