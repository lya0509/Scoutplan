from PIL import Image
import os

img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\.user_uploaded\media__1785176397850.png"
if not os.path.exists(img_path):
    # Probar con el de la carpeta raíz si no está
    img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\media__1781416348918.png"

print(f"Cargando imagen desde: {img_path}")
img = Image.open(img_path).convert("RGBA")

width, height = img.size
new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

pixels = img.load()
new_pixels = new_img.load()

# Aislar el emblema blanco (blanco o casi blanco) del fondo morado o negro
for x in range(width):
    for y in range(height):
        r, g, b, a = pixels[x, y]
        # Si los tres canales son brillantes (blanco o gris claro)
        if r > 200 and g > 200 and b > 200:
            new_pixels[x, y] = (255, 255, 255, 255)
        else:
            new_pixels[x, y] = (0, 0, 0, 0)

# Recortar los bordes vacíos
bbox = new_img.getbbox()
if bbox:
    cropped_img = new_img.crop(bbox)
else:
    cropped_img = new_img

out_dir = r"c:\plan progresivo\assets"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "scout_fleur_de_lis_clean.png")

cropped_img.save(out_path, "PNG")
print(f"✅ Emblema extraído con éxito en: {out_path}")
