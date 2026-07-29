from PIL import Image
import os

img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\.user_uploaded\media__1785176397850.png"
if not os.path.exists(img_path):
    img_path = r"C:\Users\juanl\.gemini\antigravity\brain\41966935-c4e5-4b4c-99da-689b24c473f5\media__1781416348918.png"

img = Image.open(img_path).convert("RGB")
width, height = img.size

# Tomar una muestra de píxeles del círculo (por ejemplo a 1/4 del ancho y alto)
sample_color = img.getpixel((int(width * 0.3), int(height * 0.3)))
r, g, b = sample_color

hex_color = f"#{r:02x}{g:02x}{b:02x}"
print(f"Color Morado Scout Exacto Extraido: RGB({r}, {g}, {b}) -> HEX: {hex_color}")
