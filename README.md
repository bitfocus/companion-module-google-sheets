# Companion Module - Google Sheets

Module to handle the OAuth process for getting/setting data from Google Sheets and making accessible sheet cell values as Variables.

# Sponsors

This module, like Companion, will always be free and open source. Sponsorship helps make continued development and maintenance possible, not just for this module, but also for projects such as vMix, Google Sheets, Twitch, Discord, and more.

If you'd like to support my work, you can sponsor me on [GitHub](https://github.com/sponsors/thedist), buy me a coffee on [Ko-fi](https://ko-fi.com/thedist), or subscribe on [Twitch](https://www.twitch.tv/subs/dist).


# HTTP API
This module now supports Companions HTTP API, providing endpoints that can be used by 3rd party applications, for example as a Data Source in vMix. Information on the API endpoints is available in [docs/HTTP_API.md](./docs/HTTP_API.md)


# Recent Patches
**v2.0.0**
- Updated for Companion API v2, allowing support for Expressions directly in most action/feedback options

**v1.7.0**
- Added separate config options for Action/Feedback options and Variables for referencing by index instead of ID
- Fixed an issue with parsing spreadsheet IDs
- Added caching for Action/Feedback definitions to reduce updates being sent from Module to Companion Core

**v1.6.0**
- Added `Clear Sheet` and `Delete Rows or Columns` actions
- Fixed an crash relating to hitting the Google Rate Limit
- Updated Variable logic to delete variables for cells that no longer exist (such as when deleting the last row/column)

**v1.5.0**
- Updated to Node 22, replaced Got dependency with Fetch



# License
See [LICENSE](./LICENSE)
