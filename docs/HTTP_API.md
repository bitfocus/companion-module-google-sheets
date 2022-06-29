# HTTP API
Companion acts as a HTTP server, and can pass requests to specific modules using the `/instance/LABEL/` path, where the `LABEL` is whatever you name the instance. For example, if Companion is running on `http://localhost:8000/`, and you're running an instance of the Google Sheets module with the label `sheets` you could make requests to `http://localhost:8000/instance/sheets/ENDPOINT`, where `ENDPOINT` is one of the API endpoints listed below.

Some endpoints, such as Get Inputs, and Get Timers can be particularly useful as data sources in sheets itself, and because it's served from Companion itself it is fast and performant and so the recommended polling interval for these endpoints is 100ms, where as other endpoints such as Get Gynamics and Get Transitions aren't frequently changing so if you were to include them as a Data Source they can be polled less frequently.

## Get Spreadsheet
Returns Sheet values
<br>GET /instance/LABEL/spreadsheet

### Required Query Parameters
|    Param    |  Default  | Description |
| ----------- | --------- | ----------- |
| id  | "" | Spreadsheet ID |
| sheet  | "" | Sheet Name |


### Optional Query Parameters
None


<br>

## Get Spreadsheets
Returns Array of spreadsheets, including their IDs, Titles, and the links for individual sheets
<br>GET /instance/LABEL/spreadsheets

### Required Query Parameters
None

### Optional Query Parameters
None


<br>
