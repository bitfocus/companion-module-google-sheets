# companion-module-google-sheets

# Sponsorship
If this module, or the others I work on such as vMix, Twitch, Discord, Google Sheets, or any of the tools I make publicly available, have been of benefit to your work in some way then please
considering supporting the continued development of these modules by sponsoring me on GitHub https://github.com/sponsors/thedist/


# HTTP API
This module now supports Companions HTTP API, providing endpoints that can be used by 3rd party applications, for example as a Data Source in vMix. Information on the API endpoints is available in [docs/HTTP_API.md](./docs/HTTP_API.md)



# Recent Patches
**v1.4.1**
- Fixed an issue with certain symbols in sheet names breaking API requests

**v1.4.0**
- Added `Add Sheet` and `Duplicate Sheet` actions
- Bumped dependency versions

**v1.3.1**
- Fixed bug related to Spreadsheet ID

**v1.3.0**
- Removed the dependency `Open`
- Replaced opening a browser tab for auth with linking back to a HTTP handler to redirect the user to the OAuth URL
- Minor typo fixes


# License
See [LICENSE](./LICENSE)
