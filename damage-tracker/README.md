# FXN HT Incoming Damage (local)

Charts the damaged CP Rivet, CP TIM, CX8, Busbar, Tray and Paddle board units checked in each day,
so you can see whether damaged boards coming in are going down. One chart per part, each on its own
scale, with a 3-day average and a falling / rising verdict.

Runs on your own computer. Nothing goes on the internet: the page, chart library, Excel reader and
fonts are all in this folder, and the log is saved in `data/` next to these files.
It is separate from the FXN HT Quality Tracker and runs on its own port (8081), so both can be open at once.

## Start it

1. Install Python 3 if the computer doesn't have it: https://www.python.org/downloads/
   (on Windows, tick **Add python.exe to PATH** during install).
2. Double-click **start-windows.bat** (Windows) or run `sh start-mac-linux.sh` in Terminal (Mac / Linux).
3. Your browser opens **http://localhost:8081**. Keep the start window open while you use it;
   close it (or press Ctrl+C) to stop the app.

## Load and update the data

Click **Import check-in log** and pick the Check-in workbook. The app reads its CHECK-IN LOG sheet:
one row per day, one column per part. Import it again whenever the workbook is updated. Days already
in the app are refreshed and new days are added.

## How the trend is worked out

For each part, the logged days in the chosen range (all days, last 2 weeks or last week) are split in
half. The average per day of the later half is compared with the earlier half: 15% or more lower is
**Falling**, 15% or more higher is **Rising**, anything in between is **Flat**. A part needs at least
4 logged days for a verdict. Blank cells in the log are left out, not counted as zero.

## Where things are saved

| What | Where |
|---|---|
| Check-in log | `data/checkin.json` |
| One copy per day | `data/backups/` |

To update the app, unzip a newer version over this folder; `data/` is not in the update, so your log stays.

## Let teammates open it

Start it with `start-windows.bat --lan` (or `sh start-mac-linux.sh --lan`) and have others on the same
office network open `http://<this computer's IP address>:8081`. There is no login, so anyone on that
network can re-import the log. Other options: `--port 9001`, `--no-browser`.
