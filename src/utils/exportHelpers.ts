// Helper profesional para exportar archivos Excel (.xls formateado con HTML/XML)
// y generar documentos imprimibles/PDF con membrete oficial Scout.

export interface MemberRecord {
  id: string;
  name: string;
  role: string;
  unit: string;
  group_name?: string;
  cedula?: string;
  birth_date?: string;
  join_date?: string;
  promise_date?: string;
  phone?: string;
  gender?: string;
  membership_expires_at?: string;
  membership_status?: string;
  proposed_membership_date?: string;
  medical_data?: any;
}

// 1. EXPORTAR CENSO Y NÓMINA EN EXCEL
export function exportCensoExcel(members: MemberRecord[], groupName: string) {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  let rowsHtml = '';
  members.forEach((m, idx) => {
    const isJefe = m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
    const roleLabel = m.role === 'jefe_grupo' ? 'Jefe de Grupo' : m.role === 'scouter' ? 'Scouter / Dirigente' : 'Joven Scout';
    const unitLabel = isJefe ? 'JEFATURA' : (m.unit || 'General').toUpperCase();
    const isApproved = m.membership_status === 'approved' && m.membership_expires_at ? `Vigente (${m.membership_expires_at})` : 'Sin Registro';

    rowsHtml += `
      <tr>
        <td style="text-align:center; padding: 6px; border: 1px solid #d1d5db;">${idx + 1}</td>
        <td style="font-weight: bold; padding: 6px; border: 1px solid #d1d5db;">${m.name || 'Sin Nombre'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.cedula || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${roleLabel}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${unitLabel}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.gender || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.birth_date || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.join_date || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.promise_date || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.phone || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${isApproved}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Censo Oficial</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        .header-title { font-size: 16pt; font-weight: bold; color: #4a154b; text-align: center; }
        .header-sub { font-size: 12pt; color: #374151; text-align: center; }
        .table-header { background-color: #612499; color: #ffffff; font-weight: bold; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="11" class="header-title">ASOCIACIÓN DE SCOUTS DE VENEZUELA</td></tr>
        <tr><td colspan="11" class="header-sub">CENSO Y NÓMINA OFICIAL DE MIEMBROS • ${groupName || 'GRUPO SCOUT ORIÓN #84'}</td></tr>
        <tr><td colspan="11" style="text-align:center; color:#6b7280; font-size:10pt;">Fecha de Emisión: ${currentDate} • Total Miembros Registrados: ${members.length}</td></tr>
        <tr><td colspan="11"></td></tr>
        <tr class="table-header">
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">#</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Nombres y Apellidos</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Cédula / Identidad</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Rol / Cargo</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Unidad / Rama</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Género</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">F. Nacimiento</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">F. Ingreso</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">F. Promesa</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Teléfono Contacto</th>
          <th style="background-color:#612499; color:#fff; padding:8px; border:1px solid #4a154b;">Membresía / Carnet</th>
        </tr>
        ${rowsHtml}
      </table>
    </body>
    </html>
  `;

  downloadBlob(htmlContent, `Censo_Oficial_${(groupName || 'Grupo').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
}

// 2. EXPORTAR PADRÓN DE EMERGENCIA MÉDICA EN EXCEL
export function exportPadronMedicoExcel(members: MemberRecord[], groupName: string) {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  let rowsHtml = '';
  members.forEach((m, idx) => {
    const med = m.medical_data || {};
    const unitLabel = (m.unit || 'General').toUpperCase();
    const blood = med.bloodType || 'Sin Registrar';
    
    // Concatenar alergias
    let allergiesText = 'Ninguna';
    if (med.allergies) {
      const allList = [];
      if (med.allergies.medicamento) allList.push(`Med: ${med.allergies.medicamento}`);
      if (med.allergies.alimento) allList.push(`Alim: ${med.allergies.alimento}`);
      if (med.allergies.picada) allList.push(`Picada: ${med.allergies.picada}`);
      if (med.allergies.otro) allList.push(med.allergies.otro);
      if (allList.length > 0) allergiesText = allList.join(' | ');
    }

    const contactName = med.emergencyContactName || m.name || 'Sin Registrar';
    const contactPhone = med.emergencyPhonePersonal || med.emergencyPhoneHome || m.phone || 'Sin Registrar';
    const prescription = med.hasPrescription ? `Sí: ${med.medicalPrescriptionExplain || 'Bajo Tratamiento'}` : 'No';
    const insurance = med.hasInsurance ? `Sí: ${med.insuranceExplain || 'Póliza Activa'}` : 'No';

    rowsHtml += `
      <tr>
        <td style="text-align:center; padding: 6px; border: 1px solid #d1d5db;">${idx + 1}</td>
        <td style="font-weight: bold; padding: 6px; border: 1px solid #d1d5db;">${m.name}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.cedula || med.ci || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${unitLabel}</td>
        <td style="text-align:center; font-weight:bold; color:#dc2626; padding: 6px; border: 1px solid #d1d5db;">${blood}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; color:${allergiesText !== 'Ninguna' ? '#b91c1c' : '#111827'}; font-weight:${allergiesText !== 'Ninguna' ? 'bold' : 'normal'}">${allergiesText}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${contactName}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; font-weight:bold;">${contactPhone}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${prescription}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${insurance}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Padron Medico</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        .header-title { font-size: 16pt; font-weight: bold; color: #991b1b; text-align: center; }
        .header-sub { font-size: 12pt; color: #374151; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="10" class="header-title">PADRÓN DE EMERGENCIA MÉDICA Y CONTACTOS • GRUPO SCOUT</td></tr>
        <tr><td colspan="10" class="header-sub">${groupName || 'GRUPO SCOUT ORIÓN #84'} • REGISTRO DE SALUD PARA EVENTOS Y CAMPAMENTOS</td></tr>
        <tr><td colspan="10" style="text-align:center; color:#6b7280; font-size:10pt;">Fecha de Emisión: ${currentDate} • Total Miembros en Padrón: ${members.length}</td></tr>
        <tr><td colspan="10"></td></tr>
        <tr>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">#</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Scout / Dirigente</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Cédula</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Unidad</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Tipo Sangre</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Alergias Conocidas</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Representante / Contacto</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Teléfono Emergencia</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Tratamiento Continuo</th>
          <th style="background-color:#991b1b; color:#fff; padding:8px; border:1px solid #7f1d1d;">Seguro Médico</th>
        </tr>
        ${rowsHtml}
      </table>
    </body>
    </html>
  `;

  downloadBlob(htmlContent, `Padron_Medico_Emergencias_${(groupName || 'Grupo').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
}

// 3. EXPORTAR REPORTE DE MEMBRESÍAS Y CARNETS EN EXCEL
export function exportMembresiasExcel(members: MemberRecord[], groupName: string) {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const today = new Date();

  let rowsHtml = '';
  members.forEach((m, idx) => {
    let statusText = '🔴 Sin Registro / Vencida';
    let statusColor = '#dc2626';

    if (m.membership_status === 'pending') {
      statusText = `⏳ Propuesta: ${m.proposed_membership_date || 'Por Aprobar'}`;
      statusColor = '#d97706';
    } else if (m.membership_expires_at) {
      const expDate = new Date(m.membership_expires_at);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        statusText = `🔴 Vencida el ${m.membership_expires_at}`;
        statusColor = '#dc2626';
      } else if (diffDays <= 30) {
        statusText = `🟡 Por Vencer (${diffDays} días restantes • ${m.membership_expires_at})`;
        statusColor = '#d97706';
      } else {
        statusText = `🟢 Vigente hasta ${m.membership_expires_at}`;
        statusColor = '#16a34a';
      }
    }

    rowsHtml += `
      <tr>
        <td style="text-align:center; padding: 6px; border: 1px solid #d1d5db;">${idx + 1}</td>
        <td style="font-weight: bold; padding: 6px; border: 1px solid #d1d5db;">${m.name}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.cedula || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura' ? 'JEFATURA' : (m.unit || 'General').toUpperCase()}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.role === 'scouter' ? 'Dirigente' : m.role === 'jefe_grupo' ? 'Jefe de Grupo' : 'Scout'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; font-weight:bold; color:${statusColor};">${statusText}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${m.membership_expires_at || 'Sin fecha'}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Control Membresias</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="7" class="header-title">CONTROL INSTITUCIONAL DE MEMBRESÍAS Y CARNETS ASV</td></tr>
        <tr><td colspan="7" style="text-align:center; font-size:12pt; color:#374151;">${groupName || 'GRUPO SCOUT ORIÓN #84'}</td></tr>
        <tr><td colspan="7" style="text-align:center; color:#6b7280; font-size:10pt;">Fecha de Emisión: ${currentDate} • Total Miembros: ${members.length}</td></tr>
        <tr><td colspan="7"></td></tr>
        <tr>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">#</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Miembro</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Cédula</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Unidad</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Cargo</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Estado de Semáforo</th>
          <th style="background-color:#1e3a8a; color:#fff; padding:8px; border:1px solid #172554;">Fecha de Vencimiento</th>
        </tr>
        ${rowsHtml}
      </table>
    </body>
    </html>
  `;

  downloadBlob(htmlContent, `Control_Membresias_${(groupName || 'Grupo').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
}

// 4. IMPRESIÓN OFICIAL Y GENERACIÓN DE PDF FORMATEADO
export function printDocumentHTML(title: string, subtitle: string, groupName: string, headers: string[], rows: (string | number)[][], themeColor: string = '#612499') {
  if (typeof window === 'undefined') return;

  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  const headersHtml = headers.map(h => `<th style="background-color:${themeColor}; color:#ffffff; padding:8px 10px; font-size:11px; text-align:left; border:1px solid #333;">${h}</th>`).join('');

  const rowsHtml = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    const cells = r.map(c => `<td style="padding:6px 8px; font-size:11px; border:1px solid #e5e7eb; color:#111827;">${c}</td>`).join('');
    return `<tr style="background-color:${bg};">${cells}</tr>`;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite abrir ventanas emergentes para imprimir el reporte.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${groupName}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 10px; color: #111827; }
        .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${themeColor}; padding-bottom: 10px; margin-bottom: 15px; }
        .doc-title { font-size: 18px; font-weight: bold; color: ${themeColor}; margin: 0; }
        .doc-subtitle { font-size: 12px; color: #4b5563; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        .sig-line { width: 180px; border-top: 1px solid #333; text-align: center; margin-top: 30px; font-size: 10px; color: #333; padding-top: 4px; }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:15px; background:#f3f4f6; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; font-weight:bold;">📄 Vista Previa de Impresión Oficial</span>
        <div>
          <button onclick="window.print()" style="background:${themeColor}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir / Guardar como PDF</button>
          <button onclick="window.close()" style="background:#e5e7eb; border:none; padding:8px 14px; border-radius:6px; margin-left:8px; cursor:pointer;">Cerrar</button>
        </div>
      </div>

      <div class="doc-header">
        <div>
          <h1 class="doc-title">${title}</h1>
          <div class="doc-subtitle">${subtitle} • <strong>${groupName}</strong></div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #4b5563;">
          <div><strong>Asociación de Scouts de Venezuela</strong></div>
          <div>Fecha: ${currentDate}</div>
          <div>Registros: ${rows.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>${headersHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-around; margin-top:40px;">
        <div class="sig-line">Jefe de Grupo<br>Firma y Sello</div>
        <div class="sig-line">Consejo de Grupo<br>Firma</div>
      </div>

      <div class="footer">
        <div>Documento Oficial Generado por Plataforma ScoutPlan</div>
        <div>Página 1 de 1</div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
}

function downloadBlob(content: string, filename: string, contentType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${contentType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
