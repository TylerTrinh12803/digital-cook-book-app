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

## Progress per ticket

Every ticket shows a progress bar in the list (sort by the Progress column) and in its form under
Investigation & closure > Progress. SCAR tickets track as an **8D** and RCA / other tickets as an **RCA**;
switch with the 8D / RCA toggle in the ticket if needed.

| Tracked as | Work | Customer closure |
|---|---|---|
| 8D | Each of D1–D8 ticked adds 11.9% (95% for all eight) | NVIDIA approving closure adds the last 5% |
| RCA | RCA created = 85% | NVIDIA agreeing to close adds the last 15% |

The Excel export has a Progress column (with an in-cell bar) and a Progress detail column.

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
