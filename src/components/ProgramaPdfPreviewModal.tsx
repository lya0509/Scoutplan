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
            {/* MARCA DE AGUA INSTITUCIONAL ASV EN EL FONDO */}
            <Image
              source={{ uri: '/programa_assets/asv_watermark.png' }}
              style={styles.watermarkBg}
              resizeMode="contain"
            />

            {/* ENCABEZADO SUPERIOR INSTITUCIONAL ASV */}
            <Image
              source={{ uri: '/programa_assets/asv_header.png' }}
              style={styles.asvHeaderImg}
              resizeMode="contain"
            />

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
                <Text style={styles.asvBoxParagraph}>{programa.generalObjective || 'Fomentar competencias clave para actividades al aire libre y crecimiento integral.'}</Text>

                <Text style={[styles.asvBoxHeaderTitle, { marginTop: 8 }]}>Objetivos Específicos:</Text>
                {programa.specificObjectives && programa.specificObjectives.length > 0 ? (
                  programa.specificObjectives.map((obj, i) => (
                    <Text key={i} style={styles.asvBulletItem}>* {obj}</Text>
                  ))
                ) : (
                  <Text style={styles.asvBoxParagraph}>* Enseñar y aplicar las técnicas scouts correspondientes a la actividad.</Text>
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
                  <Text style={styles.asvBoxParagraph}>* Lograr la participación activa y el aprendizaje de todos los integrantes.</Text>
                )}
              </View>
            </View>

            {/* TABLA 4: CAJA DE INDICADORES DE LOGRO */}
            <View style={styles.asvTableBox}>
              <View style={styles.asvBoxContent}>
                <Text style={styles.asvBoxHeaderTitle}>Indicadores de Logro:</Text>
                {(() => {
                  const allIndicators: string[] = [];
                  Object.keys(GROWTH_AREAS).forEach(areaKey => {
                    const list = programa.indicators[areaKey as GrowthAreaKey] || [];
                    list.forEach(ind => {
                      if (ind && ind.trim()) allIndicators.push(ind.trim());
                    });
                  });
                  if (allIndicators.length === 0) {
                    return (
                      <>
                        <Text style={styles.asvBulletItem}>* Disfruta de las actividades scouts y proyectos de unidad.</Text>
                        <Text style={styles.asvBulletItem}>* Vela porque la conducta y accionar vaya acorde a la Ley y la Promesa.</Text>
                      </>
                    );
                  }
                  return allIndicators.map((ind, idx) => (
                    <Text key={idx} style={styles.asvBulletItem}>* {ind}</Text>
                  ));
                })()}
              </View>
              {/* Barra inferior de las 6 áreas de crecimiento del formato oficial */}
              <View style={styles.asvAreasFooterRow}>
                <Text style={styles.asvAreaNameCell}>Corporalidad</Text>
                <Text style={styles.asvAreaNameCell}>Carácter</Text>
                <Text style={styles.asvAreaNameCell}>Espiritualidad</Text>
                <Text style={styles.asvAreaNameCell}>Sociabilidad</Text>
                <Text style={styles.asvAreaNameCell}>Creatividad</Text>
                <Text style={styles.asvAreaNameCell}>Afectividad</Text>
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
                    : 'ODS #4: Educación de calidad.   ODS #15: Vida en ecosistemas terrestres'}
                </Text>
              </View>
            </View>

            {/* TABLA 6: CRONOGRAMA DE ACTIVIDADES CON NOTAS IMPORTANTES */}
            <View style={styles.asvTableBox}>
              <View style={styles.asvTableHeaderRow}>
                <Text style={[styles.asvHeadCell, { flex: 1.2 }]}>Horario (AM - PM)</Text>
                <Text style={[styles.asvHeadCell, { flex: 3.5 }]}>Actividad / Descripción</Text>
                <Text style={[styles.asvHeadCell, { flex: 1.5 }]}>Responsable</Text>
                <Text style={[styles.asvHeadCell, { flex: 1.5 }]}>Materiales</Text>
              </View>

              {programa.schedule && programa.schedule.length > 0 ? (
                programa.schedule.map((item, idx) => (
                  <View key={item.id || idx} style={styles.asvTableDataRow}>
                    <Text style={[styles.asvBodyCell, { flex: 1.2, fontWeight: 'bold' }]}>
                      {item.timeRange}
                    </Text>
                    <View style={[styles.asvBodyCell, { flex: 3.5 }]}>
                      <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>{item.title}</Text>
                      {item.description ? (
                        <Text style={{ fontSize: 9.5, color: '#374151' }}>{item.description}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.asvBodyCell, { flex: 1.5 }]}>{item.responsible}</Text>
                    <Text style={[styles.asvBodyCell, { flex: 1.5 }]}>{item.materials || 'N/A'}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.asvTableDataRow}>
                  <Text style={[styles.asvBodyCell, { flex: 1, textAlign: 'center', fontStyle: 'italic' }]}>
                    Sin actividades registradas en el cronograma.
                  </Text>
                </View>
              )}

              {/* Fila de Notas Importantes en la tabla oficial */}
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

            {/* PIE DE PÁGINA OFICIAL DE LA ASV */}
            <Image
              source={{ uri: '/programa_assets/asv_footer.png' }}
              style={styles.asvFooterImg}
              resizeMode="contain"
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
    borderRadius: 6,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkBg: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    right: '8%',
    width: '84%',
    height: '65%',
    opacity: 0.14,
    zIndex: 0,
    pointerEvents: 'none',
  },
  asvHeaderImg: {
    width: '100%',
    height: 75,
    marginBottom: 4,
    zIndex: 1,
  },
  asvFooterImg: {
    width: '100%',
    height: 80,
    marginTop: 12,
    zIndex: 1,
  },
  logosStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 10,
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
