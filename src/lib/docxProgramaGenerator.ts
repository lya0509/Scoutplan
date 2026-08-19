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

      // Inyectar el logo de Grupo Orion #84 a la izquierda (image3.jpeg)
      try {
        const orionRes = await fetch('/programa_assets/orion.png');
        if (orionRes.ok) {
          const orionBuf = await orionRes.arrayBuffer();
          zip.file('word/media/image3.jpeg', orionBuf);
        }
      } catch (e) {
        console.warn('Logo Orion cargado por defecto');
      }

      // Inyectar el logo de la unidad a la derecha (image4.png)
      try {
        let logoFile = '/programa_assets/logo_clan.jpg';
        if (programa.unit === 'manada') logoFile = '/programa_assets/logo_manada.jpg';
        else if (programa.unit === 'tropa') logoFile = '/programa_assets/logo_tropa.png';
        
        const logoRes = await fetch(logoFile);
        if (logoRes.ok) {
          const logoBuf = await logoRes.arrayBuffer();
          zip.file('word/media/image4.png', logoBuf);
        }
      } catch (e) {
        console.warn('Logo de unidad cargado por defecto');
      }

      // Inyectar el logo Scout Mundial WOSM a la derecha (image5.png)
      try {
        const scoutRes = await fetch('/programa_assets/logo_scout.png');
        if (scoutRes.ok) {
          const scoutBuf = await scoutRes.arrayBuffer();
          zip.file('word/media/image5.png', scoutBuf);
        }
      } catch (e) {
        console.warn('Logo Scout cargado por defecto');
      }

      // Inyectar insignia de registro 2026 oficial en el Word (image6.png)
      try {
        const badgeRes = await fetch('/programa_assets/registro_2026.png');
        if (badgeRes.ok) {
          const badgeBuf = await badgeRes.arrayBuffer();
          zip.file('word/media/image6.png', badgeBuf);
        }
      } catch (e) {
        console.warn('Insignia 2026 cargada por defecto');
      }

      // 3. Modificar document.xml con los datos del programa
      let docXml = await zip.file('word/document.xml')?.async('string');
      if (!docXml) {
        throw new Error('El archivo de plantilla no contiene word/document.xml');
      }

      // Preparar textos formateados
      const cleanTitle = escapeXml(programa.title);
      const cleanDate = escapeXml(programa.date || 'Sin fecha');
      const cleanLocation = escapeXml(programa.location || 'Por definir');
      const cleanActivityType = escapeXml(programa.activityType || 'Actividad');
      const unitLabel = programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1
        ? `${programa.selectedUnits.map(u => u.toUpperCase()).join(' + ')} (Sinodal)`
        : programa.unit.toUpperCase();
      const cleanParticipants = escapeXml(programa.participantProjection || 'N/A');

      // 1. Tabla de Resumen (Table 1)
      const table1Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="7030A0"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Fecha</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Lugar:</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Tipo de Actividad:</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Rama:</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2423" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Número de Participante</w:t></w:r></w:p></w:tc>
          </w:tr>
          <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${cleanDate}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${cleanLocation}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${cleanActivityType}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(unitLabel)}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2423" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${cleanParticipants}</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
      `;

      // 2. Tabla de Objetivos (Table 2)
      const specObjParas = (programa.specificObjectives || []).map(obj => `
        <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>* ${escapeXml(obj)}</w:t></w:r></w:p>
      `).join('');

      const table2Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Objetivo General:</w:t></w:r></w:p>
              <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(programa.generalObjective || 'Fomentar competencias clave para actividades al aire libre y crecimiento integral.')}</w:t></w:r></w:p>
              <w:p><w:pPr><w:spacing w:before="120"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Objetivos Específicos:</w:t></w:r></w:p>
              ${specObjParas || '<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>* Enseñar y aplicar las técnicas scouts correspondientes a la actividad.</w:t></w:r></w:p>'}
            </w:tc>
          </w:tr>
        </w:tbl>
      `;

      // 3. Tabla de Metas Específicas (Table 3)
      const specMetaParas = (programa.specificMetas || []).map(meta => `
        <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>* ${escapeXml(meta)}</w:t></w:r></w:p>
      `).join('');

      const table3Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Metas Específicas:</w:t></w:r></w:p>
              ${specMetaParas || '<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>* Lograr la participación activa y el aprendizaje de todos los integrantes.</w:t></w:r></w:p>'}
            </w:tc>
          </w:tr>
        </w:tbl>
      `;

      // 4. Tabla de Indicadores de Logro (Table 4)
      const areaKeys = Object.keys(GROWTH_AREAS) as GrowthAreaKey[];
      const indicatorsListParas = areaKeys.map(areaKey => {
        const areaInfo = GROWTH_AREAS[areaKey];
        const list = programa.indicators[areaKey] || [];
        if (!list || list.length === 0) return '';
        return `
          <w:p><w:pPr><w:spacing w:before="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>-${escapeXml(areaInfo.name)}:</w:t></w:r></w:p>
          ${list.map(ind => `<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>. ${escapeXml(ind)}</w:t></w:r></w:p>`).join('')}
        `;
      }).filter(Boolean).join('');

      const table4Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Indicadores de Logro:</w:t></w:r></w:p>
              ${indicatorsListParas || `
                <w:p><w:pPr><w:spacing w:before="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>-Corporalidad:</w:t></w:r></w:p>
                <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>. Analiza su uso del tiempo y se impone correctivos.</w:t></w:r></w:p>
                <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>. Valora y mantiene una imagen adecuada de sí mismo y cuida la higiene personal.</w:t></w:r></w:p>
                <w:p><w:pPr><w:spacing w:before="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>-Creatividad:</w:t></w:r></w:p>
                <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>. Actúa con agilidad mental ante situaciones diversas, desarrollando capacidad de pensar e innovar.</w:t></w:r></w:p>
                <w:p><w:pPr><w:spacing w:before="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>-Carácter:</w:t></w:r></w:p>
                <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>. Mantiene autenticidad al demostrar coherencia entre su pensamiento y su acción.</w:t></w:r></w:p>
              `}
            </w:tc>
          </w:tr>
        </w:tbl>
      `;

      // 5. Tabla de ODS (Table 5)
      const sdgText = programa.selectedSDGs && programa.selectedSDGs.length > 0
        ? programa.selectedSDGs.map(num => {
            const sdg = SDG_LIST.find(s => s.number === num);
            return `ODS #${num}: ${sdg?.name || sdg?.shortName || ''}`;
          }).join(';  ')
        : 'Ningún ODS seleccionado';

      const table5Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p>
                <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="4C1D95"/></w:rPr><w:t>Objetivos de Desarrollo Sostenible (ODS):  </w:t></w:r>
                <w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(sdgText)}</w:t></w:r>
              </w:p>
            </w:tc>
          </w:tr>
        </w:tbl>
      `;

      // 6. Tabla de Cronograma (Table 6)
      const scheduleRowsXml = (programa.schedule || []).map(item => `
        <w:tr>
          <w:tc>
            <w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/></w:rPr><w:t>${escapeXml(item.timeRange)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="4623" w:type="dxa"/></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.title)}</w:t></w:r></w:p>
            ${item.description ? `<w:p><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="4B5563"/></w:rPr><w:t>${escapeXml(item.description)}</w:t></w:r></w:p>` : ''}
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.responsible)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.materials || '-')}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      `).join('');

      const table6Xml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="11023" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="7030A0"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="7030A0"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="7030A0"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Horario (AM - PM)</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="4623" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Actividad / Descripción</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Responsable</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Materiales</w:t></w:r></w:p></w:tc>
          </w:tr>
          ${scheduleRowsXml || '<w:tr><w:tc><w:tcPr><w:gridSpan w:val="4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t>Sin actividades en el cronograma.</w:t></w:r></w:p></w:tc></w:tr>'}
          <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:fill="B2A1C7"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/></w:rPr><w:t>NOTAS IMPORTANTES</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="9223" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="17"/></w:rPr><w:t>${escapeXml(programa.importantNotes || 'Cada integrante debe dominar su ponencia y dar lo mejor de sí en este servicio scout.')}</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
      `;

      // Reemplazar las 6 tablas en document.xml
      const tableRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
      const tablesMatch = docXml.match(tableRegex);

      if (tablesMatch && tablesMatch.length >= 6) {
        docXml = docXml
          .replace(tablesMatch[0], table1Xml)
          .replace(tablesMatch[1], table2Xml)
          .replace(tablesMatch[2], table3Xml)
          .replace(tablesMatch[3], table4Xml)
          .replace(tablesMatch[4], table5Xml)
          .replace(tablesMatch[5], table6Xml);
      }

      // Reemplazar título principal
      docXml = docXml.replace(/Programa de Actividades de la Unidad del Clan/g, `Programa de Actividades de la Unidad ${escapeXml(unitLabel)}`);

      // Guardar el XML modificado en el zip
      zip.file('word/document.xml', docXml);

      // 4. Generar blob y descargar
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const fileUnitLabel = programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1
        ? `${programa.selectedUnits.map(u => u.toUpperCase()).join('_')}_SINODAL`
        : programa.unit.toUpperCase();
      const filename = `Programa_${fileUnitLabel}_${cleanTitle}_${cleanDate}.docx`;

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
