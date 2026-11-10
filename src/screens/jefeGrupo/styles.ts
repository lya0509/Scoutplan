// Estilos de JefeGrupoScreen (separados para que la pantalla sea más fácil de leer).
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 3
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  quickToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickToolBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },

  accordionSection: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden'
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 6
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  accordionBody: {
    padding: 14,
    borderTopWidth: 1
  },
  subCategoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9333ea',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  emptySubText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
    marginBottom: 8,
    paddingLeft: 6
  },

  memberCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15
  },
  memberName: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  profileBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 2
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)'
  },
  miniDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1
  },

  // Estilos de Herramientas de Censo, Padrón y Semáforo
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  exportBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6
  },
  filterTagText: {
    fontSize: 12
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6
  },
  tableIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 24
  },
  tableMainText: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  trafficCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trafficCardActive: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  trafficNumber: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  trafficLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center'
  },
  batchApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8
  },
  logoutBtnText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13
  }
});

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, borderRadius: 20, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  scopeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  scopeChipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
