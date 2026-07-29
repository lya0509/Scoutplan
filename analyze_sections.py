import json

with open("catalogo_completo_scout.json", "r", encoding="utf-8") as f:
    cat = json.load(f)

sections = {}

for item in cat:
    s_area = item["super_area"] or "GENERAL"
    area = item["area"] or "SIN_AREA"
    sub_area = item["sub_area"] or "SIN_SUBAREA"
    
    key = f"{s_area} -> {area} -> {sub_area}"
    if key not in sections:
        sections[key] = []
    sections[key].append(item["activity"])

print(f"Total de Secciones Estructuradas: {len(sections)}\n")

for sec, items in sections.items():
    print(f"SECCION: {sec}")
    print(f"   Cantidad de elementos: {len(items)}")
    print(f"   Ejemplos: {items[:2]}\n")
