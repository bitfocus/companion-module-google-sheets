# companion-module-google-sheets



# HTTP API
This module now supports Companions HTTP API, providing endpoints that can be used by 3rd party applications, for example as a Data Source in vMix. Information on the API endpoints is available in [docs/HTTP_API.md](./docs/HTTP_API.md)


# Sponsorship
If this module, or the others I work on such as vMix, Twitch, Discord, Google Sheets, or any of the tools I make publicly available, have been of benefit to your work in some way then please
considering supporting the continued development of these modules by sponsoring me on GitHub https://github.com/sponsors/thedist/

# Recent Patches
**V1.2.0**
- Added config option to clear any existing Access/Refresh tokens
- Added an example variable for sheets that are empty
- Added config option to reference Spreadsheets by Index rather than ID. This allows adjusting the spreadsheet all actions/feedbacks/variables reference by adjusting the order of Spreadsheet ID's in the config
- Added Not Equal `!=` option to Cell Value feedback comparison
- Added variable suggestions to certain action/feedback fields
- Fixed an issue with Google's API parsing a sheet title as a cell for the default sheet
- Added sponsor links on [Github](https://github.com/sponsors/thedist) and [Ko-Fi](https://ko-fi.com/thedist) for those who have asked to tip me for this continued development work.

**V1.1.1**
- Fixed an issue with Cell Value feedback
- Added support for variables in actions and feedbacks

**V1.1.0**
- Added CSV formatting for the HTTP endpoint

**V1.0.2**
- Fixed increase/decrease action failing when the sheet name has added single quotes by Google due to its name.
- Fixed a crashed caused by a valueRange not having any values


# License
See [LICENSE](./LICENSE)
