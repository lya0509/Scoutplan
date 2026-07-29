import json

with open("excel_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

sheet_data = data.get("Masculino ", [])
row6 = None
row7 = None
row8 = None

for item in sheet_data:
    if item["row"] == 6: row6 = item["data"]
    if item["row"] == 7: row7 = item["data"]
    if item["row"] == 8: row8 = item["data"]

if not row8:
    print("Error: No se encontró la fila 8.")
    exit()

raw_reqs = row8[344:548]  # Rango de actividades
# In row 7, categories are at specific offsets. To keep it simple, we will just list all activities in a single catalog with an ID.
# Or we can group them based on row7. For now, a flat list with IDs is perfect for the DB/UI to check off.

catalog_ts = """export interface CatalogActivity {
  id: string;
  text: string;
  area?: string;
}

export const activitiesCatalog: CatalogActivity[] = [\n"""

for idx, req_text in enumerate(raw_reqs):
    req_text = req_text.strip()
    catalog_ts += f"  {{ id: 'act_cat_{idx+1}', text: {json.dumps(req_text, ensure_ascii=False)} }},\n"

catalog_ts += "];\n"

with open("src/data/activitiesCatalog.ts", "w", encoding="utf-8") as out:
    out.write(catalog_ts)

print("Exito: Catálogo de actividades generado en src/data/activitiesCatalog.ts")
