# FXN HT Quality Tracker (local)

Runs on your own computer. Nothing goes on the internet: the page, chart library, Excel reader
and fonts are all in this folder, and tickets are saved in `data/` next to these files.

## Start it

1. Install Python 3 if the computer doesn't have it: https://www.python.org/downloads/
   (on Windows, tick **Add python.exe to PATH** during install).
2. Double-click **start-windows.bat** (Windows) or run `sh start-mac-linux.sh` in Terminal (Mac / Linux).
3. Your browser opens **http://localhost:8080**. Keep the black start window open while you work;
   close it (or press Ctrl+C) to stop the tracker.

If you got the zip, your issues from `FXN_HT_Quality_Issue_tracker` are already loaded.
To load them into an empty tracker, click **Import Excel** and pick the workbook.

## Quick status change

Click a ticket's status chip (in the ticket list or the Analysis boxes) to switch it between Open, Monitor and
Closed without opening the ticket. Closing fills in today's "Closed on" date if none is set; reopening clears it.

## Drafts and deleting

- **Save as draft** (in a new ticket) keeps an unfinished ticket without the required fields; it only needs a
  description. Drafts get no QI number and aren't counted anywhere official (summary tiles, charts, Analysis
  boxes, ticket list, reports tab or Excel export) until they're created.
- The **Drafts** section at the top of the Tickets tab lists them with how many required fields are left.
  **Continue** opens one; **Create ticket** checks the required fields and gives it the next QI number.
- **Delete ticket** (in a ticket), **Delete** (on a draft) and **Delete** (on a report) open an "are you sure?"
  window; the delete button only works after you tick the confirmation box. A copy of everything deleted is
  kept in `data/backups/deleted-tickets.json` (and `deleted-reports.json`).
- Drafts are kept when you replace all tickets from a new Excel sheet.

## Analysis

The Analysis tab is a one-page dashboard with two separate reports; switch with **SCAR / 8D** | **RCA** in the
blue header (which also shows the data period and total requests). Everything on the tab covers only that type.

- **SCAR / 8D report** ("8D Problem Solving Dashboard"): a D1–D8 strip showing how many SCARs have each D done.
- **RCA report** ("RCA One-Pager · Quick Fixes"): the same dashboard without a step strip.
- Summary tiles (total, open, monitor, closed, average progress, average per month, average age open).
- **Requests by status** (donut by ticket status: closed / in progress (Monitor) / open),
  **Requests by creator / requestor** (from the Reporter field) and **per month** (split by status, severity, or raised vs closed).
- **Open & in progress** (top 5, most urgent first), **Recently closed** (latest 5) and **Key insights** worked out from
  the data (share still open and the oldest item, busiest month, top requestor, overdue actions or open S0/S1 items).
- **Graphs: Dashboard | Pareto** (in the filter row, next to Product) swaps the three dashboard charts for a Pareto
  of root causes, sub-root causes or factory areas, in the same spot.

**Download slides (.pptx)** in the blue header saves one PowerPoint with both reports: slide 1 the SCAR / 8D
dashboard, slide 2 the RCA one-pager. Each slide has the header, D1–D8 strip (8D only), summary tiles, status /
requestor / per-month charts as editable PowerPoint charts, top-5 open and recently closed tables, and key insights.
The slides follow the current filters. The Pareto stays on the web page only.

## Share a demo copy

**Share demo (.html)** (next to Export Excel) saves the whole tracker as one HTML file, about 3 MB, with the
libraries, fonts and a copy of the current tickets built in. Anyone can open it by double-clicking (email, Teams,
shared drive): no install and no internet. It works like the real tracker, but every change stays in that
person's browser and never reaches your tracker; **Reset demo** goes back to the original copy. Uploaded
PowerPoints / PDFs aren't included (SharePoint links are). The file contains your ticket details, so only share it
with people who may see them.

For others to see and edit the real tickets live instead, run the tracker with `--lan` (see "Let teammates open it").

The filters apply to the dashboard. Click a row to open the ticket, a summary tile or **See all** to jump to those
tickets. **Export Excel** on the Analysis tab saves just that report (e.g. `FXN_HT_SCAR_8D_Report_<date>.xlsx`).
Tickets typed "Other" aren't in either report; set their type to SCAR or RCA to include them.

## Progress per ticket

Every ticket shows a progress bar in the list (sort by the Progress column) and in its form under
Investigation & closure > Progress. SCAR tickets track as an **8D** and RCA / other tickets as an **RCA**;
switch with the 8D / RCA toggle in the ticket if needed.

| Tracked as | Work | Customer closure |
|---|---|---|
| 8D | Each of D1–D8 ticked adds 11.9% (95% for all eight) | NVIDIA approving closure adds the last 5% |
| RCA | RCA created = 85% | NVIDIA agreeing to close adds the last 15% |

A ticket marked **Closed** always shows 100%. The checklist is kept, so a reopened ticket goes back to its real progress.

The Excel export has a Progress column (with an in-cell bar) and a Progress detail column.

## Overdue SCARs and RCAs

Each open SCAR or RCA has a clock on its next step. Ticking a D (or "RCA created" / the customer's approval) in a
ticket records the date, which you can edit to backfill; the clock for the next step runs from the latest of those
dates (or from the detected date if nothing is done yet).

- The **bell** in the header shows how many tickets are overdue; click it for the list (red: overdue, amber: due soon).
- The **Overdue** tab lists every overdue / due-soon SCAR (waiting on the next D) and RCA (waiting on the RCA or the
  customer's closure), with days since the last step, days allowed, and how late it is. Click a row to open the ticket.
- Overdue tickets get an "Overdue Nd" tag in the ticket list.
- **Overdue rules** (bottom of the Overdue tab) sets the days allowed. Defaults: D1 1, D2 2, D3 2, D4 7, D5 7, D6 14,
  D7 14, D8 7 days after the previous D; customer closure 14 days after D8; RCA created 14 days after detection;
  customer agrees to close 14 days after the RCA; "due soon" 2 days ahead. The rules are shared by everyone using the
  tracker (saved in `data/settings.json`).

D's ticked before dates were recorded count from the ticket's last save; open those tickets and fill in the real dates.

## Import a new Excel sheet

Click **Import Excel** and pick the workbook. The tracker reads the sheet with a "Quality issue description"
column and offers two choices:

- **Add new tickets**: adds only the issues that aren't in the tracker yet (matched on detected date and description).
- **Replace all tickets…**: clears the current tickets and loads the whole sheet instead. You confirm first, and
  the current tickets are backed up to `data/backups/tickets-before-replace-<date>.json`. With **Keep the team,
  actions…** ticked (the default), anything added in the tracker for tickets that are in both (team lead, members,
  containment and corrective actions, root cause details, uploaded PowerPoints, PDFs and photos) carries over, and
  reports in the SCAR / RCA reports tab stay linked to those tickets. Everything else comes from the new sheet.

To undo a replace, close the tracker, copy the backup over `data/tickets.json`, and start it again.

## SCAR / RCA reports and PDF

The **SCAR / RCA reports** tab lists every report in one place: PowerPoints and links you add there,
plus the reports attached to tickets. Use **Import PowerPoints** to add several .pptx files at once
(the SCAR number and type are guessed from the file name; check them with **Edit**), or **+ Add report**
for one report with a link, a PowerPoint or a PDF. Link a report to its ticket and it shows on the ticket too.

Each report becomes a PDF in two steps:

1. **Upload PowerPoint**: for a report that is a SharePoint link, download the PowerPoint from SharePoint and
   upload it into that report (in the reports tab, or on the ticket under Report). It's kept with the report;
   **Replace PowerPoint** swaps in a newer version.
2. **Download as PDF**: converts the PowerPoint and saves the PDF to your Downloads folder. After that the
   report (and its ticket) shows **Download PDF** to save it again, and **View** to open it in the browser.

A PowerPoint uploaded straight onto a ticket, or added with Import PowerPoints, skips step 1.

Conversion turns the PowerPoint into a PDF on this computer. It needs **Microsoft PowerPoint**
(Windows) or **LibreOffice** (free, any system) installed on the computer running the tracker; the start
window says which one it found. Restart the tracker after installing one.

## Export to Excel

**Export Excel** saves the tickets that match the current filters as a formatted workbook:

| Sheet | What's on it |
|---|---|
| Quality Issues | One row per ticket, grouped into Ticket / Issue / Investigation & closure, with filters on every column, frozen headers, color-coded severity and status, and days open in red past 30 days |
| Actions | One row per containment or permanent corrective action, with owner, due date, status and overdue flag |
| Team | One row per person per ticket (team lead or member), so long member lists stay tidy and you can filter by name |
| Reports | Every SCAR / RCA report with its link, PowerPoint and PDF |
| Summary | Counts by status, severity, type, factory area and root cause |

## Update to a newer version

Unzip the new version over this folder and replace the files when asked. Your `data/` folder is not in
the update, so tickets and uploads stay as they are. Then close the start window and start it again.

The daily damage trend is a separate app, **FXN HT Incoming Damage**, in its own folder (port 8081).

## Where things are saved

| What | Where |
|---|---|
| Tickets | `data/tickets.json` |
| SCAR / RCA report list | `data/reports.json` |
| Uploaded reports, PDFs, images | `data/uploads/` |
| One copy of tickets and reports per day | `data/backups/` |

To back up or move the tracker, copy the whole folder. **Export Excel** also saves the current list as a spreadsheet.

## Let teammates open it

By default only the computer running it can open the tracker. To let others on the same office
network use it, start it with `start-windows.bat --lan` (or `sh start-mac-linux.sh --lan`) and have them
open `http://<this computer's IP address>:8080`. There is no login, so anyone on that network can edit tickets.

Other options: `--port 9000` to use another port, `--no-browser` to skip opening the browser.
