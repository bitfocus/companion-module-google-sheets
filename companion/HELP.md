# Sponsors

This module, like Companion, will always be free and open source. Sponsorship helps make continued development and maintenance possible, not just for this module, but also for projects such as vMix, Google Sheets, Twitch, Discord, and more.

If you'd like to support my work, you can sponsor me on [GitHub](https://github.com/sponsors/thedist), buy me a coffee on [Ko-fi](https://ko-fi.com/thedist), or subscribe on [Twitch](https://www.twitch.tv/subs/dist).


**Google Sheets**<br />
If there are any feature requests, or bug reports, please post them on https://github.com/bitfocus/companion-module-google-sheets/issues

To authenticate with Google so that the module has the ability to read/write to your Google Sheets please follow the step-by-step instructions in the connections config. Whilst this type of authentication is not the most user friendly or convenient due to Googles lack of more appropriate authentication methods for client-side only apps (such as DCF), it provides the security all of your credentials and access to your Google Sheets is entirely handled within the machine you have Companion running on and does not require an external entity such as Bitfocus or any Companion developers to handle your credentials or data at any point.

Due to every single cell having an associated variable within Companion it's not viable to have them all listed in the Variables list as this could potentially be hundreds of thousands, maybe even millions, of variables which would be unwieldly. To handle this, each sheet of every spreadsheet will have the variable listed for cell A1, this can then me used as a template where you change A1 to whatever cell you wish to get data from as while these other cells may not show in the variable list there will be data for them.

**Variable IDs**<br />
In most cases variables for cells will take the form of `$(label:SPREADSHEET_SHEET!CELL)`. So for example if you name your connection to Google Sheets in Companion `sheets`, and you have a Spreadsheet named `tournament`, and that has a sheet inside it called `players`, then you could access A1 with `$(sheets:tournament_players!A1)`, or any other cell using similar naming (the variable list just shows A1 for each sheet as listing potentially tens/hundreds of thousands of cells would slow performance, but they are all available to be utilized).

One key thing to note is that Companion has strict naming requirements when it comes to variables, as such spaces in sheet names will be replaced by an underscore `_`, and other special characters may be omitted entirely, so it is recommended when designing your Google Sheet that you follow common best practices and avoid using special characters entirely in both Spreadsheet and sheet names.

**Data Source**<br />
This module can act as a Data Source for other services, such as vMix, by acting as a HTTP server. The benefit of this is that unfortunately vMix's native integration with Google Sheets is improper and burns through ratelimit needlessly resulting in slower polling and more frequently 429 ratelimit exceeded errors, where as by using this module as a data source you can poll more frequently and have vMix (or other app) poll this module rather than Google.

You can find the full list of endpoints at `http://Companion IP:PORT/instance/NAME/spreadsheets`, so if you're running Companion in 127.0.0.1:8000, and you've named the connection 'sheets' you would use `http://127.0.0.1:8000/instance/sheets/spreadsheets` and that will provide a full list of individual sheets that can polled and provides either JSON or CSV.
