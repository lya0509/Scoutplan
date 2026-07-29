import urllib.request
import re

url = "https://raw.githubusercontent.com/Templarian/MaterialDesign-SVG/master/svg/fleur-de-lis.svg"

req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        paths = re.findall(r'd="([^"]+)"', html)
        print(f"Encontrados {len(paths)} paths!")
        for idx, p in enumerate(paths, 1):
            print(f"\n--- Path {idx} ---")
            print(p[:300] + "...")
            with open(f"path_{idx}.txt", "w") as f:
                f.write(p)
except Exception as e:
    print("Error al descargar:", e)
