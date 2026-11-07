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

      // Logos: cada imagen se guarda con SU extensión real (antes un PNG iba dentro de
      // image3.jpeg y un JPG dentro de image4.png) y se actualiza la relación en el .rels.
      const relsPath = 'word/_rels/document.xml.rels';
      let relsXml = (await zip.file(relsPath)?.async('string')) || '';
      const injectImage = async (oldTarget: string, url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const buf = new Uint8Array(await res.arrayBuffer());
          const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
          const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
          if (!isPng && !isJpeg) return;
          const newTarget = oldTarget.replace(/\.(png|jpe?g)$/i, isPng ? '.png' : '.jpeg');
          if (newTarget !== oldTarget) {
            zip.remove(`word/${oldTarget}`);
            relsXml = relsXml.split(`Target="${oldTarget}"`).join(`Target="${newTarget}"`);
          }
          zip.file(`word/${newTarget}`, buf);
        } catch (e) {
          console.warn('Logo por defecto (no se pudo cargar):', url);
        }
      };

      const u = (programa.unit as string || '').toLowerCase();
      let unitLogo = '/programa_assets/logo_clan.jpg';
      if (u === 'manada') unitLogo = '/programa_assets/logo_manada.jpg';
      else if (u === 'tropa') unitLogo = '/programa_assets/logo_tropa.png';
      else if (u === 'caminantes' || u === 'comunidad') unitLogo = '/programa_assets/logo_caminantes.png';

      await injectImage('media/image3.jpeg', '/programa_assets/orion.png');       // Grupo Orión #84 (izquierda)
      await injectImage('media/image4.png', unitLogo);                            // Logo de la unidad (derecha)
      await injectImage('media/image5.png', '/programa_assets/logo_scout.png');   // Scout Mundial
      await injectImage('media/image6.png', '/programa_assets/registro_2026.png'); // Insignia de registro 2026
      zip.file(relsPath, relsXml);

      // La plantilla trae una miniatura de vista previa de 1,8 MB que no aparece en el
      // documento: se quita para que el Word pese la mitad.
      if (zip.file('docProps/thumbnail.emf')) {
        zip.remove('docProps/thumbnail.emf');
        const rootRels = await zip.file('_rels/.rels')?.async('string');
        if (rootRels) {
          zip.file('_rels/.rels', rootRels.replace(/<Relationship[^>]*Target="docProps\/thumbnail\.emf"[^>]*\/>/g, ''));
        }
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="2300"/><w:gridCol w:w="2500"/><w:gridCol w:w="2000"/><w:gridCol w:w="2423"/></w:tblGrid>
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="11023"/></w:tblGrid>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Objetivo General:</w:t></w:r></w:p>
              <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(programa.generalObjective || 'No especificado')}</w:t></w:r></w:p>
              <w:p><w:pPr><w:spacing w:before="120"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Objetivos Específicos:</w:t></w:r></w:p>
              ${specObjParas || '<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Sin objetivos específicos registrados.</w:t></w:r></w:p>'}
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="11023"/></w:tblGrid>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Metas Específicas:</w:t></w:r></w:p>
              ${specMetaParas || '<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Sin metas específicas registradas.</w:t></w:r></w:p>'}
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="11023"/></w:tblGrid>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t>Indicadores de Logro:</w:t></w:r></w:p>
              ${indicatorsListParas || '<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Sin indicadores de logro seleccionados.</w:t></w:r></w:p>'}
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="11023"/></w:tblGrid>
          <w:tr>
            <w:tc>
              <w:tcPr><w:tcW w:w="11023" w:type="dxa"/></w:tcPr>
              <w:p>
                <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="19"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Objetivos de Desarrollo Sostenible (ODS):  </w:t></w:r>
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
              <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="4623"/><w:gridCol w:w="2300"/><w:gridCol w:w="2300"/></w:tblGrid>
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
        // Reemplazo con función: si el texto del usuario trae "$&" o "$'" no se interpreta
        const newTables = [table1Xml, table2Xml, table3Xml, table4Xml, table5Xml, table6Xml];
        newTables.forEach((tbl, idx) => {
          docXml = docXml!.replace(tablesMatch[idx], () => tbl);
        });
      }

      // Reemplazar título principal
      docXml = docXml.replace(/Programa de Actividades de la Unidad del Clan/g, () => `Programa de Actividades de la Unidad ${escapeXml(unitLabel)}`);

      // Guardar el XML modificado en el zip
      zip.file('word/document.xml', docXml);

      // 4. Generar blob y descargar
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const fileUnitLabel = programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1
        ? `${programa.selectedUnits.map(u => u.toUpperCase()).join('_')}_SINODAL`
        : programa.unit.toUpperCase();
      // Nombre de archivo sin caracteres raros (antes salía "&amp;" si el título tenía "&")
      const safeName = (txt: string) => (txt || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 80);
      const filename = `Programa_${fileUnitLabel}_${safeName(programa.title)}_${safeName(programa.date || 'sin_fecha')}.docx`;

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
