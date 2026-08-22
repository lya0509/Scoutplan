import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator
} from 'react-native';
import { X, Printer, Download, FileText, CheckCircle } from 'lucide-react-native';
import { ProgramaScout } from '../types/programa';
import { SDG_LIST } from '../data/sdgData';
import { GROWTH_AREAS, GrowthAreaKey } from '../data/achievementIndicatorsData';
import { UNIT_PROGRAMA_LOGOS, SCOUT_WOSM_LOGO, GROUP_ORION_LOGO, REGISTRATION_BADGES } from '../data/registrationBadgesData';
import { docxProgramaGenerator } from '../lib/docxProgramaGenerator';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

interface Props {
  visible: boolean;
  programa: ProgramaScout | null;
  onClose: () => void;
}

export function ProgramaPdfPreviewModal({ visible, programa, onClose }: Props) {
  const { isDarkMode, primaryColor } = useTheme();
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!programa) return null;

  const unitLogo = UNIT_PROGRAMA_LOGOS[programa.unit] || SCOUT_WOSM_LOGO;
  const regBadge = REGISTRATION_BADGES.find(r => r.id === programa.registrationBadgeId) || REGISTRATION_BADGES[0];

  const handleDownloadPdf = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const container = document.getElementById('printable-scout-programa');
      if (!container) return;

      const cleanTitle = (programa.title || 'Actividad').trim().replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ ]/g, '_').replace(/\s+/g, '_');
      const cleanDate = (programa.date || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const fileUnitLabel = programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1
        ? `${programa.selectedUnits.map(u => u.toUpperCase()).join('_')}_SINODAL`
        : (programa.unit || 'CLAN').toUpperCase();
      const pdfFileName = `Programa_${fileUnitLabel}_${cleanTitle}_${cleanDate}`;

      const originalTitle = document.title;
      document.title = pdfFileName;

      // Inyectar CSS de impresión full-bleed a nivel raíz
      const printStyleId = 'scout-print-styles';
      let existingStyle = document.getElementById(printStyleId);
      const cssContent = `
        @page {
          size: letter portrait;
          margin: 0 !important;
        }
        @media print {
          @page {
            size: letter portrait;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          body > *:not(#asv-print-clone-root) {
            display: none !important;
          }
          #asv-print-clone-root {
            display: flex !important;
            position: relative !important;
            width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            z-index: 2147483647 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #asv-print-clone-root .asv-print-header,
          #asv-print-clone-root .asv-print-header img,
          #asv-print-clone-root .asv-print-header > div {
            width: 100% !important;
            height: 82px !important;
            min-height: 82px !important;
            max-height: 82px !important;
            display: block !important;
            object-fit: fill !important;
            margin: 0 !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
          }
          #asv-print-clone-root .asv-print-footer,
          #asv-print-clone-root .asv-print-footer img,
          #asv-print-clone-root .asv-print-footer > div {
            width: 100% !important;
            height: 86px !important;
            min-height: 86px !important;
            max-height: 86px !important;
            display: block !important;
            object-fit: fill !important;
            margin: 0 !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
            margin-top: auto !important;
          }
          #asv-print-clone-root .asv-print-content {
            padding-left: 28px !important;
            padding-right: 28px !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
            flex: 1 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
          }
        }
      `;
      if (!existingStyle) {
        existingStyle = document.createElement('style');
        existingStyle.id = printStyleId;
        document.head.appendChild(existingStyle);
      }
      existingStyle.innerHTML = cssContent;

      // Crear clon directo en body
      const clone = container.cloneNode(true) as HTMLElement;
      clone.id = 'asv-print-clone-root';
      const cloneChildren = clone.children;
      // [0]=watermark, [1]=header, [2]=content, [3]=footer
      if (cloneChildren[1]) cloneChildren[1].classList.add('asv-print-header');
      if (cloneChildren[2]) cloneChildren[2].classList.add('asv-print-content');
      if (cloneChildren[3]) cloneChildren[3].classList.add('asv-print-footer');
      document.body.appendChild(clone);

      window.print();

      // Limpiar clon y restaurar título después de imprimir
      setTimeout(() => {
        if (clone && clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
        document.title = originalTitle;
      }, 2000);
    } else {
      showAlert('Descargar PDF', 'Para descargar en PDF, selecciona la opción "Guardar como PDF".');
    }
  };

  const handleDownloadWord = async () => {
    setDownloadingDocx(true);
    try {
      await docxProgramaGenerator.generateAndDownload(programa);
      showAlert('Descarga Exitosa', 'El archivo Word (.docx) se ha descargado correctamente.');
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo generar el documento Word.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        {/* Barra superior de herramientas del Visor PDF */}
        <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          <View style={styles.titleInfo}>
            <FileText size={20} color={primaryColor} />
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#000000' }]} numberOfLines={1}>
              Visor PDF: {programa.title || 'Sin Título'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.btnDocx, { backgroundColor: '#2563eb' }]}
              onPress={handleDownloadWord}
              disabled={downloadingDocx}
            >
              {downloadingDocx ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Download size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Descargar como Documento Word</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrint, { backgroundColor: '#dc2626' }]}
              onPress={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Download size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Descargar como Documento PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <X size={22} color={isDarkMode ? '#ffffff' : '#4b5563'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hoja de visualización tipo papel A4 con diseño oficial */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.paperSheet} id="printable-scout-programa">
            {/* MARCA DE AGUA INSTITUCIONAL ASV EN EL FONDO */}
            <Image
              source={{ uri: '/programa_assets/asv_watermark.png' }}
              style={styles.watermarkBg}
              resizeMode="contain"
            />

            {/* ENCABEZADO SUPERIOR INSTITUCIONAL ASV (FULL WIDTH SIN BORDES BLANCOS) */}
            <Image
              source={{ uri: '/programa_assets/asv_header.png' }}
              style={styles.asvHeaderImg}
              nativeID="asv-print-header"
              resizeMode="stretch"
            />

            {/* CONTENIDO INTERNO DEL PROGRAMA */}
            <View style={styles.sheetInnerContent} nativeID="asv-print-content">
              {/* TIRA DE LOGOS OFICIALES */}
              <View style={styles.logosStrip}>
                {programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 0 ? (
                  programa.selectedUnits.map(u => (
                    <Image
                      key={u}
                      source={{ uri: UNIT_PROGRAMA_LOGOS[u] || SCOUT_WOSM_LOGO }}
                      style={styles.logoItem}
                      resizeMode="contain"
                    />
                  ))
                ) : (
                  <Image source={{ uri: unitLogo }} style={styles.logoItem} resizeMode="contain" />
                )}
                <Image source={{ uri: SCOUT_WOSM_LOGO }} style={styles.logoItem} resizeMode="contain" />
                <Image source={{ uri: GROUP_ORION_LOGO }} style={styles.logoItem} resizeMode="contain" />
                <Image source={{ uri: regBadge.imageUri }} style={[styles.logoItem, { width: 110, height: 42 }]} resizeMode="contain" />
              </View>

              {/* TÍTULO DEL PROGRAMA */}
              <Text style={styles.programaMainTitle}>
                Programa de Actividades de la Unidad {programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1 ? `(Sinodal ${programa.selectedUnits.map(u => u.toUpperCase()).join(' + ')})` : `del ${programa.unit.toUpperCase()}`}
              </Text>

              {/* TABLA 1: RESUMEN GENERAL */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvTableHeaderRow}>
                  <Text style={[styles.asvHeadCell, { flex: 1.2 }]}>Fecha</Text>
                  <Text style={[styles.asvHeadCell, { flex: 1.5 }]}>Lugar:</Text>
                  <Text style={[styles.asvHeadCell, { flex: 2 }]}>Tipo de Actividad:</Text>
                  <Text style={[styles.asvHeadCell, { flex: 1.2 }]}>Rama:</Text>
                  <Text style={[styles.asvHeadCell, { flex: 1.5 }]}>Número de Participante</Text>
                </View>
                <View style={styles.asvTableDataRow}>
                  <Text style={[styles.asvBodyCell, { flex: 1.2 }]}>{programa.date || 'Sin fecha'}</Text>
                  <Text style={[styles.asvBodyCell, { flex: 1.5 }]}>{programa.location || 'Por definir'}</Text>
                  <Text style={[styles.asvBodyCell, { flex: 2 }]}>{programa.activityType || 'Actividad'}</Text>
                  <Text style={[styles.asvBodyCell, { flex: 1.2, fontWeight: 'bold', textTransform: 'capitalize' }]}>
                    {programa.isSinodal && programa.selectedUnits && programa.selectedUnits.length > 1
                      ? `${programa.selectedUnits.map(u => u.toUpperCase()).join(' + ')} (Sinodal)`
                      : programa.unit}
                  </Text>
                  <Text style={[styles.asvBodyCell, { flex: 1.5 }]}>{programa.participantProjection || 'N/A'}</Text>
                </View>
              </View>

              {/* TABLA 2: CAJA DE OBJETIVOS (GENERAL Y ESPECÍFICOS) */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvBoxContent}>
                  <Text style={styles.asvBoxHeaderTitle}>Objetivo General: </Text>
                  <Text style={styles.asvBoxParagraph}>{programa.generalObjective || 'No especificado'}</Text>

                  <Text style={[styles.asvBoxHeaderTitle, { marginTop: 8 }]}>Objetivos Específicos:</Text>
                  {programa.specificObjectives && programa.specificObjectives.length > 0 ? (
                    programa.specificObjectives.map((obj, i) => (
                      <Text key={i} style={styles.asvBulletItem}>* {obj}</Text>
                    ))
                  ) : (
                    <Text style={styles.asvBoxParagraph}>Sin objetivos específicos registrados.</Text>
                  )}
                </View>
              </View>

              {/* TABLA 3: CAJA DE METAS ESPECÍFICAS */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvBoxContent}>
                  <Text style={styles.asvBoxHeaderTitle}>Metas Específicas:</Text>
                  {programa.specificMetas && programa.specificMetas.length > 0 ? (
                    programa.specificMetas.map((meta, i) => (
                      <Text key={i} style={styles.asvBulletItem}>* {meta}</Text>
                    ))
                  ) : (
                    <Text style={styles.asvBoxParagraph}>Sin metas específicas registradas.</Text>
                  )}
                </View>
              </View>

              {/* TABLA 4: CAJA DE INDICADORES DE LOGRO */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvBoxContent}>
                  <Text style={styles.asvBoxHeaderTitle}>Indicadores de Logro:</Text>
                  {(() => {
                    const areaKeys = Object.keys(GROWTH_AREAS) as GrowthAreaKey[];
                    const renderedAreas = areaKeys.map(areaKey => {
                      const areaInfo = GROWTH_AREAS[areaKey];
                      const list = programa.indicators[areaKey] || [];
                      if (!list || list.length === 0) return null;
                      return (
                        <View key={areaKey} style={{ marginTop: 4, marginBottom: 2 }}>
                          <Text style={styles.indicatorAreaHeading}>-{areaInfo.name}:</Text>
                          {list.map((ind, idx) => (
                            <Text key={idx} style={styles.indicatorDotItem}>. {ind}</Text>
                          ))}
                        </View>
                      );
                    }).filter(Boolean);

                    if (renderedAreas.length === 0) {
                      return (
                        <Text style={styles.asvBoxParagraph}>Sin indicadores de logro seleccionados.</Text>
                      );
                    }
                    return renderedAreas;
                  })()}
                </View>
              </View>

              {/* TABLA 5: CAJA DE OBJETIVOS DE DESARROLLO SOSTENIBLE (ODS) */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvBoxContent}>
                  <Text style={styles.asvBoxHeaderTitle}>Objetivos de Desarrollo Sostenible (ODS):</Text>
                  <Text style={styles.asvBoxParagraph}>
                    {programa.selectedSDGs && programa.selectedSDGs.length > 0
                      ? programa.selectedSDGs.map(num => {
                          const sdg = SDG_LIST.find(s => s.number === num);
                          return `ODS #${num}: ${sdg?.name || sdg?.shortName || ''}`;
                        }).join('   ')
                      : 'Ningún ODS seleccionado.'}
                  </Text>
                </View>
              </View>

              {/* TABLA 6: CRONOGRAMA DE ACTIVIDADES */}
              <View style={styles.asvTableBox}>
                <View style={styles.asvTableHeaderRow}>
                  <Text style={[styles.asvHeadCell, { flex: 1.5 }]}>Horario (AM - PM)</Text>
                  <Text style={[styles.asvHeadCell, { flex: 3.5 }]}>Actividad / Descripción</Text>
                  <Text style={[styles.asvHeadCell, { flex: 1.8 }]}>Responsable</Text>
                  <Text style={[styles.asvHeadCell, { flex: 1.8 }]}>Materiales</Text>
                </View>

                {programa.schedule && programa.schedule.length > 0 ? (
                  programa.schedule.map((item, index) => (
                    <View key={item.id || index} style={styles.asvTableDataRow}>
                      <Text style={[styles.asvBodyCell, { flex: 1.5, fontWeight: '600' }]}>{item.timeRange}</Text>
                      <View style={[styles.asvBodyCell, { flex: 3.5, alignItems: 'flex-start' }]}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000000' }}>{item.title}</Text>
                        {item.description ? (
                          <Text style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>{item.description}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.asvBodyCell, { flex: 1.8 }]}>{item.responsible || '-'}</Text>
                      <Text style={[styles.asvBodyCell, { flex: 1.8 }]}>{item.materials || '-'}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.asvTableDataRow}>
                    <Text style={[styles.asvBodyCell, { flex: 1, fontStyle: 'italic' }]}>
                      Sin actividades en el cronograma.
                    </Text>
                  </View>
                )}

                {/* FILA DE NOTAS IMPORTANTES */}
                <View style={styles.asvNotesRow}>
                  <View style={styles.asvNotesHeadCell}>
                    <Text style={styles.asvNotesHeadText}>NOTAS IMPORTANTES</Text>
                  </View>
                  <View style={styles.asvNotesBodyCell}>
                    <Text style={styles.asvNotesBodyText}>
                      {programa.importantNotes || 'Cada integrante debe dominar su ponencia y dar lo mejor de sí en este servicio scout.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* PIE DE PÁGINA OFICIAL DE LA ASV (FULL WIDTH SIN BORDES BLANCOS) */}
            <Image
              source={{ uri: '/programa_assets/asv_footer.png' }}
              style={styles.asvFooterImg}
              nativeID="asv-print-footer"
              resizeMode="stretch"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDocx: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  btnClose: {
    padding: 6,
    marginLeft: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  paperSheet: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  sheetInnerContent: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    zIndex: 1,
  },
  watermarkBg: {
    position: 'absolute',
    top: '20%',
    left: '12%',
    right: '12%',
    width: '76%',
    height: '60%',
    opacity: 0.12,
    zIndex: 0,
    pointerEvents: 'none',
  },
  asvHeaderImg: {
    width: '100%',
    height: 82,
    zIndex: 1,
  },
  asvFooterImg: {
    width: '100%',
    height: 86,
    zIndex: 1,
    marginTop: 10,
  },
  logosStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
    zIndex: 1,
  },
  logoItem: {
    width: 48,
    height: 48,
  },
  programaMainTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    marginVertical: 8,
    zIndex: 1,
  },
  asvTableBox: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  asvTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#B2A1C7',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  asvHeadCell: {
    padding: 4,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
    textAlign: 'center',
  },
  asvTableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  asvBodyCell: {
    padding: 5,
    fontSize: 9,
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
    textAlign: 'center',
  },
  asvBoxContent: {
    padding: 8,
  },
  asvBoxHeaderTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#000000',
    marginBottom: 3,
  },
  asvBoxParagraph: {
    fontSize: 9.5,
    color: '#000000',
    lineHeight: 14,
  },
  asvBulletItem: {
    fontSize: 9.5,
    color: '#000000',
    marginLeft: 4,
    lineHeight: 14,
    marginBottom: 2,
  },
  indicatorAreaHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 3,
    marginBottom: 1,
  },
  indicatorDotItem: {
    fontSize: 9.5,
    color: '#000000',
    marginLeft: 6,
    lineHeight: 14,
    marginBottom: 2,
  },
  indicatorAreaSubtitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#4c1d95',
    marginTop: 2,
  },
  asvAreasFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#f3e8ff',
    paddingVertical: 4,
  },
  asvAreaNameCell: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#4c1d95',
    textAlign: 'center',
  },
  sdgChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  sdgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sdgBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  asvNotesRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#000000',
    backgroundColor: 'transparent',
  },
  asvNotesHeadCell: {
    width: 120,
    padding: 6,
    backgroundColor: '#B2A1C7',
    borderRightWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  asvNotesHeadText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  asvNotesBodyCell: {
    flex: 1,
    padding: 6,
    justifyContent: 'center',
  },
  asvNotesBodyText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 13,
  },
});
