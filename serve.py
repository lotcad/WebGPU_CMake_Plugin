#!/usr/bin/env python3
"""플러그인 폴더를 다른 주소의 엔진이 불러갈 수 있게 내놓는 작은 서버.

    python3 serve.py            http://localhost:8800/
    python3 serve.py 9000       다른 포트

엔진 (localhost:8000 · 홈페이지) 과 주소가 달라 import() 는 CORS 허용이 있어야 한다.
https 홈페이지에서 localhost 를 부를 때 크롬이 묻는 사설망 허용 (Private Network Access) 도 같이 보낸다.
캐시는 끈다 - 고친 플러그인을 punload / pload 하면 바로 새 것이 온다.
"""
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.ts': 'text/plain'}

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'plugins: http://localhost:{port}/plugins/  (Ctrl+C to stop)')
    print(f'  engine command line: pload http://localhost:{port}/plugins/stairs.js')
    http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
