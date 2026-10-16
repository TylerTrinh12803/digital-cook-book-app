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

## Incoming damage trend

The **Incoming damage** tab charts the damaged CP Rivet, CP TIM, CX8, Busbar, Tray and Paddle board
units checked in each day, one chart per part, with a 3-day average and a falling / rising verdict.
Click **Import check-in log** and pick the Check-in workbook (it reads the CHECK-IN LOG sheet).
Import it again whenever the workbook is updated: days already in the tracker are refreshed, new days are added.

## Update to a newer version

Unzip the new version over this folder and replace the files when asked. Your `data/` folder is not in
the update, so tickets, uploads and the check-in log stay as they are. Then close the start window and start it again.

## Where things are saved

| What | Where |
|---|---|
| Tickets | `data/tickets.json` |
| Check-in log (damage trend) | `data/checkin.json` |
| Uploaded reports, images | `data/uploads/` |
| One copy of the tickets per day | `data/backups/` |

To back up or move the tracker, copy the whole folder. **Export Excel** also saves the current list as a spreadsheet.

## Let teammates open it

By default only the computer running it can open the tracker. To let others on the same office
network use it, start it with `start-windows.bat --lan` (or `sh start-mac-linux.sh --lan`) and have them
open `http://<this computer's IP address>:8080`. There is no login, so anyone on that network can edit tickets.

Other options: `--port 9000` to use another port, `--no-browser` to skip opening the browser.
