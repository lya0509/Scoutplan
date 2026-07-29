import openpyxl
import json

wb = openpyxl.load_workbook("mi_plan_progresivo.xlsx", data_only=True)

print("Hojas en el libro de Excel:", wb.sheetnames)

for sheet_name in wb.sheetnames:
    sheet = wb[sheet_name]
    print(f"\n==========================================")
    print(f"HOJA: '{sheet_name}' (Filas: {sheet.max_row}, Columnas: {sheet.max_column})")
    print(f"==========================================")
    
    # Buscar filas que tengan encabezados de actividades o textos largos
    text_cells = []
    for r in range(1, min(15, sheet.max_row + 1)):
        row_vals = [sheet.cell(r, c).value for c in range(1, min(200, sheet.max_column + 1))]
        non_empty = [(c, str(val).strip()) for c, val in enumerate(row_vals, 1) if val is not None and str(val).strip() != '']
        if non_empty:
            print(f"Fila {r}: {len(non_empty)} celdas con texto")
            # imprimir los primeros 5 textos para entender que hay en esa fila
            samples = [t[1] for t in non_empty[:10]]
            print(f"   Muestras: {samples}\n")
