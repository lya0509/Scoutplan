import json

with open("catalogo_completo_scout.json", "r", encoding="utf-8") as f:
    cat = json.load(f)

print(f"Total actividades: {len(cat)}")
for item in cat[150:180]:
    print(f"Col {item['col']} | Area: {item['area']} | SubArea: {item['sub_area']} | Actividad: {item['activity']}")
