import json

with open("excel_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

sheet_data = data.get("Masculino ", [])
row8 = None
for item in sheet_data:
    if item["row"] == 8:
        row8 = item["data"]
        break

if not row8:
    print("No se encontro la fila 8 con la lista completa de requisitos.")
    exit()

# Extraer todos los requisitos textuales de la fila 8
raw_reqs = row8[344:548]  # Rango de actividades extraidas de la matriz
print(f"Total de requisitos individuales detectados: {len(raw_reqs)}")

# Clasificar los requisitos por etapas
precursor_reqs = []
expedicionario_reqs = []
descubridor_reqs = []
fundador_reqs = []
rover_reqs = []

for idx, req_text in enumerate(raw_reqs):
    req_text = req_text.strip()
    req_obj = {"id": f"excel_req_{idx+1}", "text": req_text, "type": "basica"}
    
    if idx < 10:
        precursor_reqs.append(req_obj)
    elif idx < 30:
        expedicionario_reqs.append(req_obj)
    elif idx < 80:
        descubridor_reqs.append(req_obj)
    elif idx < 140:
        fundador_reqs.append(req_obj)
    else:
        rover_reqs.append(req_obj)

template_ts = f"""import {{ StageTemplate }} from '../types/progression';

export const stagesData: StageTemplate[] = [
  {{
    id: 'precursor',
    title: 'Precursor',
    description: 'Insignia que representa el inicio de este viaje',
    estimatedTime: '4 a 8 semanas',
    requirements: {json.dumps(precursor_reqs, ensure_ascii=False, indent=6)}
  }},
  {{
    id: 'expedicionario',
    title: 'Expedicionario',
    description: 'Tu que quieres saber ir',
    estimatedTime: '14 meses',
    requirements: {json.dumps(expedicionario_reqs, ensure_ascii=False, indent=6)}
  }},
  {{
    id: 'descubridor',
    title: 'Descubridor',
    description: 'Para aquellos que buscan ir mas alla.',
    estimatedTime: '12 meses',
    requirements: {json.dumps(descubridor_reqs, ensure_ascii=False, indent=6)}
  }},
  {{
    id: 'fundador',
    title: 'Fundador',
    description: 'Dejando el mundo mejor de como lo encontraste.',
    estimatedTime: '12 meses',
    requirements: {json.dumps(fundador_reqs, ensure_ascii=False, indent=6)}
  }},
  {{
    id: 'rover_ciudadano',
    title: 'Rover Ciudadano',
    description: 'Servicio en la etapa maxima.',
    estimatedTime: 'Indefinido',
    requirements: {json.dumps(rover_reqs, ensure_ascii=False, indent=6)}
  }}
];
"""

with open("src/data/progressionTemplate.ts", "w", encoding="utf-8") as out:
    out.write(template_ts)

print("Exito: 'src/data/progressionTemplate.ts' generado con todos los requisitos del Excel.")
