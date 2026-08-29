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
  Linking
} from 'react-native';
import {
  BookOpen,
  Search,
  Download,
  Eye,
  X,
  FileText,
  CheckCircle,
  ExternalLink,
  Filter,
  Layers,
  FileCode
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { SCOUT_DOCUMENTS, ScoutDocument } from '../data/documentsData';
import { showAlert } from '../utils/alert';
import HelpFloatingFAB from '../components/HelpFloatingFAB';

const CATEGORIES = [
  { id: 'todos', label: 'Todos los Documentos', icon: Layers },
  { id: 'adelanto', label: '⚜️ Adelanto e Insignias', icon: BookOpen },
  { id: 'manuales', label: '🏕️ Manuales Técnicos', icon: FileText },
  { id: 'reglamentos', label: '⚖️ Reglamentos ASV', icon: FileCode },
  { id: 'formacion', label: '🎓 Formación de Adultos', icon: CheckCircle },
];

export default function DocumentosScreen() {
  const { isDarkMode, theme, primaryColor } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedDoc, setSelectedDoc] = useState<ScoutDocument | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(viewModalVisible, () => setViewModalVisible(false));

  const filteredDocs = useMemo(() => {
    return SCOUT_DOCUMENTS.filter(doc => {
      const matchesCategory =
        selectedCategory === 'todos' || doc.category === selectedCategory;
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleOpenDoc = (doc: ScoutDocument) => {
    setSelectedDoc(doc);
    setViewModalVisible(true);
  };

  const handleDownloadDoc = (doc: ScoutDocument) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = doc.pdfUrl;
      a.download = `${doc.title}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Linking.openURL(doc.pdfUrl).catch(() => {
        showAlert('Descarga', 'Abriendo documento en el navegador...');
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cabecera Principal */}
        <View style={[styles.headerBanner, { backgroundColor: isDarkMode ? '#18181b' : primaryColor }]}>
          <View style={styles.headerIconCircle}>
            <BookOpen size={28} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Biblioteca y Documentos Scout</Text>
          <Text style={styles.headerSubtitle}>
            Consulta y descarga todas las Guías de Insignias, Manuales de Campismo y Reglamentos Oficiales de la ASV.
          </Text>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Search size={18} color={theme.subText} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar por nombre de insignia, manual o reglamento..."
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
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
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
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? '#ffffff' : theme.text,
                      fontWeight: isSelected ? 'bold' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Documentos */}
        <View style={styles.docsList}>
          {filteredDocs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Filter size={36} color={theme.subText} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No se encontraron documentos</Text>
              <Text style={[styles.emptyStateDesc, { color: theme.subText }]}>
                Intenta con otra palabra clave o selecciona otra categoría.
              </Text>
            </View>
          ) : (
            filteredDocs.map(doc => (
              <View
                key={doc.id}
                style={[styles.docCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              >
                {/* Header de la tarjeta */}
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Text style={{ fontSize: 26 }}>{doc.badgeIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: primaryColor + '18' },
                        ]}
                      >
                        <Text style={[styles.categoryBadgeText, { color: primaryColor }]}>
                          {doc.categoryLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.docTitle, { color: theme.text }]}>{doc.title}</Text>
                  </View>
                </View>

                {/* Descripción */}
                <Text style={[styles.docDescription, { color: theme.subText }]}>{doc.description}</Text>

                {/* Ficha de Metadatos */}
                <View style={[styles.metaRow, { borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: theme.subText }]}>Acceso:</Text>
                    <Text style={[styles.metaValue, { color: theme.text }]}>Todos los Scouts</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: theme.subText }]}>Tamaño:</Text>
                    <Text style={[styles.metaValue, { color: theme.text }]}>{doc.size}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: theme.subText }]}>Formato:</Text>
                    <Text style={[styles.metaValue, { color: '#16a34a', fontWeight: 'bold' }]}>PDF Oficial</Text>
                  </View>
                </View>

                {/* Botones de Acción */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }]}
                    onPress={() => handleOpenDoc(doc)}
                    activeOpacity={0.8}
                  >
                    <Eye size={16} color={primaryColor} style={{ marginRight: 6 }} />
                    <Text style={[styles.viewBtnText, { color: primaryColor }]}>Visualizar Guía</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: primaryColor }]}
                    onPress={() => handleDownloadDoc(doc)}
                    activeOpacity={0.8}
                  >
                    <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.downloadBtnText}>Descargar PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MODAL VISOR INTERACTIVO DE DOCUMENTO */}
      <Modal visible={viewModalVisible} animationType="slide" transparent onRequestClose={() => setViewModalVisible(false)}>
        <View style={styles.viewerModalOverlay}>
          <View style={[styles.viewerModalCard, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
            {/* Header del Visor */}
            <View style={[styles.viewerHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.viewerTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedDoc?.title}
                </Text>
                <Text style={[styles.viewerSub, { color: theme.subText }]}>
                  {selectedDoc?.categoryLabel} • {selectedDoc?.size} • Documento Oficial
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.viewerCloseBtn}>
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* Contenido / Vista Previa del PDF */}
            <View style={[styles.viewerContent, { backgroundColor: isDarkMode ? '#09090b' : '#f8fafc' }]}>
              {Platform.OS === 'web' && selectedDoc ? (
                <iframe
                  src={selectedDoc.pdfUrl}
                  title={selectedDoc.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 12,
                  }}
                />
              ) : (
                <View style={styles.nativeFallbackBox}>
                  <Text style={{ fontSize: 44, marginBottom: 12 }}>{selectedDoc?.badgeIcon}</Text>
                  <Text style={[styles.fallbackTitle, { color: theme.text }]}>{selectedDoc?.title}</Text>
                  <Text style={[styles.fallbackDesc, { color: theme.subText }]}>{selectedDoc?.description}</Text>
                  <Text style={[styles.fallbackNote, { color: '#16a34a' }]}>
                    ✓ Listo para visualización y lectura offline
                  </Text>
                </View>
              )}
            </View>

            {/* Footer de Acciones del Visor */}
            <View style={[styles.viewerFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.viewerActionSecondary, { borderColor: theme.border }]}
                onPress={() => {
                  if (selectedDoc) handleDownloadDoc(selectedDoc);
                }}
              >
                <ExternalLink size={16} color={theme.text} style={{ marginRight: 6 }} />
                <Text style={[styles.viewerActionSecondaryText, { color: theme.text }]}>Abrir en Pantalla Completa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewerActionPrimary, { backgroundColor: primaryColor }]}
                onPress={() => {
                  if (selectedDoc) handleDownloadDoc(selectedDoc);
                }}
              >
                <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.viewerActionPrimaryText}>Descargar a tu Dispositivo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    padding: 24,
    paddingTop: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 500,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: -16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },
  docsList: {
    padding: 16,
    gap: 14,
  },
  docCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(97, 36, 153, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  docDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    textAlign: 'center',
  },

  viewerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewerModalCard: {
    width: '100%',
    maxWidth: 820,
    height: '92%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  viewerCloseBtn: {
    padding: 6,
  },
  viewerContent: {
    flex: 1,
    padding: 8,
  },
  nativeFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 460,
  },
  fallbackNote: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  viewerActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewerActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewerActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewerActionPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
