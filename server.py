import http.server
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print(f"==================================================")
        print(f" Algorithme Studio (Visual Studio Code Edition)")
        print(f" Serveur actif sur : {url}")
        print(f" Ouvrez cette adresse dans votre navigateur.")
        print(f" Appuyez sur Ctrl+C pour arreter le serveur.")
        print(f"==================================================")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrete.")

if __name__ == '__main__':
    run()
