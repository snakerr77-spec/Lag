from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import threading
import webbrowser

HOST = "127.0.0.1"
PORT = 5500
ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_GET(self):
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/index.html")
            self.end_headers()
            return
        super().do_GET()

url = f"http://{HOST}:{PORT}/index.html"
server = ThreadingHTTPServer((HOST, PORT), Handler)
print(f"\nLAG Controller iniciado em:\n{url}\n")
print("Mantenha esta janela aberta. Pressione Ctrl+C para encerrar.\n")
threading.Timer(0.7, lambda: webbrowser.open(url)).start()
server.serve_forever()
