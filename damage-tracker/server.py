"""FXN HT Incoming Damage - local server.

Serves the damage trend page at http://localhost:8081 and keeps the imported
check-in log in data/checkin.json next to this file. Nothing is sent over the
internet. Needs Python 3.8+ and no extra packages.

    python server.py              only this computer can open the app
    python server.py --port 9001  use another port
    python server.py --lan        let other computers on your network open it too
"""

import argparse
import json
import os
import shutil
import tempfile
import threading
import time
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
CHECKIN_FILE = os.path.join(DATA_DIR, "checkin.json")
MAX_BODY = 5 * 1024 * 1024

lock = threading.Lock()


def load_checkin():
    if not os.path.exists(CHECKIN_FILE):
        return {"rows": []}
    with open(CHECKIN_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_checkin(data):
    # Write to a temp file, then swap it in, so a crash never leaves a half-written file.
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    os.replace(tmp, CHECKIN_FILE)


def daily_backup():
    if not os.path.exists(CHECKIN_FILE):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    target = os.path.join(BACKUP_DIR, "checkin-%s.json" % time.strftime("%Y-%m-%d"))
    if not os.path.exists(target):
        shutil.copy2(CHECKIN_FILE, target)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # Only log changes; page loads and the page's 8-second refresh stay quiet.
        if self.command != "GET":
            super().log_message(fmt, *args)

    def route(self):
        return urlparse(self.path).path

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if not self.route().startswith("/api/"):
            # Always check for a newer page after the app files are updated.
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, obj, status=HTTPStatus.OK):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def error_json(self, status, message):
        self.send_json({"error": message}, status)

    def do_GET(self):
        path = self.route()
        if path == "/api/checkin":
            with lock:
                return self.send_json(load_checkin())
        # Only the page and its vendor files are served.
        if path.startswith("/data/") or path.endswith((".py", ".bat", ".sh")):
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        return super().do_GET()

    def do_PUT(self):
        if self.route() != "/api/checkin":
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self.error_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Check-in log is too large")
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            assert isinstance(data, dict) and isinstance(data.get("rows"), list)
        except Exception:
            return self.error_json(HTTPStatus.BAD_REQUEST, "Check-in log must be a JSON object with a rows list")
        with lock:
            save_checkin(data)
        self.send_json(data)


def main():
    ap = argparse.ArgumentParser(description="FXN HT Incoming Damage local server")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8081)))
    ap.add_argument("--lan", action="store_true", help="allow other computers on this network to connect")
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser window")
    args = ap.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    with lock:
        daily_backup()

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    try:
        server = ThreadingHTTPServer((host, args.port), Handler)
    except OSError:
        print("Port %d is already in use. If the app is already running, open http://localhost:%d" % (args.port, args.port))
        print("Otherwise start it on another port:  python server.py --port 8091")
        raise SystemExit(1)

    url = "http://localhost:%d" % args.port
    print("FXN HT Incoming Damage is running at %s" % url)
    print("Check-in log: %s" % CHECKIN_FILE)
    if args.lan:
        print("LAN mode: other computers on this network can open http://<this computer's IP>:%d" % args.port)
    print("Keep this window open while you use the app. Press Ctrl+C to stop.")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
