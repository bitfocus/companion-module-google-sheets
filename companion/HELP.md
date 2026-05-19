**Sponsor**<br />
This module, as with Companion, is free and open source, but if you'd like to support the continued development of this and my other modules (vMix, Google Sheets, Twitch, Discord, Voicemeeter, and more) tips will always be appreciated either on [Github](https://github.com/sponsors/thedist), [Ko-Fi](https://ko-fi.com/thedist), or Subscribe to me on Twitch [https://www.twitch.tv/subs/dist](https://www.twitch.tv/subs/dist).


**Google Sheets**<br />
If there are any feature requests, or bug reports, please post them on https://github.com/bitfocus/companion-module-google-sheets/issues

To authenticate with Google so that the module has the ability to read/write to your Google Sheets please follow the step-by-step instructions in the connections config. Whilst this type of authentication is not the most user friendly or convenient due to Googles lack of more appropriate authentication methods for client-side only apps (such as DCF), it provides the security all of your credentials and access to your Google Sheets is entirely handled within the machine you have Companion running on and does not require an external entity such as Bitfocus or any Companion developers to handle your credentials or data at any point.

Due to every single cell having an associated variable within Companion it's not viable to have them all listed in the Variables list as this could potentially be hundreds of thousands, maybe even millions, of variables which would be unwieldly. To handle this, each sheet of every spreadsheet will have the variable listed for cell A1, this can then me used as a template where you change A1 to whatever cell you wish to get data from as while these other cells may not show in the variable list there will be data for them.

**Data Source**<br />
This module can act as a Data Source for other services, such as vMix, by acting as a HTTP server. The benefit of this is that unfortunately vMix's native integration with Google Sheets is improper and burns through ratelimit needlessly resulting in slower polling and more frequently 429 ratelimit exceeded errors, where as by using this module as a data source you can poll more frequently and have vMix (or other app) poll this module rather than Google.

You can find the full list of endpoints at `http://Companion IP:PORT/instance/NAME/spreadsheets`, so if you're running Companion in 127.0.0.1:8000, and you've named the connection 'sheets' you would use `http://127.0.0.1:8000/instance/sheets/spreadsheets` and that will provide a full list of individual sheets that can polled and provides either JSON or CSV.
