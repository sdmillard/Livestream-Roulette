"""Loopback server for the Windows controls and wallpaper."""

import argparse
from collections import deque
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/stream-rules.mjs": ("stream-rules.mjs", "text/javascript; charset=utf-8"),
    "/companion.mjs": ("companion.mjs", "text/javascript; charset=utf-8"),
}
ACTIONS = {"next", "previous", "hold", "play"}


class CompanionServer(HTTPServer):
    def __init__(self, port, settings_path):
        super().__init__(("127.0.0.1", port), Handler)
        self.hostname = f"127.0.0.1:{self.server_port}"
        self.settings_path = settings_path
        self.settings = None
        if settings_path.exists():
            self.settings = json.loads(settings_path.read_text(encoding="utf-8"))
        self.epoch = uuid4().hex
        self.commands = deque(maxlen=64)
        self.sequence = 0
        self.status = None

    def save(self, settings):
        self.settings_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.settings_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(settings), encoding="utf-8")
        temporary.replace(self.settings_path)
        self.settings = settings


class Handler(BaseHTTPRequestHandler):
    timeout = 3

    def log_request(self, code="-", size="-"):
        if self.path != "/api/session" or code != 200:
            super().log_request(code, size)

    def respond(self, code, body, content_type="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def reply(self, code, payload):
        self.respond(code, json.dumps(payload).encode())

    def do_GET(self):
        server = self.server
        if self.headers.get("Host") != server.hostname:
            self.reply(403, {"error": "Invalid host"})
            return
        path = urlsplit(self.path).path
        if path == "/api/session":
            self.reply(200, {"settings": server.settings, "epoch": server.epoch,
                             "commands": list(server.commands), "status": server.status})
        elif path in ASSETS:
            filename, content_type = ASSETS[path]
            self.respond(200, (ROOT / filename).read_bytes(), content_type)
        else:
            self.reply(404, {"error": "Unknown path"})

    def do_POST(self):
        server = self.server
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 128 * 1024:
                raise ValueError()
            body = self.rfile.read(size)
        except (ValueError, TimeoutError):
            self.reply(400, {"error": "Invalid request body"})
            return
        if (self.headers.get("Host") != server.hostname
                or self.headers.get("Origin") != f"http://{server.hostname}"
                or self.headers.get_content_type() != "application/json"):
            self.reply(403, {"error": "Invalid origin or content type"})
            return
        try:
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            self.reply(400, {"error": "Invalid request body"})
            return

        if self.path == "/api/settings":
            streams = data.get("streams")
            enabled = data.get("enabled")
            if (not isinstance(streams, list) or not isinstance(enabled, list)
                    or not all(isinstance(stream, dict) for stream in streams)
                    or not all(isinstance(collection, str) for collection in enabled)):
                self.reply(400, {"error": "Invalid camera settings"})
                return
            try:
                server.save(data)
            except OSError:
                self.reply(500, {"error": "Could not save settings"})
                return
        elif self.path == "/api/command" and isinstance(data.get("action"), str) and data["action"] in ACTIONS:
            server.sequence += 1
            server.commands.append({"sequence": server.sequence, "action": data["action"],
                                    "id": data.get("id")})
        elif self.path == "/api/status":
            server.status = data
        else:
            self.reply(400, {"error": "Unknown command"})
            return
        self.reply(200, {"ok": True})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8768)
    default_path = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Livestream Roulette" / "settings.json"
    parser.add_argument("--settings", type=Path, default=default_path)
    args = parser.parse_args()
    with CompanionServer(args.port, args.settings) as server:
        print(f"Livestream Roulette companion listening at http://{server.hostname}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
