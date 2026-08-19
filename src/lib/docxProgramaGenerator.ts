import JSZip from 'jszip';
import { ProgramaScout } from '../types/programa';
import { SDG_LIST } from '../data/sdgData';
import { GROWTH_AREAS, GrowthAreaKey } from '../data/achievementIndicatorsData';

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const docxProgramaGenerator = {
  /**
   * Genera y descarga un archivo .docx oficial para un Programa Scout
   */
  async generateAndDownload(programa: ProgramaScout): Promise<void> {
    try {
      // 1. Obtener la plantilla base desde el servidor / public
      const response = await fetch('/programa_assets/Programa_Template.docx');
      if (!response.ok) {
        throw new Error('No se pudo cargar la plantilla base de Word.');
      }
      const arrayBuffer = await response.arrayBuffer();

      // 2. Abrir con JSZip
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 3. Modificar document.xml con los datos del programa
      let docXml = await zip.file('word/document.xml')?.async('string');
      if (!docXml) {
        throw new Error('El archivo de plantilla no contiene word/document.xml');
      }

      // Preparar textos
      const sdgText = programa.selectedSDGs && programa.selectedSDGs.length > 0
        ? programa.selectedSDGs.map(num => {
            const sdg = SDG_LIST.find(s => s.number === num);
            return `ODS #${num} ${sdg?.name || ''}`;
          }).join('; ')
        : 'Sin ODS asignados';

      const indicatorsFormatted = Object.keys(GROWTH_AREAS).map(areaKey => {
        const areaInfo = GROWTH_AREAS[areaKey as GrowthAreaKey];
        const list = programa.indicators[areaKey as GrowthAreaKey] || [];
        const lines = list.map(item => `  • ${escapeXml(item)}`).join('\n');
        return `-${areaInfo.name}:\n${lines || '  • Sin indicadores asignados'}`;
      }).join('\n');

      // Generar filas XML para la tabla de cronograma
      const scheduleRowsXml = programa.schedule.map(item => `
        <w:tr>
          <w:tc>
            <w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:fill="auto"/></w:tcPr>
            <w:p><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escapeXml(item.timeRange)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:fill="auto"/></w:tcPr>
            <w:p><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escapeXml(item.title)}</w:t></w:r></w:p>
            ${item.description ? `<w:p><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${escapeXml(item.description)}</w:t></w:r></w:p>` : ''}
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:shd w:fill="auto"/></w:tcPr>
            <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.responsible)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:shd w:fill="auto"/></w:tcPr>
            <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.materials || 'N/A')}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      `).join('');

      // Guardar el XML modificado en el zip
      zip.file('word/document.xml', docXml);

      // 4. Generar blob y descargar
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const cleanTitle = programa.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Programa_${programa.unit.toUpperCase()}_${cleanTitle}_${programa.date || 'Actividad'}.docx`;

      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (err: any) {
      console.error('Error generando documento Word:', err);
      throw err;
    }
  }
};
