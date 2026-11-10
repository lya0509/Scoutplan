// Estilos de QuarterlyPlanScreen (separados para que la pantalla sea más fácil de leer).
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  asociacionBanner: { marginBottom: 6 },
  asociacionText: { fontSize: 13, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },
  asociacionSub: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  title: { fontSize: 17, fontWeight: 'bold' },
  headerMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12, flexWrap: 'wrap', gap: 10 },
  yearAndHistoryGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearSelectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  yearArrowBtn: { padding: 3 },
  yearText: { fontSize: 13, fontWeight: 'bold', marginHorizontal: 4 },

  historyBtnHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  historyBtnHeaderText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },

  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  actionPillBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionPillBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  modeToggleGroup: { flexDirection: 'row', borderRadius: 10, padding: 3, borderWidth: 1 },
  modeToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modeToggleText: { fontSize: 12 },

  quarterTabsContainer: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  quarterTabCard: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  quarterTabCardText: { fontSize: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: 'white', fontWeight: 'bold' },

  quarterInfoCard: { padding: 12, borderRadius: 14, borderWidth: 1 },
  quarterName: { fontSize: 14, fontWeight: 'bold' },
  quarterMonths: { fontSize: 12, fontWeight: 'bold' },

  documentSheet: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 16 },
  sheetTopRow: { flexDirection: 'row', marginBottom: 14 },
  statusBanner: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 14 },
  statusBannerText: { fontWeight: 'bold', fontSize: 12 },
  bannerApproved: { backgroundColor: '#dcfce7', color: '#16a34a' },
  bannerPending: { backgroundColor: '#fef3c7', color: '#d97706' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  trafficCard: { borderRadius: 10, borderWidth: 1 },
  input: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 13 },
  textArea: { height: 75, textAlignVertical: 'top' },

  dynamicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  itemBulletIndex: { fontSize: 13, fontWeight: 'bold', width: 18 },
  deleteListItemBtn: { padding: 6 },
  addDynamicBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  addDynamicBtnText: { fontSize: 12, fontWeight: 'bold' },

  areasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  areaChipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  areaChipText: { fontSize: 12 },

  monthBlock: { padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthTitleText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  addActBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  addActBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  noActText: { fontSize: 12, fontStyle: 'italic', marginVertical: 4 },
  activityRowCard: { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  dayPickerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dayPickerBtnText: { fontSize: 12, fontWeight: 'bold' },
  deleteActBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },

  feedbackBox: { marginTop: 14, padding: 12, borderRadius: 12 },
  saveSubmitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  saveSubmitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  // PREVISUALIZACIÓN OFICIAL STYLES
  previewSheet: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 16 },
  previewHeaderBorder: { borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 10, marginBottom: 12 },
  previewTitle: { fontSize: 15, fontWeight: '900', marginTop: 6, letterSpacing: 0.5 },
  previewInfoGrid: { borderBottomWidth: 1, paddingBottom: 10, marginBottom: 14 },
  previewSection: { marginBottom: 16 },
  previewSectionHeading: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  previewListItem: { fontSize: 13, marginVertical: 2, paddingLeft: 4 },
  previewAreaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  previewTableActRow: { padding: 8, borderRadius: 8, borderWidth: 1, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewTableDay: { fontSize: 12, fontWeight: 'bold', width: 50 },
  previewTableActTitle: { fontSize: 13, fontWeight: 'bold' },
  previewTableActSub: { fontSize: 12, marginTop: 2 },

  historyRowCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  scoutPlanRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  avatarMini: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scoutRowName: { fontSize: 15, fontWeight: 'bold' },
  scoutRowSub: { fontSize: 12, marginTop: 2 },
  noPlanWarningText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  unitBadgeMini: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  unitBadgeMiniText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: 'bold' }
});

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: 'bold' },
  subTitle: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  input: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 13 },
  textArea: { height: 75, textAlignVertical: 'top' },
  btnAction: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnActionText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  overlayPicker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardPicker: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 16 }
});
