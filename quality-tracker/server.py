"""FXN HT Quality Tracker - local server.

Serves the tracker page at http://localhost:8080 and keeps tickets in
data/tickets.json, the SCAR/RCA report list in data/reports.json and every
uploaded file in data/uploads/, next to this file. Nothing is sent over the
internet. Needs Python 3.8+ and no extra packages.

PowerPoint to PDF conversion uses Microsoft PowerPoint on Windows, or
LibreOffice on any system, if one of them is installed on this computer.

    python server.py              only this computer can open the tracker
    python server.py --port 9000  use another port
    python server.py --lan        let other computers on your network open it too
"""

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
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
COLLECTIONS = {
    "tickets": os.path.join(DATA_DIR, "tickets.json"),
    "reports": os.path.join(DATA_DIR, "reports.json"),
}
MAX_UPLOAD = 50 * 1024 * 1024
MAX_DOC = 2 * 1024 * 1024
CONVERT_TIMEOUT = 300
ID_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
INLINE_TYPES = ("image/", "application/pdf", "text/plain", "video/")
CONVERTIBLE = (".pptx", ".ppt")

lock = threading.Lock()
convert_lock = threading.Lock()  # PowerPoint handles one conversion at a time


def load(name):
    path = COLLECTIONS[name]
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    return {r["id"]: r for r in rows if isinstance(r, dict) and r.get("id")}


def save(name, docs):
    # Write to a temp file, then swap it in, so a crash never leaves a half-written file.
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(sorted(docs.values(), key=lambda d: (d.get("no") or 0, d.get("addedAt") or "")), f, indent=1, ensure_ascii=False)
    os.replace(tmp, COLLECTIONS[name])


def daily_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for name, path in COLLECTIONS.items():
        target = os.path.join(BACKUP_DIR, "%s-%s.json" % (name, time.strftime("%Y-%m-%d")))
        if os.path.exists(path) and not os.path.exists(target):
            shutil.copy2(path, target)


def safe_name(name):
    name = os.path.basename(name or "file").strip()
    name = re.sub(r"[^\w.\- ()]+", "_", name)[:120]
    return name or "file"


# ---- PowerPoint -> PDF ----
POWERSHELL_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($env:QT_IN, -1, 0, 0)
  $pres.SaveAs($env:QT_OUT, 32)
  $pres.Close()
} finally {
  if ($app.Presentations.Count -eq 0) { $app.Quit() }
}
"""


def find_libreoffice():
    for name in ("soffice", "libreoffice"):
        found = shutil.which(name)
        if found:
            return found
    candidates = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]
    return next((c for c in candidates if os.path.exists(c)), None)


def converters():
    out = []
    if os.name == "nt" and shutil.which("powershell"):
        out.append("PowerPoint")
    if find_libreoffice():
        out.append("LibreOffice")
    return out


def convert_to_pdf(src):
    """Convert src (a .ppt/.pptx in UPLOAD_DIR) to a PDF next to it. Returns the PDF path."""
    stem = os.path.splitext(src)[0]
    dst = stem + ".pdf"
    errors = []
    with convert_lock:
        if os.name == "nt" and shutil.which("powershell"):
            env = dict(os.environ, QT_IN=src, QT_OUT=dst)
            try:
                r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", POWERSHELL_SCRIPT],
                                   env=env, capture_output=True, text=True, timeout=CONVERT_TIMEOUT)
                if os.path.exists(dst):
                    return dst
                errors.append("PowerPoint: " + (r.stderr.strip().splitlines() or ["no PDF was produced"])[-1])
            except subprocess.TimeoutExpired:
                errors.append("PowerPoint took too long")
        office = find_libreoffice()
        if office:
            with tempfile.TemporaryDirectory() as outdir, tempfile.TemporaryDirectory() as profile:
                try:
                    subprocess.run([office, "-env:UserInstallation=file:///" + profile.replace("\\", "/").lstrip("/"),
                                    "--headless", "--convert-to", "pdf", "--outdir", outdir, src],
                                   capture_output=True, text=True, timeout=CONVERT_TIMEOUT)
                except subprocess.TimeoutExpired:
                    errors.append("LibreOffice took too long")
                made = glob.glob(os.path.join(outdir, "*.pdf"))
                if made:
                    shutil.move(made[0], dst)
                    return dst
                errors.append("LibreOffice produced no PDF")
    if not errors:
        raise RuntimeError("Converting needs Microsoft PowerPoint (Windows) or LibreOffice installed on the computer running the tracker.")
    raise RuntimeError("Couldn't convert: " + "; ".join(errors))


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

    def doc_route(self):
        m = re.fullmatch(r"/api/(tickets|reports)/([^/]+)", self.route())
        if not m:
            return None, None
        return m.group(1), unquote(m.group(2))

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if not self.route().startswith("/api/"):
            # Always check for a newer page after the tracker files are updated.
            self.send_header("Cache-Control", "no-cache")
        if getattr(self, "force_download", False):
            self.send_header("Content-Disposition", "attachment")
        super().end_headers()

    # ---- GET ----
    def do_GET(self):
        path = self.route()
        if path in ("/api/tickets", "/api/reports"):
            with lock:
                docs = load(path.rsplit("/", 1)[1])
            return self.send_json(list(docs.values()))
        if path == "/api/status":
            return self.send_json({"converters": converters()})
        # Only the page, its vendor files and uploaded files are served.
        if path.startswith("/data/") and not path.startswith("/data/uploads/"):
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        if path.endswith((".py", ".bat", ".sh")):
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        return super().do_GET()

    def send_head(self):
        # Uploaded files that aren't images, PDFs, text or video download instead of opening in the browser.
        self.force_download = self.route().startswith("/data/uploads/") and \
            not self.guess_type(self.translate_path(self.path)).startswith(INLINE_TYPES)
        return super().send_head()

    # ---- PUT / POST / DELETE ----
    def do_PUT(self):
        name, did = self.doc_route()
        if not name:
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        if not ID_RE.match(did):
            return self.error_json(HTTPStatus.BAD_REQUEST, "Bad id")
        raw = self.read_body(MAX_DOC)
        if raw is None:
            return self.error_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Entry is too large")
        try:
            doc = json.loads(raw.decode("utf-8"))
            assert isinstance(doc, dict)
        except Exception:
            return self.error_json(HTTPStatus.BAD_REQUEST, "Entry must be a JSON object")
        doc["id"] = did
        with lock:
            docs = load(name)
            docs[did] = doc
            save(name, docs)
        self.send_json(doc)

    def do_DELETE(self):
        name, did = self.doc_route()
        if not name:
            return self.error_json(HTTPStatus.NOT_FOUND, "Not found")
        with lock:
            docs = load(name)
            if docs.pop(did, None) is not None:
                save(name, docs)
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_POST(self):
        path = self.route()
        if path == "/api/uploads":
            raw = self.read_body(MAX_UPLOAD)
            if raw is None:
                return self.error_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "File is over 50 MB")
            name = safe_name(unquote(self.headers.get("X-Filename") or "file"))
            stored = "%s-%s" % (uuid.uuid4().hex[:8], name)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(os.path.join(UPLOAD_DIR, stored), "wb") as f:
                f.write(raw)
            return self.send_json({"url": "data/uploads/" + stored, "name": name, "size": len(raw)})
        if path == "/api/convert":
            raw = self.read_body(10_000)
            try:
                url = json.loads(raw.decode("utf-8"))["url"]
            except Exception:
                return self.error_json(HTTPStatus.BAD_REQUEST, "Send the uploaded file's url")
            src = os.path.realpath(os.path.join(APP_DIR, unquote(url)))
            if os.path.dirname(src) != os.path.realpath(UPLOAD_DIR) or not os.path.isfile(src):
                return self.error_json(HTTPStatus.NOT_FOUND, "That file isn't in the tracker's uploads")
            if not src.lower().endswith(CONVERTIBLE):
                return self.error_json(HTTPStatus.BAD_REQUEST, "Only PowerPoint files (.pptx, .ppt) can be converted")
            try:
                pdf = convert_to_pdf(src)
            except RuntimeError as e:
                return self.error_json(HTTPStatus.SERVICE_UNAVAILABLE, str(e))
            name = os.path.basename(pdf)
            return self.send_json({"url": "data/uploads/" + name, "name": re.sub(r"^[0-9a-f]{8}-", "", name), "size": os.path.getsize(pdf)})
        return self.error_json(HTTPStatus.NOT_FOUND, "Not found")


def main():
    ap = argparse.ArgumentParser(description="FXN HT Quality Tracker local server")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    ap.add_argument("--lan", action="store_true", help="allow other computers on this network to connect")
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser window")
    args = ap.parse_args()

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with lock:
        if not os.path.exists(COLLECTIONS["tickets"]):
            save("tickets", {})
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
    print("Data folder: %s" % DATA_DIR)
    found = converters()
    print("PowerPoint to PDF: " + (", ".join(found) if found else "not available (install Microsoft PowerPoint or LibreOffice)"))
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
