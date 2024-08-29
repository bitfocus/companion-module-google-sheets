# companion-module-google-sheets



# HTTP API
This module now supports Companions HTTP API, providing endpoints that can be used by 3rd party applications, for example as a Data Source in vMix. Information on the API endpoints is available in [docs/HTTP_API.md](./docs/HTTP_API.md)


# Sponsorship
If this module, or the others I work on such as vMix, Twitch, Discord, Google Sheets, or any of the tools I make publicly available, have been of benefit to your work in some way then please
considering supporting the continued development of these modules by sponsoring me on GitHub https://github.com/sponsors/thedist/

# Recent Patches
**v1.4.0**
- Added `Add Sheet` and `Duplicate Sheet` actions
- Bumped dependency versions

**v1.3.1**
- Fixed bug related to Spreadsheet ID

**v1.3.0**
- Removed the dependency `Open`
- Replaced opening a browser tab for auth with linking back to a HTTP handler to redirect the user to the OAuth URL
- Minor typo fixes

**v1.2.0**
- Added config option to clear any existing Access/Refresh tokens
- Added an example variable for sheets that are empty
- Added config option to reference Spreadsheets by Index rather than ID. This allows adjusting the spreadsheet all actions/feedbacks/variables reference by adjusting the order of Spreadsheet ID's in the config
- Added Not Equal `!=` option to Cell Value feedback comparison
- Added variable suggestions to certain action/feedback fields
- Fixed an issue with Google's API parsing a sheet title as a cell for the default sheet
- Added sponsor links on [Github](https://github.com/sponsors/thedist) and [Ko-Fi](https://ko-fi.com/thedist) for those who have asked to tip me for this continued development work.


# License
See [LICENSE](./LICENSE)
