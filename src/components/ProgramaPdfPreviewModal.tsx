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

  if (!programa) return null;

  const unitLogo = UNIT_PROGRAMA_LOGOS[programa.unit] || SCOUT_WOSM_LOGO;
  const regBadge = REGISTRATION_BADGES.find(r => r.id === programa.registrationBadgeId) || REGISTRATION_BADGES[0];

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      showAlert('Imprimir', 'Usa la versión Web o descarga el archivo Word para imprimir en alta resolución.');
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
        {/* Barra superior de herramientas */}
        <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          <View style={styles.titleInfo}>
            <FileText size={20} color={primaryColor} />
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#000000' }]} numberOfLines={1}>
              Programa: {programa.title}
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
                  <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Descargar Word</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrint, { backgroundColor: primaryColor }]}
              onPress={handlePrint}
            >
              <Printer size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Imprimir / PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <X size={22} color={isDarkMode ? '#ffffff' : '#4b5563'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hoja de visualización tipo papel A4 con diseño oficial */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.paperSheet} id="printable-scout-programa">
            {/* ENCABEZADO SUPERIOR INSTITUCIONAL ASV */}
            <View style={styles.asvHeaderBand}>
              <View style={styles.asvHeaderLeft}>
                <Text style={styles.asvHeaderTitle}>SCOUTS</Text>
                <Text style={styles.asvHeaderSub}>Venezuela</Text>
              </View>
              <View style={styles.asvHeaderRight}>
                <Text style={styles.asvOrgText}>Organización Mundial del Movimiento Scout</Text>
                <Text style={styles.asvRegionText}>Región Interamericana</Text>
                <Text style={styles.asvAsocText}>Asociación de Scouts de Venezuela</Text>
              </View>
            </View>

            {/* BARRA DECORATIVA TRICOLOR */}
            <View style={styles.tricolorBar}>
              <View style={[styles.triSegment, { backgroundColor: '#f59e0b' }]} />
              <View style={[styles.triSegment, { backgroundColor: '#3b82f6' }]} />
              <View style={[styles.triSegment, { backgroundColor: '#ef4444' }]} />
            </View>

            {/* TIRA DE LOGOS OFICIALES */}
            <View style={styles.logosStrip}>
              <Image source={{ uri: unitLogo }} style={styles.logoItem} resizeMode="contain" />
              <Image source={{ uri: SCOUT_WOSM_LOGO }} style={styles.logoItem} resizeMode="contain" />
              <Image source={{ uri: GROUP_ORION_LOGO }} style={styles.logoItem} resizeMode="contain" />
              <Image source={{ uri: regBadge.imageUri }} style={[styles.logoItem, { width: 110, height: 42 }]} resizeMode="contain" />
            </View>

            {/* TÍTULO DEL PROGRAMA */}
            <Text style={styles.programaMainTitle}>
              Programa de Actividades: {programa.title}
            </Text>

            {/* TABLA DE RESUMEN PRINCIPAL */}
            <View style={styles.summaryTable}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>Fecha</Text>
                <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Lugar:</Text>
                <Text style={[styles.tableHeadCell, { flex: 2 }]}>Tipo de Actividad:</Text>
                <Text style={[styles.tableHeadCell, { flex: 1 }]}>Rama:</Text>
                <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Proyección de Participantes</Text>
              </View>
              <View style={styles.tableDataRow}>
                <Text style={[styles.tableBodyCell, { flex: 1.2 }]}>{programa.date || 'Sin fecha'}</Text>
                <Text style={[styles.tableBodyCell, { flex: 1.5 }]}>{programa.location || 'Por definir'}</Text>
                <Text style={[styles.tableBodyCell, { flex: 2 }]}>{programa.activityType || 'Actividad'}</Text>
                <Text style={[styles.tableBodyCell, { flex: 1, fontWeight: 'bold', textTransform: 'capitalize' }]}>{programa.unit}</Text>
                <Text style={[styles.tableBodyCell, { flex: 1.5 }]}>{programa.participantProjection || 'N/A'}</Text>
              </View>
            </View>

            {/* OBJETIVO GENERAL */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Objetivo General:</Text>
              <Text style={styles.sectionContent}>{programa.generalObjective || 'No especificado'}</Text>
            </View>

            {/* OBJETIVOS ESPECÍFICOS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Objetivos Específicos:</Text>
              {programa.specificObjectives && programa.specificObjectives.length > 0 ? (
                programa.specificObjectives.map((obj, i) => (
                  <Text key={i} style={styles.bulletItem}>* {obj}</Text>
                ))
              ) : (
                <Text style={styles.sectionContent}>Sin objetivos específicos registrados.</Text>
              )}
            </View>

            {/* METAS ESPECÍFICAS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Metas Específicas:</Text>
              {programa.specificMetas && programa.specificMetas.length > 0 ? (
                programa.specificMetas.map((meta, i) => (
                  <Text key={i} style={styles.bulletItem}>* {meta}</Text>
                ))
              ) : (
                <Text style={styles.sectionContent}>Sin metas específicas registradas.</Text>
              )}
            </View>

            {/* ODS DE LA ONU */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Objetivos de Desarrollo Sostenible (ODS):</Text>
              {programa.selectedSDGs && programa.selectedSDGs.length > 0 ? (
                <View style={styles.sdgChipsWrapper}>
                  {programa.selectedSDGs.map(num => {
                    const sdg = SDG_LIST.find(s => s.number === num);
                    return (
                      <View key={num} style={[styles.sdgBadge, { backgroundColor: sdg?.color || '#3b82f6' }]}>
                        <Text style={styles.sdgBadgeText}>ODS #{num}: {sdg?.shortName || sdg?.name}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.sectionContent}>Ningún ODS seleccionado.</Text>
              )}
            </View>

            {/* INDICADORES DE LOGRO (6 ÁREAS DE CRECIMIENTO) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Indicadores de Logro:</Text>
              {Object.keys(GROWTH_AREAS).map(areaKey => {
                const areaInfo = GROWTH_AREAS[areaKey as GrowthAreaKey];
                const list = programa.indicators[areaKey as GrowthAreaKey] || [];
                return (
                  <View key={areaKey} style={styles.indicatorAreaBlock}>
                    <Text style={styles.indicatorAreaHeader}>-{areaInfo.name}:</Text>
                    {list.length > 0 ? (
                      list.map((ind, idx) => (
                        <Text key={idx} style={styles.indicatorItemText}>. {ind}</Text>
                      ))
                    ) : (
                      <Text style={styles.indicatorItemMissing}>. Sin indicadores asignados en esta área</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* TABLA DE CRONOGRAMA / ITINERARIO */}
            <View style={[styles.sectionBlock, { marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Cronograma de Actividades:</Text>
              <View style={styles.scheduleTable}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={[styles.scheduleHeadCell, { flex: 1.2 }]}>Horario (AM - PM)</Text>
                  <Text style={[styles.scheduleHeadCell, { flex: 3.5 }]}>Actividad / Descripción</Text>
                  <Text style={[styles.scheduleHeadCell, { flex: 1.5 }]}>Responsable</Text>
                  <Text style={[styles.scheduleHeadCell, { flex: 1.5 }]}>Materiales</Text>
                </View>

                {programa.schedule && programa.schedule.length > 0 ? (
                  programa.schedule.map((item, idx) => (
                    <View key={item.id || idx} style={styles.scheduleDataRow}>
                      <Text style={[styles.scheduleBodyCell, { flex: 1.2, fontWeight: 'bold' }]}>
                        {item.timeRange}
                      </Text>
                      <View style={[styles.scheduleBodyCell, { flex: 3.5 }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 2 }}>{item.title}</Text>
                        {item.description ? (
                          <Text style={{ fontSize: 10, color: '#374151' }}>{item.description}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.scheduleBodyCell, { flex: 1.5 }]}>{item.responsible}</Text>
                      <Text style={[styles.scheduleBodyCell, { flex: 1.5 }]}>{item.materials || 'N/A'}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.scheduleDataRow}>
                    <Text style={[styles.scheduleBodyCell, { flex: 1, textAlign: 'center', fontStyle: 'italic' }]}>
                      Sin actividades registradas en el cronograma.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* NOTAS IMPORTANTES */}
            {programa.importantNotes ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Notas Importantes:</Text>
                <Text style={styles.sectionContent}>{programa.importantNotes}</Text>
              </View>
            ) : null}

            {/* PIE DE PÁGINA OFICIAL DE LA ASV */}
            <View style={styles.asvFooterBand}>
              <View style={styles.footerStarsRow}>
                <Text style={styles.footerStars}>★ ★ ★ ★ ★ ★ ★ ★</Text>
              </View>
              <View style={styles.footerContentRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.footerTextBold}>Oficina Scout Nacional, Edificio Askain, piso 1, Oficina 1-1. Plaza Brión, Chacaíto.</Text>
                  <Text style={styles.footerText}>Urb. El Rosal. Caracas, Venezuela.</Text>
                  <Text style={styles.footerText}>Teléfono: (+58) (212) 951.56.13</Text>
                  <Text style={styles.footerText}>Correo Electrónico: direccion@scoutsvenezuela.org.ve</Text>
                  <Text style={styles.footerText}>Fundada en Venezuela 1913. Miembro de la Organización del Movimiento Scout desde 1936.</Text>
                </View>
                <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                  <Text style={styles.footerTextBold}>VISIÓN ASV</Text>
                  <Text style={[styles.footerText, { textAlign: 'right' }]}>
                    Para el 2023, el Movimiento Scout será el movimiento juvenil educativo líder en el mundo...
                  </Text>
                  <Text style={[styles.footerTextBold, { marginTop: 4 }]}>Rif: J-00066665-2</Text>
                </View>
              </View>
            </View>
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
    borderRadius: 6,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  asvHeaderBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4c1d95',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
  },
  asvHeaderLeft: {
    flexDirection: 'column',
  },
  asvHeaderTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  asvHeaderSub: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  asvHeaderRight: {
    alignItems: 'flex-end',
  },
  asvOrgText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  asvRegionText: {
    color: '#e9d5ff',
    fontSize: 9,
  },
  asvAsocText: {
    color: '#f3e8ff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tricolorBar: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  triSegment: {
    flex: 1,
    height: '100%',
  },
  logosStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 12,
  },
  logoItem: {
    width: 48,
    height: 48,
  },
  programaMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    marginVertical: 8,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#c4b5fd',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  tableHeadCell: {
    padding: 4,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
  },
  tableBodyCell: {
    padding: 6,
    fontSize: 9,
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
    textAlign: 'center',
  },
  sectionBlock: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#000000',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 10,
    color: '#1f2937',
    lineHeight: 15,
  },
  bulletItem: {
    fontSize: 10,
    color: '#1f2937',
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 15,
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
  indicatorAreaBlock: {
    marginBottom: 4,
  },
  indicatorAreaHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  indicatorItemText: {
    fontSize: 9,
    color: '#374151',
    marginLeft: 8,
    lineHeight: 13,
  },
  indicatorItemMissing: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  scheduleTable: {
    borderWidth: 1,
    borderColor: '#000000',
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#c4b5fd',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  scheduleHeadCell: {
    padding: 5,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
    textAlign: 'center',
  },
  scheduleDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  scheduleBodyCell: {
    padding: 6,
    fontSize: 9,
    color: '#000000',
    borderRightWidth: 1,
    borderColor: '#000000',
  },
  asvFooterBand: {
    backgroundColor: '#4c1d95',
    padding: 10,
    marginTop: 20,
    borderRadius: 4,
  },
  footerStarsRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  footerStars: {
    color: '#ffffff',
    fontSize: 9,
    letterSpacing: 4,
  },
  footerContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerTextBold: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#e9d5ff',
    fontSize: 6.5,
    lineHeight: 9,
  },
});
