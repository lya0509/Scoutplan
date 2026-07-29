import json

with open("catalogo_completo_scout.json", "r", encoding="utf-8") as f:
    cat = json.load(f)

ts_content = """export interface CatalogActivity {
  id: string;
  text: string;
  superArea: string;
  area: string;
  subArea: string;
}

export const activitiesCatalog: CatalogActivity[] = [\n"""

for idx, item in enumerate(cat):
    ts_content += f"""  {{
    id: "act_{idx+1}",
    text: {json.dumps(item['activity'], ensure_ascii=False)},
    superArea: {json.dumps(item['super_area'], ensure_ascii=False)},
    area: {json.dumps(item['area'], ensure_ascii=False)},
    subArea: {json.dumps(item['sub_area'], ensure_ascii=False)}
  }},\n"""

ts_content += "];\n"

with open("src/data/activitiesCatalog.ts", "w", encoding="utf-8") as out:
    out.write(ts_content)

print(f"Exito: 'src/data/activitiesCatalog.ts' actualizado con las {len(cat)} actividades completas del Excel.")
