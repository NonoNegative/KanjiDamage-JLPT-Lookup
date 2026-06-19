import os
import http.server
import socketserver
import urllib.request
from urllib.error import HTTPError

PORT = 8000

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 1. Try to serve local files (like index.html, style.css, script.js, json)
        path = self.translate_path(self.path)
        if os.path.exists(path) and not os.path.isdir(path):
            return super().do_GET()
        
        # Default behavior for root path
        if self.path == '/' or self.path.startswith('/?'):
            return super().do_GET()

        # 2. Proxy everything else to kanjidamage.com (use HTTPS)
        url = "https://www.kanjidamage.com" + self.path
        try:
            # Ask the origin for an uncompressed response (simplifies injection)
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept-Encoding': 'identity'
            })
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                
                # Exclude the X-Frame-Options header so our iframe will display it
                for k, v in resp.getheaders():
                    if k.lower() not in ['x-frame-options', 'content-length', 'transfer-encoding', 'connection', 'content-encoding']:
                        self.send_header(k, v)
                
                body = resp.read()
                
                # --- Inject CSS to hide the KanjiDamage navbar ---
                content_type = resp.headers.get('Content-Type', '')
                if 'text/html' in content_type:
                    body_str = body.decode('utf-8', errors='ignore')
                    hide_css = (
                        "<style>"
                        ".navbar.fixed-top, body > br, .adsense, body > .container:first-of-type, .navigation-header a { display: none !important; }"
                        "body, body.kanji { padding-top: 15px !important; margin-top: 0 !important; }"
                        ".container { padding-top: 0 !important; margin-top: 0 !important; }"
                        "</style>"
                    )
                    body_str = body_str.replace("</head>", hide_css + "\n</head>")
                    body = body_str.encode('utf-8')

                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                
        except HTTPError as e:
            self.send_error(e.code, str(e.reason))
        except Exception as e:
            self.send_error(500, str(e))

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Local Server running at http://localhost:{PORT}")
        print("Transparently proxying kanjidamage.com to bypass X-Frame-Options...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        print("\nShutting down server.")
