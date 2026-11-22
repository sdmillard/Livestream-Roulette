import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from time import monotonic
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from companion_server import CompanionServer


class CompanionTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.settings_path = Path(self.directory.name) / "settings.json"
        self.server = CompanionServer(0, self.settings_path)
        self.addCleanup(self.server.server_close)
        self.thread = Thread(target=self.server.serve_forever)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.origin = f"http://{self.server.hostname}"

    def stop_server(self):
        self.server.shutdown()
        self.thread.join()

    def request(self, path, payload=None, origin=None, headers=None):
        fields = headers or {}
        data = None
        if payload is not None:
            fields = {**fields, "Content-Type": "application/json",
                      "Origin": self.origin if origin is None else origin}
            data = json.dumps(payload).encode()
        with urlopen(Request(self.origin + path, data=data, headers=fields), timeout=3) as response:
            return json.load(response)

    def test_settings_are_shared_and_written_to_disk(self):
        self.assertIsNone(self.request("/api/session")["settings"])
        settings = {"enabled": ["Wildlife"], "streams": [{"id": "owl"}]}
        self.request("/api/settings", settings)
        self.assertEqual(self.request("/api/session")["settings"], settings)
        self.assertEqual(json.loads(self.settings_path.read_text()), settings)

    def test_commands_preserve_order_and_publish_wallpaper_status(self):
        self.request("/api/command", {"action": "next"})
        self.request("/api/command", {"action": "play", "id": "owl"})
        self.request("/api/status", {"id": "owl", "hold": False})
        session = self.request("/api/session")
        self.assertEqual([entry["sequence"] for entry in session["commands"]], [1, 2])
        self.assertEqual(session["commands"][1]["id"], "owl")
        self.assertEqual(session["status"]["id"], "owl")

    def test_rejects_foreign_origins_hosts_and_file_paths(self):
        for path, payload, origin, headers, code in [
            ("/api/command", {"action": "next"}, "https://example.org", None, 403),
            ("/api/session", None, None, {"Host": "example.org"}, 403),
            ("/.git/config", None, None, None, 404),
            ("/api/command", {"action": []}, None, None, 400),
        ]:
            with self.assertRaises(HTTPError) as error:
                self.request(path, payload, origin, headers)
            self.assertEqual(error.exception.code, code)

    def test_visibility_is_validated_and_expires(self):
        self.assertIsNone(self.request("/api/session")["visibility"])
        self.request("/api/visibility", {"fraction": 0.5})
        self.assertEqual(self.request("/api/session")["visibility"], 0.5)
        with self.assertRaises(HTTPError) as error:
            self.request("/api/visibility", {"fraction": 1.1})
        self.assertEqual(error.exception.code, 400)
        self.server.visibility_time = monotonic() - 3
        self.assertIsNone(self.request("/api/session")["visibility"])


if __name__ == "__main__":
    unittest.main()
