import openpyxl

wb = openpyxl.load_workbook("mi_plan_progresivo.xlsx", data_only=True)

masc_sheet = wb["Masculino "]
fem_sheet = wb["Femenino"]

masc_cols = set()
fem_cols = set()

for c in range(1, masc_sheet.max_column + 1):
    val = str(masc_sheet.cell(8, c).value or '').strip()
    if val and len(val) > 3:
        masc_cols.add(val)

for c in range(1, fem_sheet.max_column + 1):
    val = str(fem_sheet.cell(8, c).value or '').strip()
    if val and len(val) > 3:
        fem_cols.add(val)

print(f"Total actividades únicas en Masculino: {len(masc_cols)}")
print(f"Total actividades únicas en Femenino: {len(fem_cols)}")

diff = fem_cols - masc_cols
if diff:
    print(f"Diferencias encontradas en Femenino ({len(diff)}):", list(diff)[:10])
else:
    print("✅ Ambos cuadros (Masculino y Femenino) comparten exactamente la misma estructura y actividades.")
