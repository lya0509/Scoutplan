import json

with open("all_excel_columns.json", "r", encoding="utf-8") as f:
    cols = json.load(f)

print(f"Total columnas: {len(cols)}")

# Filtrar por celdas en r8 que parezcan actividades reales (longitud > 10)
activities = []
for c in cols:
    r8 = c["r8"]
    r7 = c["r7"]
    r6 = c["r6"]
    r5 = c["r5"]
    
    if len(r8) > 10 and not r8.startswith("INTEGRANTES") and not r8.startswith("FECHA") and not r8.startswith("CARGO"):
        activities.append({
            "col": c["col"],
            "r5": r5,
            "r6": r6,
            "r7": r7,
            "title": r8
        })

print(f"Total de actividades unicas encontradas en r8: {len(activities)}")
print("\nMuestra de las primeras 15 actividades:")
for a in activities[:15]:
    print(f"Col {a['col']} | R6: {a['r6']} | R7: {a['r7']} | Titulo: {a['title']}")
