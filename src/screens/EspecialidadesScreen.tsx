import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Linking,
  Dimensions
} from 'react-native';
import {
  Award,
  Search,
  Download,
  Eye,
  X,
  ExternalLink,
  Filter,
  ArrowLeft,
  Globe,
  Share2,
  FileCheck
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import {
  SCOUT_SPECIALTIES,
  SPECIALTY_CATEGORIES,
  ScoutSpecialty,
  SpecialtyCategoryId
} from '../data/specialtiesData';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

export default function EspecialidadesScreen({ navigation }: any) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SpecialtyCategoryId>('todos');
  const [selectedSpecialty, setSelectedSpecialty] = useState<ScoutSpecialty | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(viewModalVisible, () => setViewModalVisible(false));

  const filteredSpecialties = useMemo(() => {
    return SCOUT_SPECIALTIES.filter(spec => {
      const matchesCategory =
        selectedCategory === 'todos' || spec.category === selectedCategory;
      const matchesSearch =
        spec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleOpenSpecialty = (spec: ScoutSpecialty) => {
    if (Platform.OS === 'web') {
      setSelectedSpecialty(spec);
      setViewModalVisible(true);
    } else {
      Linking.openURL(spec.pdfUrl).catch(() => {
        showAlert('Especialidad', 'Abriendo guía oficial en el navegador...');
      });
    }
  };

  const handleDownloadSpecialty = (spec: ScoutSpecialty) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = spec.pdfUrl;
      a.download = `Especialidad_${spec.title.replace(/\s+/g, '_')}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Linking.openURL(spec.pdfUrl).catch(() => {
        showAlert('Descarga', 'Abriendo guía oficial en el navegador...');
      });
    }
  };

  const handleOpenExternalASV = () => {
    const url = 'https://scouts.org.ve/especialidades/';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        showAlert('Enlace', 'No se pudo abrir el sitio oficial de la ASV');
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Cabecera Principal */}
        <View style={[styles.headerBanner, { backgroundColor: isDarkMode ? '#18181b' : primaryColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigateBackOrHome(navigation, user?.role)}
              activeOpacity={0.8}
            >
              <ArrowLeft size={16} color="#ffffff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Volver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.asvLinkBtn}
              onPress={handleOpenExternalASV}
              activeOpacity={0.8}
            >
              <Globe size={15} color="#ffffff" />
              <Text style={styles.asvLinkBtnText}>Sitio Oficial ASV</Text>
              <ExternalLink size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerIconCircle}>
            <Award size={32} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Catálogo de Especialidades Scout</Text>
          <Text style={styles.headerSubtitle}>
            Guías curriculares oficiales de la Asociación de Scouts de Venezuela (ASV). Explora los requisitos y temas de las 39 especialidades reconocidas.
          </Text>

          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatBadge}>
              <Text style={styles.headerStatNumber}>39</Text>
              <Text style={styles.headerStatLabel}>Especialidades</Text>
            </View>
            <View style={styles.headerStatBadge}>
              <Text style={styles.headerStatNumber}>8</Text>
              <Text style={styles.headerStatLabel}>Áreas Oficiales</Text>
            </View>
            <View style={styles.headerStatBadge}>
              <Text style={styles.headerStatNumber}>PDF</Text>
              <Text style={styles.headerStatLabel}>Guías Oficiales</Text>
            </View>
          </View>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Search size={18} color={theme.subText} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar especialidad (ej. Astronomía, Cuerdas, Cocina)..."
              placeholderTextColor={theme.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color={theme.subText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categorías / Pestañas de Filtro */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {SPECIALTY_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'todos' 
              ? SCOUT_SPECIALTIES.length 
              : SCOUT_SPECIALTIES.filter(s => s.category === cat.id).length;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? primaryColor
                      : isDarkMode
                      ? '#27272a'
                      : '#ffffff',
                    borderColor: isSelected ? primaryColor : theme.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, marginRight: 6 }}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? '#ffffff' : theme.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Especialidades */}
        <View style={styles.specialtiesList}>
          {filteredSpecialties.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Filter size={40} color={theme.subText} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                No se encontraron especialidades
              </Text>
              <Text style={[styles.emptyStateDesc, { color: theme.subText }]}>
                Prueba con otro término de búsqueda o selecciona otra categoría.
              </Text>
            </View>
          ) : (
            filteredSpecialties.map(spec => (
              <View
                key={spec.id}
                style={[
                  styles.specialtyCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Cabecera de la tarjeta con color y etiqueta */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconWrap, { backgroundColor: `${spec.color}20`, borderColor: `${spec.color}50` }]}>
                    <Text style={{ fontSize: 26 }}>{spec.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.categoryTag, { backgroundColor: `${spec.color}15`, borderColor: `${spec.color}40` }]}>
                        <Text style={[styles.categoryTagText, { color: spec.color }]}>
                          {spec.categoryIcon} {spec.categoryLabel}
                        </Text>
                      </View>
                      <View style={[styles.officialTag, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                        <Text style={[styles.officialTagText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                          ASV Oficial
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.specialtyTitle, { color: theme.text }]}>
                      {spec.title}
                    </Text>
                  </View>
                </View>

                {/* Descripción */}
                <Text style={[styles.specialtyDesc, { color: theme.subText }]}>
                  {spec.description}
                </Text>

                {/* Botones de acción */}
                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.viewBtn, { backgroundColor: `${primaryColor}15` }]}
                    onPress={() => handleOpenSpecialty(spec)}
                    activeOpacity={0.8}
                  >
                    <Eye size={16} color={primaryColor} />
                    <Text style={[styles.actionBtnText, { color: primaryColor }]}>
                      Ver Guía PDF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.downloadBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}
                    onPress={() => handleDownloadSpecialty(spec)}
                    activeOpacity={0.8}
                  >
                    <Download size={16} color={theme.text} />
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>
                      Descargar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MODAL VISOR DE PDF EN WEB */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#121214' : '#f8fafc' }]}>
          {/* Header del Visor */}
          <View style={[styles.modalHeader, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]} numberOfLines={1}>
                {selectedSpecialty?.icon} {selectedSpecialty?.title}
              </Text>
              <Text style={[styles.modalHeaderSub, { color: theme.subText }]} numberOfLines={1}>
                {selectedSpecialty?.categoryLabel} • Guía Oficial ASV
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedSpecialty && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: primaryColor }]}
                  onPress={() => handleDownloadSpecialty(selectedSpecialty)}
                  activeOpacity={0.8}
                >
                  <Download size={16} color="#ffffff" />
                  <Text style={styles.modalActionBtnText}>Descargar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                onPress={() => setViewModalVisible(false)}
                activeOpacity={0.8}
              >
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Iframe o contenido web */}
          <View style={styles.modalBody}>
            {Platform.OS === 'web' && selectedSpecialty ? (
              // @ts-ignore
              <iframe
                src={`${selectedSpecialty.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={selectedSpecialty.title}
              />
            ) : (
              <View style={styles.fallbackViewer}>
                <Award size={48} color={primaryColor} style={{ marginBottom: 16 }} />
                <Text style={[styles.fallbackTitle, { color: theme.text }]}>
                  {selectedSpecialty?.title}
                </Text>
                <Text style={[styles.fallbackDesc, { color: theme.subText }]}>
                  En dispositivos móviles, las guías oficiales se visualizan directamente a través del lector de PDF del sistema.
                </Text>
                {selectedSpecialty && (
                  <TouchableOpacity
                    style={[styles.openExternalBtn, { backgroundColor: primaryColor }]}
                    onPress={() => handleDownloadSpecialty(selectedSpecialty)}
                  >
                    <Download size={18} color="#ffffff" />
                    <Text style={styles.openExternalBtnText}>Abrir Guía en Navegador</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    gap: 6,
  },
  asvLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  asvLinkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#f3e8ff',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 580,
    marginBottom: 16,
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 420,
    marginTop: 4,
  },
  headerStatBadge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: -16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },
  specialtiesList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  specialtyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  officialTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  officialTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  specialtyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  specialtyDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  viewBtn: {},
  downloadBtn: {},
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateDesc: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalHeaderSub: {
    fontSize: 12,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  modalBody: {
    flex: 1,
  },
  fallbackViewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
    marginBottom: 20,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 8,
  },
  openExternalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
