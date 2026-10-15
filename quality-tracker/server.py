"""FXN HT Quality Tracker - local server.

Serves the tracker page at http://localhost:8080 and keeps every ticket in
data/tickets.json and every uploaded report in data/uploads/, next to this file.
Nothing is sent over the internet. Needs Python 3.8+ and no extra packages.

    python server.py              only this computer can open the tracker
    python server.py --port 9000  use another port
    python server.py --lan        let other computers on your network open it too
"""

import argparse
import json
import os
import re
import shutil
import tempfile
import threading
import time
import uuid
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
TICKETS_FILE = os.path.join(DATA_DIR, "tickets.json")
MAX_UPLOAD = 50 * 1024 * 1024
MAX_TICKET = 2 * 1024 * 1024
ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
INLINE_TYPES = ("image/", "application/pdf", "text/plain", "video/")

lock = threading.Lock()


def load_tickets():
    if not os.path.exists(TICKETS_FILE):
        return {}
    with open(TICKETS_FILE, encoding="utf-8") as f:
        rows = json.load(f)
    return {t["id"]: t for t in rows if isinstance(t, dict) and t.get("id")}


def save_tickets(tickets):
    # Write to a temp file, then swap it in, so a crash never leaves a half-written file.
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(sorted(tickets.values(), key=lambda t: t.get("no") or 0), f, indent=1, ensure_ascii=False)
    os.replace(tmp, TICKETS_FILE)


def daily_backup():
    if not os.path.exists(TICKETS_FILE):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    target = os.path.join(BACKUP_DIR, "tickets-%s.json" % time.strftime("%Y-%m-%d"))
    if not os.path.exists(target):
        shutil.copy2(TICKETS_FILE, target)


def safe_name(name):
    name = os.path.basename(name or "file").strip()
    name = re.sub(r"[^\w.\- ()]+", "_", name)[:120]
    return name or "file"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # Only log changes; page loads and the page's 8-second refresh stay quiet.
        if self.command != "GET":
            super().log_message(fmt, *args)

    # ---- helpers ----
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

    def read_body(self, limit):
        length = int(self.headers.get("Content-Length") or 0)
        if length > limit:
            return None
        return self.rfile.read(length)

    def route(self):
        return urlparse(self.path).path

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if getattr(self, "force_download", False):
            self.send_header("Content-Disposition", "attachment")
        super().end_headers()

    # ---- GET ----
    def do_GET(self):
        path = self.route()
        if path == "/api/tickets":
            with lock:
                tickets = load_tickets()
            return self.send_json(list(tickets.values()))
        # Only the page, its vendor files and uploaded reports are served.
        if path.startswith("/data/") and not path.startswith("/data/uploads/"):
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        if path.endswith(".py") or path.endswith(".bat") or path.endswith(".sh"):
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        return super().do_GET()

    def send_head(self):
        # Uploaded files that aren't images, PDFs, text or video download instead of opening in the browser.
        self.force_download = self.route().startswith("/data/uploads/") and \
            not self.guess_type(self.translate_path(self.path)).startswith(INLINE_TYPES)
        return super().send_head()

    # ---- PUT / POST / DELETE ----
    def do_PUT(self):
        path = self.route()
        m = re.fullmatch(r"/api/tickets/([^/]+)", path)
        if not m:
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        tid = unquote(m.group(1))
        if not ID_RE.match(tid):
            return self.error_json(HTTPStatus.BAD_REQUEST, "Bad ticket id")
        raw = self.read_body(MAX_TICKET)
        if raw is None:
            return self.error_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Ticket is too large")
        try:
            ticket = json.loads(raw.decode("utf-8"))
            assert isinstance(ticket, dict)
        except Exception:
            return self.error_json(HTTPStatus.BAD_REQUEST, "Ticket must be a JSON object")
        ticket["id"] = tid
        with lock:
            tickets = load_tickets()
            tickets[tid] = ticket
            save_tickets(tickets)
        self.send_json(ticket)

    def do_DELETE(self):
        m = re.fullmatch(r"/api/tickets/([^/]+)", self.route())
        if not m:
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        tid = unquote(m.group(1))
        with lock:
            tickets = load_tickets()
            if tickets.pop(tid, None) is not None:
                save_tickets(tickets)
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_POST(self):
        if self.route() != "/api/uploads":
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        raw = self.read_body(MAX_UPLOAD)
        if raw is None:
            return self.error_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "File is over 50 MB")
        name = safe_name(unquote(self.headers.get("X-Filename") or "file"))
        stored = "%s-%s" % (uuid.uuid4().hex[:8], name)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(UPLOAD_DIR, stored), "wb") as f:
            f.write(raw)
        self.send_json({"url": "data/uploads/" + stored, "name": name, "size": len(raw)})


def main():
    ap = argparse.ArgumentParser(description="FXN HT Quality Tracker local server")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    ap.add_argument("--lan", action="store_true", help="allow other computers on this network to connect")
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser window")
    args = ap.parse_args()

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with lock:
        if not os.path.exists(TICKETS_FILE):
            save_tickets({})
        daily_backup()

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    try:
        server = ThreadingHTTPServer((host, args.port), Handler)
    except OSError:
        print("Port %d is already in use. If the tracker is already running, open http://localhost:%d" % (args.port, args.port))
        print("Otherwise start it on another port:  python server.py --port 8090")
        raise SystemExit(1)

    url = "http://localhost:%d" % args.port
    print("FXN HT Quality Tracker is running at %s" % url)
    print("Tickets: %s" % TICKETS_FILE)
    if args.lan:
        print("LAN mode: other computers on this network can open http://<this computer's IP>:%d" % args.port)
    print("Keep this window open while you use the tracker. Press Ctrl+C to stop.")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
