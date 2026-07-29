import re
import html

# Leer el archivo HTML descargado
path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\.system_generated\steps\884\content.md"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Buscar cadenas de texto que parezcan nombres de archivos o carpetas en Dropbox
# Usualmente Dropbox serializa los nombres en un objeto JSON grande en la página
# Buscamos patrones como "name": "..." o "filename": "..." o texto dentro de spans de carpetas
names = re.findall(r'"name"\s*:\s*"([^"]+)"', content)
filename_matches = re.findall(r'"filename"\s*:\s*"([^"]+)"', content)
titles = re.findall(r'"title"\s*:\s*"([^"]+)"', content)

all_extracted = set()
for name in names + filename_matches + titles:
    # Decodificar caracteres html/unicode
    try:
        decoded = html.unescape(name.encode().decode('unicode-escape'))
    except Exception:
        decoded = name
    
    # Filtrar nombres comunes de scripts, assets o apis de dropbox
    if len(decoded) > 3 and not decoded.endswith(('.js', '.css', '.png', '.ico', '.gif', '.jpg')) and '\\' not in decoded:
        all_extracted.add(decoded)

print(f"Total nombres posibles de especialidades extraidos: {len(all_extracted)}")
for item in sorted(all_extracted)[:50]:
    print(f"- {item}")
