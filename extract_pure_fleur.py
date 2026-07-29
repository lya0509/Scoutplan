from PIL import Image
import os
import math

img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\.user_uploaded\media__1785176397850.png"
if not os.path.exists(img_path):
    img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\media__1781416348918.png"

img = Image.open(img_path).convert("RGBA")
width, height = img.size

# 1. Encontrar los límites de la circunferencia morada
purple_pixels = []
for x in range(width):
    for y in range(height):
        r, g, b, a = img.getpixel((x, y))
        # El morado tiene canal azul/rojo alto y verde bajo
        if r > 60 and b > 100 and g < 100:
            purple_pixels.append((x, y))

if not purple_pixels:
    print("No se encontraron píxeles morados, usando centro por defecto.")
    center_x, center_y = width / 2, height / 2
    radius = min(width, height) / 2 - 5
else:
    min_x = min(p[0] for p in purple_pixels)
    max_x = max(p[0] for p in purple_pixels)
    min_y = min(p[1] for p in purple_pixels)
    max_y = max(p[1] for p in purple_pixels)

    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    radius = (max_x - min_x) / 2 - 2  # Un poquito de margen interno para eliminar el borde externo

print(f"Centro: ({center_x}, {center_y}), Radio del círculo morado: {radius}")

new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
pixels = img.load()
new_pixels = new_img.load()

# 2. Solo extraer píxeles blancos que estén DENTRO del círculo morado
for x in range(width):
    for y in range(height):
        dist = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        if dist <= radius:
            r, g, b, a = pixels[x, y]
            # Si es un píxel blanco dentro del círculo
            if r > 180 and g > 180 and b > 180:
                new_pixels[x, y] = (255, 255, 255, 255)

# Recortar al borde exacto de la flor de lis
bbox = new_img.getbbox()
if bbox:
    cropped_img = new_img.crop(bbox)
else:
    cropped_img = new_img

out_path = r"c:\plan progresivo\assets\scout_fleur_de_lis_clean.png"
cropped_img.save(out_path, "PNG")
print("EXTRACCION COMPLETADA CON EXITO SIN CUADRO BLANCO!")
