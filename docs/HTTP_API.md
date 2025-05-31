# HTTP API
Companion acts as a HTTP server, and can pass requests to specific modules using the `/instance/LABEL/` path, where the `LABEL` is whatever you name the instance. For example, if Companion is running on `http://localhost:8000/`, and you're running an instance of the Google Sheets module with the label `sheets` you could make requests to `http://localhost:8000/instance/sheets/ENDPOINT`, where `ENDPOINT` is one of the API endpoints listed below.

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
