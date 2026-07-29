import re

path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\.system_generated\steps\884\content.md"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Buscar cadenas de texto largas que no sean HTML o JS
# Dropbox a veces guarda datos en base64 en window.PAGE_INIT_DATA
# Busquemos 'initDataBase64' o similar en el script
matches = re.findall(r'initDataBase64:\s*"([^"]+)"', content)
if matches:
    import base64
    print("Encontrado initDataBase64!")
    try:
        decoded = base64.b64decode(matches[0]).decode('utf-8', errors='ignore')
        # imprimir los primeros 1000 caracteres
        print("Muestra base64 descodificado:", decoded[:1000])
    except Exception as e:
        print("Error decodificando base64:", e)

# Busquemos también si hay palabras en español relacionadas con especialidades:
# "deportes", "arte", "tecnologia", "ciencia", "seguridad", "recreacion"
for word in ["deporte", "arte", "tecnologia", "ciencia", "seguridad", "recreacion", "especialidad"]:
    found = re.findall(rf'.{{0,30}}{word}.{{0,50}}', content, re.IGNORECASE)
    if found:
        print(f"\nCoincidencias para '{word}':")
        for f in found[:5]:
            print(" -", f.strip())
