#!/usr/bin/env node
/**
 * Graphify Full-System Analyzer, Knowledge Graph Builder & QA Matrix Generator
 * Project: Plan Progresivo Scout ASV (v3.0.0)
 *
 * Scans 100% of the repository (all 25 Screens, 17 Components, 3 Contexts, 12 Services,
 * 9 Static Catalogs, 8 Utils/Hooks, 2 Core Navigators, 11 Supabase Database Tables,
 * Storage Buckets, 5 SQL Schemas, Serverless Push Endpoint, and PWA/DOCX Templates) to produce:
 *   1. graphify-out/graph.json       (Machine-readable Full-System Knowledge Graph)
 *   2. graphify-out/qa_matrix.json   (Complete E2E & Visual Design QA Matrix for Claude Code)
 *   3. graphify-out/GRAPH_REPORT.md  (Exhaustive Architectural Manual by Community)
 *   4. graphify-out/graph.html       (Interactive Visual Knowledge Graph & QA Explorer)
 *   5. Console Verification Report   (12 Automated Full-System Invariant Checks)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'graphify-out');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function inspectFile(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return {
      exists: false,
      lines: 0,
      bytes: 0,
      exports: [],
      imports: [],
      supabaseTables: [],
      supabaseBuckets: [],
      realtimeChannels: [],
      storageKeys: [],
    };
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');

  const exports = [];
  const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = exportRegex.exec(content)) !== null) {
    if (!exports.includes(m[1])) exports.push(m[1]);
  }

  const imports = [];
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  while ((m = importRegex.exec(content)) !== null) {
    if (!imports.includes(m[1])) imports.push(m[1]);
  }

  const supabaseTables = [];
  const tableRegex = /\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)/g;
  while ((m = tableRegex.exec(content)) !== null) {
    if (!supabaseTables.includes(m[1])) supabaseTables.push(m[1]);
  }

  const supabaseBuckets = [];
  const bucketRegex = /storage\.from\(\s*['"]([a-z0-9_-]+)['"]\s*\)/g;
  while ((m = bucketRegex.exec(content)) !== null) {
    if (!supabaseBuckets.includes(m[1])) supabaseBuckets.push(m[1]);
  }

  const realtimeChannels = [];
  const chanRegex = /\.channel\(\s*[`'"]([^`'"]+)[`'"]/g;
  while ((m = chanRegex.exec(content)) !== null) {
    if (!realtimeChannels.includes(m[1])) realtimeChannels.push(m[1]);
  }

  const storageKeys = [];
  const keyRegex = /['"](@[a-z0-9_]+|app_dark_mode|app_primary_color|onboarding_seen_[a-z0-9_]*|medical_data_[a-z0-9_]*|curriculum_data_[a-z0-9_]*)['"]/g;
  while ((m = keyRegex.exec(content)) !== null) {
    if (!storageKeys.includes(m[1])) storageKeys.push(m[1]);
  }

  return {
    exists: true,
    lines,
    bytes,
    exports,
    imports,
    supabaseTables,
    supabaseBuckets,
    realtimeChannels,
    storageKeys,
  };
}

const COMMUNITIES = [
  {
    id: 'core_navigation_contexts',
    name: '1. Core Entry, Contexts & Multi-Role Navigation Router',
    color: '#9333ea',
    description:
      'Entry points (index.ts, App.tsx), PWA Service Worker registration, multi-role Stack & Drawer routers (AppNavigator.tsx, DrawerNavigator.tsx), 3 global Context providers (AuthContext, ThemeContext, NotificationContext), and domain types/theme.',
  },
  {
    id: 'backend_offline_services',
    name: '2. Backend, Offline Sync Queue, Realtime Presence & Web Push Services',
    color: '#10b981',
    description:
      '12 core services across src/lib/ and src/services/: fichaOrion84PdfGenerator (Ficha Médica Orión 84 PDF filler, lazy pdf-lib), Supabase client, Offline-First dataService with FIFO sync queue, programaService, storageService (image compression + bucket upload), autoSaveService, presenceService (Realtime), notificationService, webPushService (VAPID), docxProgramaGenerator, and graphifyBridge.',
  },
  {
    id: 'scout_progression_screens',
    name: '3. Scout Progression, Stages, Catalog & Evidence Screens',
    color: '#3b82f6',
    description:
      'Auth screens (LoginScreen, RegisterScreen) and core Scout journey screens: ScoutDashboardScreen, PlanProgresivoScreen (Precursor -> Rover), StageDetailScreen, CatalogSelectorScreen, EspecialidadesScreen, ProfileScreen, and ScoutFullProfileScreen.',
  },
  {
    id: 'leadership_territorial_screens',
    name: '4. Scouter, Jefe de Grupo & Comisionado Territorial Dashboards',
    color: '#f59e0b',
    description:
      'Role-segmented management dashboards: ScouterDashboardScreen (unit management), ScouterReviewScreen (stage & requirement validation), JefeGrupoScreen (group supervision, membership & photo approval), and ComisionadoDashboardScreen (Distrital, Regional, Nacional & Admin hierarchy).',
  },
  {
    id: 'programs_planning_screens',
    name: '5. Programas Scout, Plan Trimestral, Calendario & Drive Screens',
    color: '#ec4899',
    description:
      'Operational planning screens: ProgramaScoutScreen, ProgramaScoutEditorScreen (schedule, 6 growth areas, SDGs, DOCX/PDF export), QuarterlyPlanScreen (individual & shared unit plans), CalendarScreen (unit/group/CIP events), ActivityCenterScreen, and TemporalDriveScreen.',
  },
  {
    id: 'documents_manuals_screens',
    name: '6. Ficha Médica, Currículum Scout, Certificados & Offline Manuals',
    color: '#06b6d4',
    description:
      'Official records & offline reference screens: FichaMedicaScreen (DOCX export), CurriculumScoutScreen (auto-synced with certificates & DOCX export), CertificateUploadScreen, NudosManualScreen (interactive SVG knot diagrams), CancioneroScreen, and DocumentosScreen.',
  },
  {
    id: 'ui_modals_components',
    name: '7. Reusable Modals, Avatars, Notifications & Theme Components',
    color: '#8b5cf6',
    description:
      '23 shared UI components in src/components/: OfflineStatusBanner, PendingChangesModal, ActividadesPersonalesModal, MembershipRecordsModal, InsigniasExportBar, ScoutQRCode, FichaMedicaOrion84Form, ScoutUserIcon, CarnetScoutModal, NochesAireLibreModal, VidaGrupoModal, ProgramaPdfPreviewModal, OnboardingGuideModal, NotificationCenterModal, NotificationHeaderBell, LiveNotificationToast, ThemeCustomizerModal, PWAInstallModal, HelpFloatingFAB, DualProfileAvatar, UserScoutAvatar, StageBadgeIcon, ManualVisualDiagram.',
  },
  {
    id: 'database_catalogs_pwa',
    name: '8. Supabase Schema (11 Tables), Static Catalogs & PWA/Serverless Config',
    color: '#ef4444',
    description:
      '9 normative static catalogs (src/data/*, incl. fichaMedicaOrion84Layout PDF field map), 8 utility helpers (src/utils/*), 11 Supabase PostgreSQL tables, scout-files Storage bucket, 5 SQL migration scripts, Vercel serverless endpoints (api/send-push.js, api/verificar.js, api/membership-reminders.js cron), DOCX templates, and PWA Service Worker (public/sw.js).',
  },
];

const RAW_NODES = [
  // Community 1: Core Entry, Contexts & Multi-Role Navigation Router
  { id: 'index.ts', label: 'index.ts (Expo Root Entry)', type: 'code_file', community: 'core_navigation_contexts', file: 'index.ts', role: 'Registers root App component with Expo registerRootComponent.' },
  { id: 'App.tsx', label: 'App.tsx (Root Providers, PWA SW & Offline Reconnect Sync)', type: 'code_file', community: 'core_navigation_contexts', file: 'App.tsx', role: 'Initializes Graphify Bridge, registers /sw.js Service Worker on Web, listens to window online events to flush dataService.syncPendingRequirements(), and wraps ThemeProvider -> AuthProvider -> NotificationProvider -> AppNavigator.' },
  { id: 'AppNavigator.tsx', label: 'AppNavigator.tsx (Role-Based Stack Router & Deep Linking)', type: 'code_file', community: 'core_navigation_contexts', file: 'src/navigation/AppNavigator.tsx', role: 'Routes unauthenticated users to Login/Register and authenticated users by role (scout -> DrawerNavigator, scouter -> ScouterDashboard, jefe_grupo -> JefeDashboard, comisionados/nacional/admin -> ComisionadoDashboard) plus shared screens.' },
  { id: 'DrawerNavigator.tsx', label: 'DrawerNavigator.tsx (Scout Sidebar Navigation & Theme Controls)', type: 'code_file', community: 'core_navigation_contexts', file: 'src/navigation/DrawerNavigator.tsx', role: '15-screen Drawer menu for Scouts with custom header avatar, dark mode toggle, ThemeCustomizerModal trigger, and PWAInstallModal trigger.' },
  { id: 'AuthContext.tsx', label: 'AuthContext.tsx (Instant Local Auth Cache + Supabase Session)', type: 'context', community: 'core_navigation_contexts', file: 'src/context/AuthContext.tsx', role: 'Restores @scout_cached_profile in <10ms with 800ms safety timeout, syncs Supabase Auth session & profiles table, initializes presenceService, and exposes updateUserProfile/refreshProfile/signOut.' },
  { id: 'ThemeContext.tsx', label: 'ThemeContext.tsx (Dark Mode & Custom Primary Palette)', type: 'context', community: 'core_navigation_contexts', file: 'src/context/ThemeContext.tsx', role: 'Persists app_dark_mode and app_primary_color in AsyncStorage and provides dynamic theme tokens across all screens.' },
  { id: 'NotificationContext.tsx', label: 'NotificationContext.tsx (Realtime Notifications & Toasts)', type: 'context', community: 'core_navigation_contexts', file: 'src/context/NotificationContext.tsx', role: 'Polls & subscribes to scout_notifications/notifications, manages unread badge counts, triggers LiveNotificationToast, and registers Web Push subscriptions.' },
  { id: 'progression.ts', label: 'progression.ts (Core Role, Unit, Profile & Stage Types)', type: 'code_file', community: 'core_navigation_contexts', file: 'src/types/progression.ts', role: 'Defines Role (7 roles), Unit (6 units), StageStatus, Profile, Requirement, StageTemplate, StageProgress, and RequirementProgress.' },
  { id: 'programa.ts', label: 'programa.ts (ProgramaScout & Schedule Domain Types)', type: 'code_file', community: 'core_navigation_contexts', file: 'src/types/programa.ts', role: 'Defines ProgramaScout and ActivityScheduleItem interfaces.' },
  { id: 'colors.ts', label: 'colors.ts (Design System Color Tokens)', type: 'code_file', community: 'core_navigation_contexts', file: 'src/theme/colors.ts', role: 'Central color palette for units, stages, and dark/light surfaces.' },

  // Community 2: Backend, Offline Sync Queue, Realtime Presence & Web Push Services
  { id: 'supabaseClient.ts', label: 'supabaseClient.ts (Supabase Client Singleton)', type: 'service', community: 'backend_offline_services', file: 'src/lib/supabaseClient.ts', role: 'Configures @supabase/supabase-js with AsyncStorage session persistence.' },
  { id: 'supabase.ts', label: 'supabase.ts (Supabase Helper Re-export)', type: 'service', community: 'backend_offline_services', file: 'src/lib/supabase.ts', role: 'Re-exports configured Supabase instance.' },
  { id: 'dataService.ts', label: 'dataService.ts (Offline Sync Queue, Progression, Logs & Certificates)', type: 'service', community: 'backend_offline_services', file: 'src/lib/dataService.ts', role: 'Async data layer on top of the offline outbox (@scout_outbox_v1) with cached reads: stage/requirement progress, stage/requirement progress, stage review/approval, certificates + curriculum auto-sync, quarterly plans, CIP events, nights log, vida de grupo log, and membership dates.' },
  { id: 'outbox.ts', label: 'outbox.ts (Offline Outbox Queue)', type: 'service', community: 'backend_offline_services', file: 'src/lib/offline/outbox.ts', role: 'Generic ordered queue of pending operations (@scout_outbox_v1). run() executes now or queues; flush() replays in order when back online, on app focus and every 30 s; network errors wait, other errors retry 5 times then stay as failed. Migrates the old @scout_offline_sync_queue.' },
  { id: 'net.ts', label: 'net.ts (Connectivity & Supabase error helpers)', type: 'service', community: 'backend_offline_services', file: 'src/lib/offline/net.ts', role: 'isOnline, isNetworkError, isRetryableError, must() (supabase-js returns {error} instead of throwing when offline), isDuplicateError, newId (UUID).' },
  { id: 'readCache.ts', label: 'readCache.ts (Network-first reads with local copy)', type: 'service', community: 'backend_offline_services', file: 'src/lib/offline/readCache.ts', role: 'cachedQuery(key, fetcher, fallback): returns fresh data and stores a copy (@scout_rc_*), or the last copy when offline / timeout.' },
  { id: 'offlineDocs.ts', label: 'offlineDocs.ts (PDF guides available offline)', type: 'service', community: 'backend_offline_services', file: 'src/lib/offline/offlineDocs.ts', role: 'Saves guide PDFs in Cache Storage scoutplan-docs-v1 (shared with public/sw.js); appPdfUrl() routes scouts.org.ve guides through the /asv-pdf/* proxy in vercel.json.' },
  { id: 'programaService.ts', label: 'programaService.ts (CRUD & Offline Sync for Programas Scout)', type: 'service', community: 'backend_offline_services', file: 'src/lib/programaService.ts', role: 'Manages scout_programas table and @scout_programas_list local cache with getProgramas, savePrograma, deletePrograma, and duplicatePrograma.' },
  { id: 'fileUrl.ts', label: 'fileUrl.ts (Signed URLs for private scout-files)', type: 'service', community: 'backend_offline_services', file: 'src/lib/fileUrl.ts', role: 'resolveFileUrl/peekFileUrl/openFileUrl/clearFileCache: stored public-form URLs -> createSignedUrl (1 h) cached in memory + @scout_signed_urls_v1; offline falls back to last URL (SW caches by path without token); cleared on logout.' },
  { id: 'insigniasReport.ts', label: 'insigniasReport.ts (Badge progress report builder)', type: 'service', community: 'backend_offline_services', file: 'src/lib/insigniasReport.ts', role: 'Bulk-reads stage_progress and requirement_progress (chunks of 80 ids) and builds a ReportTable: summary per member + detail per stage with approval dates.' },
  { id: 'fichaScoutPdfGenerator.ts', label: 'fichaScoutPdfGenerator.ts (Ficha Médica Scout PDF)', type: 'service', community: 'backend_offline_services', file: 'src/lib/fichaScoutPdfGenerator.ts', role: 'Draws the Ficha Médica Scout as a one-page PDF with pdf-lib from the same replacements used by the .docx template, including the signature image.' },
  { id: 'reportWriters', label: 'reportTable.ts + xlsxWriter.ts + pdfTableWriter.ts (Real Excel & direct PDF)', type: 'service', community: 'backend_offline_services', file: 'src/utils/xlsxWriter.ts', role: 'ReportTable model; OOXML .xlsx writer with JSZip (merged title, frozen header, autofilter, colored cells) and landscape PDF writer with pdf-lib (wrapped cells, repeated header, page X of Y). Used by Censo, Padrón, Membresías, Plan Trimestral and Insignias.' },
  { id: 'storageService.ts', label: 'storageService.ts (Canvas Image Compression & Supabase Storage)', type: 'service', community: 'backend_offline_services', file: 'src/lib/storageService.ts', role: 'Compresses images >800px via HTML5 Canvas and uploads to scout-files Supabase Storage bucket.' },
  { id: 'docxProgramaGenerator.ts', label: 'docxProgramaGenerator.ts (OpenXML DOCX Generator for Programas)', type: 'service', community: 'backend_offline_services', file: 'src/lib/docxProgramaGenerator.ts', role: 'Generates official ASV Word .docx files for ProgramaScout using JSZip and public/programa_assets/Programa_Template.docx.' },
  { id: 'graphifyBridge.ts', label: 'graphifyBridge.ts (Runtime Bridge window.__SCOUT_GRAPHIFY__)', type: 'service', community: 'backend_offline_services', file: 'src/lib/graphifyBridge.ts', role: 'Mounts window.__SCOUT_GRAPHIFY__ for Claude Code programmatic navigation, state inspection, and diagnostics.' },
  { id: 'autoSaveService.ts', label: 'autoSaveService.ts (Debounced Form Draft Persistence)', type: 'service', community: 'backend_offline_services', file: 'src/services/autoSaveService.ts', role: 'Debounced 300ms draft auto-saver in AsyncStorage (@scout_autosave_*) for long forms.' },
  { id: 'notificationService.ts', label: 'notificationService.ts (Multi-Target Notification Dispatcher)', type: 'service', community: 'backend_offline_services', file: 'src/services/notificationService.ts', role: 'Dispatches in-app, browser, and Web Push notifications to users, units, groups, or roles via scout_notifications.' },
  { id: 'presenceService.ts', label: 'presenceService.ts (Supabase Realtime Online Presence)', type: 'service', community: 'backend_offline_services', file: 'src/services/presenceService.ts', role: 'Tracks online/offline status of scouts and scouters via Supabase Realtime channel scout_presence_global and updates profiles.updated_at.' },
  { id: 'fichaOrion84PdfGenerator.ts', label: 'fichaOrion84PdfGenerator.ts (Ficha Médica Orión 84 PDF Filler)', type: 'service', community: 'backend_offline_services', file: 'src/lib/fichaOrion84PdfGenerator.ts', role: 'Fills public/FICHA_MEDICA_ORION84_Template.pdf (Canva, no AcroForm) by drawing text at measured cell coordinates; auto-shrinks/wraps with ellipsis; lazy-loads pdf-lib/dist bundle (the ESM build breaks Metro via tslib).' },
  { id: 'webPushService.ts', label: 'webPushService.ts (VAPID Web Push Subscription & Dispatch)', type: 'service', community: 'backend_offline_services', file: 'src/services/webPushService.ts', role: 'Registers Service Worker PushManager subscriptions in push_subscriptions and invokes /api/send-push.' },

  // Community 3: Scout Progression, Stages, Catalog & Evidence Screens
  { id: 'LoginScreen.tsx', label: 'LoginScreen.tsx (route: Login)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/LoginScreen.tsx', route: 'Login', role: 'Email/password authentication, password recovery modal, and link to RegisterScreen.' },
  { id: 'RegisterScreen.tsx', label: 'RegisterScreen.tsx (route: Register)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/RegisterScreen.tsx', route: 'Register', role: 'Multi-role user registration (Scout, Scouter, Jefe de Grupo, Comisionado) with Region, District, Group, and Unit selectors.' },
  { id: 'ScoutDashboardScreen.tsx', label: 'ScoutDashboardScreen.tsx (route: Resumen)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/ScoutDashboardScreen.tsx', route: 'Resumen', role: 'Main Scout home dashboard: ScoutUserIcon greeting badge, progression summary, active stage progress bar, unit Rovers directory (directorio_grupo RPC), quick access cards, CarnetScoutModal, OnboardingGuideModal, and HelpFloatingFAB.' },
  { id: 'PlanProgresivoScreen.tsx', label: 'PlanProgresivoScreen.tsx (route: PlanProgresivo)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/PlanProgresivoScreen.tsx', route: 'PlanProgresivo', role: 'Displays the 4 Rover/Clan progression stages (Precursor, Expedicionario, Descubridor, Fundador) with completion percentages and lock status.' },
  { id: 'StageDetailScreen.tsx', label: 'StageDetailScreen.tsx (route: StageDetail)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/StageDetailScreen.tsx', route: 'StageDetail', role: 'Interactive checklist of stage requirements, linking to CatalogSelectorScreen, NochesAireLibreModal, VidaGrupoModal, CertificateUploadScreen, and stage review submission.' },
  { id: 'CatalogSelectorScreen.tsx', label: 'CatalogSelectorScreen.tsx (route: CatalogSelector)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/CatalogSelectorScreen.tsx', route: 'CatalogSelector', role: 'Searchable selector for official ASV catalog activities (básicas, opcionales, especialidades, cursos, ciclos) filtered by stage and requirement type.' },
  { id: 'EspecialidadesScreen.tsx', label: 'EspecialidadesScreen.tsx (route: Especialidades)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/EspecialidadesScreen.tsx', route: 'Especialidades', role: 'Interactive catalog of Scout Specialties across 6 categories and 3 levels (Bronce, Plata, Oro).' },
  { id: 'ProfileScreen.tsx', label: 'ProfileScreen.tsx (route: Perfil)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/ProfileScreen.tsx', route: 'Perfil', role: 'Scout & Scouter personal profile editor: dual avatars (Uniformado/Casual), cédula, dates (birth, promise, join), membership expiration proposal, and digital Carnet Scout.' },
  { id: 'ScoutFullProfileScreen.tsx', label: 'ScoutFullProfileScreen.tsx (route: ScoutFullProfile)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/ScoutFullProfileScreen.tsx', route: 'ScoutFullProfile', role: '360-degree view of a Scout profile for Scouters/Jefes: progression stages, certificates, medical record summary, curriculum, and membership status.' },

  // Community 4: Scouter, Jefe de Grupo & Comisionado Territorial Dashboards
  { id: 'ScouterDashboardScreen.tsx', label: 'ScouterDashboardScreen.tsx (route: ScouterDashboard)', type: 'screen', community: 'leadership_territorial_screens', file: 'src/screens/ScouterDashboardScreen.tsx', route: 'ScouterDashboard', role: 'Unit leader dashboard: lists unit scouts with online presence, pending stage reviews, quarterly plan feedback, unit programs, and profile photo moderation.' },
  { id: 'ScouterReviewScreen.tsx', label: 'ScouterReviewScreen.tsx (route: ScouterReview)', type: 'screen', community: 'leadership_territorial_screens', file: 'src/screens/ScouterReviewScreen.tsx', route: 'ScouterReview', role: 'Detailed requirement-by-requirement verification screen for a Scout with Approve/Reject stage actions and notification dispatch.' },
  { id: 'JefeGrupoScreen.tsx', label: 'JefeGrupoScreen.tsx (route: JefeDashboard)', type: 'screen', community: 'leadership_territorial_screens', file: 'src/screens/JefeGrupoScreen.tsx', route: 'JefeDashboard', role: 'Group Chief dashboard: supervises all units (Manada, Tropa, Caminantes, Clan), approves/rejects membership expiration dates, moderates photos, and manages group calendar.' },
  { id: 'ComisionadoDashboardScreen.tsx', label: 'ComisionadoDashboardScreen.tsx (route: ComisionadoDashboard)', type: 'screen', community: 'leadership_territorial_screens', file: 'src/screens/ComisionadoDashboardScreen.tsx', route: 'ComisionadoDashboard', role: 'Territorial hierarchy dashboard (Distrital, Regional, Nacional, Admin) with drill-down metrics by Region -> District -> Group -> Unit.' },

  // Community 5: Programas Scout, Plan Trimestral, Calendario & Drive Screens
  { id: 'ProgramaScoutScreen.tsx', label: 'ProgramaScoutScreen.tsx (route: ProgramaScout)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/ProgramaScoutScreen.tsx', route: 'ProgramaScout', role: 'Lists unit & sinodal Scout Activity Programs with filters by unit, duplicate/delete actions, PDF preview modal, and Word .docx export.' },
  { id: 'ProgramaScoutEditorScreen.tsx', label: 'ProgramaScoutEditorScreen.tsx (route: ProgramaScoutEditor)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/ProgramaScoutEditorScreen.tsx', route: 'ProgramaScoutEditor', role: 'Full editor for ProgramaScout: metadata, unit/sinodal selector, objectives, SDGs (17 ODS), 6 Growth Area achievement indicators, time-table schedule, and autoSaveService integration.' },
  { id: 'QuarterlyPlanScreen.tsx', label: 'QuarterlyPlanScreen.tsx (route: QuarterlyPlan)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/QuarterlyPlanScreen.tsx', route: 'QuarterlyPlan', role: 'Quarterly planner (Trimestres I-IV) supporting individual Rover plans and shared unit plans linked to ProgramaScoutEditor.' },
  { id: 'CalendarScreen.tsx', label: 'CalendarScreen.tsx (route: CalendarStandalone)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/CalendarScreen.tsx', route: 'CalendarStandalone', role: 'Interactive calendar (react-native-calendars) for unit, group, district, and CIP events with event creation and reminders.' },
  { id: 'ActivityCenterScreen.tsx', label: 'ActivityCenterScreen.tsx (route: CentroActividades)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/ActivityCenterScreen.tsx', route: 'CentroActividades', role: 'Hub for CIP events, unit activities, and direct launch of activity programs.' },
  { id: 'TemporalDriveScreen.tsx', label: 'TemporalDriveScreen.tsx (route: TemporalDrive)', type: 'screen', community: 'programs_planning_screens', file: 'src/screens/TemporalDriveScreen.tsx', route: 'TemporalDrive', role: 'Photo evidence albums organized by activity/date, backed by Supabase Storage scout-files and @scout_temporal_drive_albums cache.' },

  // Community 6: Ficha Médica, Currículum Scout, Certificados & Offline Manuals
  { id: 'FichaMedicaScreen.tsx', label: 'FichaMedicaScreen.tsx (route: FichaMedica)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/FichaMedicaScreen.tsx', route: 'FichaMedica', role: 'Two-tab medical record: "Ficha Médica Scout" (ASV form, Word .docx export) and "Ficha Médica Orión 84" (FichaMedicaOrion84Form, PDF export). Both live in profiles.medical_data (Orión 84 under medical_data.orion84; saves merge, never overwrite each other).' },
  { id: 'CurriculumScoutScreen.tsx', label: 'CurriculumScoutScreen.tsx (route: CurriculumScout)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/CurriculumScoutScreen.tsx', route: 'CurriculumScout', role: 'Official Scout Curriculum Vitae form auto-synced with uploaded certificates, awards, and progression stages, with Word .docx export.' },
  { id: 'CertificateUploadScreen.tsx', label: 'CertificateUploadScreen.tsx (route: CertificateUpload)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/CertificateUploadScreen.tsx', route: 'CertificateUpload', role: 'Uploads and categorizes Scout certificates/courses to Supabase Storage and syncs them automatically into CurriculumScout.' },
  { id: 'NudosManualScreen.tsx', label: 'NudosManualScreen.tsx (route: NudosManual)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/NudosManualScreen.tsx', route: 'NudosManual', role: '100% offline interactive manual of Scout knots, lashings (amarres), camping techniques, and visual SVG diagrams (ManualVisualDiagram).' },
  { id: 'CancioneroScreen.tsx', label: 'CancioneroScreen.tsx (route: Cancionero)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/CancioneroScreen.tsx', route: 'Cancionero', role: 'Offline Scout songbook categorized by unit (Manada, Tropa, Caminantes, Clan, Fogata) with search and chords/lyrics.' },
  { id: 'DocumentosScreen.tsx', label: 'DocumentosScreen.tsx (route: Documentos)', type: 'screen', community: 'documents_manuals_screens', file: 'src/screens/DocumentosScreen.tsx', route: 'Documentos', role: 'Digital library of official ASV & WOSM PDF manuals and Mundialito guides stored in public/documentos/.' },

  // Community 7: Reusable Modals, Avatars, Notifications & Theme Components
  { id: 'CarnetScoutModal.tsx', label: 'CarnetScoutModal.tsx (Digital Scout ID Card)', type: 'component', community: 'ui_modals_components', file: 'src/components/CarnetScoutModal.tsx', role: 'Renders official digital Scout ID card with QR verification, membership status badge, and PDF/image export.' },
  { id: 'NochesAireLibreModal.tsx', label: 'NochesAireLibreModal.tsx (Camping Nights Logbook)', type: 'component', community: 'ui_modals_components', file: 'src/components/NochesAireLibreModal.tsx', role: 'Modal logbook for recording camping nights (date, location, nights count, notes) toward stage requirements.' },
  { id: 'VidaGrupoModal.tsx', label: 'VidaGrupoModal.tsx (Group Life Logbook)', type: 'component', community: 'ui_modals_components', file: 'src/components/VidaGrupoModal.tsx', role: 'Modal logbook for recording Vida de Grupo participations and council activities.' },
  { id: 'ProgramaPdfPreviewModal.tsx', label: 'ProgramaPdfPreviewModal.tsx (HTML/PDF Programa Preview)', type: 'component', community: 'ui_modals_components', file: 'src/components/ProgramaPdfPreviewModal.tsx', role: 'Renders official ASV formatted preview of a ProgramaScout with html2pdf / print export.' },
  { id: 'OnboardingGuideModal.tsx', label: 'OnboardingGuideModal.tsx (Interactive Welcome Tour)', type: 'component', community: 'ui_modals_components', file: 'src/components/OnboardingGuideModal.tsx', role: 'Step-by-step interactive onboarding guide for new Scouts and Scouters.' },
  { id: 'NotificationCenterModal.tsx', label: 'NotificationCenterModal.tsx (Inbox & Announcements Modal)', type: 'component', community: 'ui_modals_components', file: 'src/components/NotificationCenterModal.tsx', role: 'Displays personal notifications and official system announcements with mark-as-read and clear actions.' },
  { id: 'NotificationHeaderBell.tsx', label: 'NotificationHeaderBell.tsx (Unread Bell Badge)', type: 'component', community: 'ui_modals_components', file: 'src/components/NotificationHeaderBell.tsx', role: 'Header bell button with animated unread counter opening NotificationCenterModal.' },
  { id: 'LiveNotificationToast.tsx', label: 'LiveNotificationToast.tsx (Floating In-App Toast)', type: 'component', community: 'ui_modals_components', file: 'src/components/LiveNotificationToast.tsx', role: 'Global top toast banner displaying incoming real-time notifications.' },
  { id: 'ThemeCustomizerModal.tsx', label: 'ThemeCustomizerModal.tsx (Palette & Dark Mode Picker)', type: 'component', community: 'ui_modals_components', file: 'src/components/ThemeCustomizerModal.tsx', role: 'Modal allowing users to customize primary accent color and dark/light theme.' },
  { id: 'PWAInstallModal.tsx', label: 'PWAInstallModal.tsx (iOS/Android/Desktop Install Guide)', type: 'component', community: 'ui_modals_components', file: 'src/components/PWAInstallModal.tsx', role: 'Triggers native beforeinstallprompt or displays step-by-step iOS Safari Add to Home Screen instructions.' },
  { id: 'HelpFloatingFAB.tsx', label: 'HelpFloatingFAB.tsx (Support & Bug Report FAB)', type: 'component', community: 'ui_modals_components', file: 'src/components/HelpFloatingFAB.tsx', role: 'Floating action button submitting diagnostic bug reports to bug_reports table.' },
  { id: 'DualProfileAvatar.tsx', label: 'DualProfileAvatar.tsx (Scout Uniform & Casual Avatar)', type: 'component', community: 'ui_modals_components', file: 'src/components/DualProfileAvatar.tsx', role: 'Switches and uploads dual profile photos (Uniformado vs Personal) with online status dot.' },
  { id: 'UserScoutAvatar.tsx', label: 'UserScoutAvatar.tsx (Unit-Badged Avatar)', type: 'component', community: 'ui_modals_components', file: 'src/components/UserScoutAvatar.tsx', role: 'Renders user avatar with unit logo fallback and role badge.' },
  { id: 'StageBadgeIcon.tsx', label: 'StageBadgeIcon.tsx (SVG Progression Stage Insignia)', type: 'component', community: 'ui_modals_components', file: 'src/components/StageBadgeIcon.tsx', role: 'Renders vector insignias for Precursor, Expedicionario, Descubridor, and Fundador.' },
  { id: 'FichaMedicaOrion84Form.tsx', label: 'FichaMedicaOrion84Form.tsx (Ficha Médica Orión 84 Form)', type: 'component', community: 'ui_modals_components', file: 'src/components/FichaMedicaOrion84Form.tsx', role: 'Orión 84 medical form: prefilled from profile + Ficha Médica Scout, autosaved draft, saves to profiles.medical_data.orion84 and downloads the filled PDF.' },
  { id: 'ScoutUserIcon.tsx', label: 'ScoutUserIcon.tsx (User Silhouette with Scout Neckerchief)', type: 'component', community: 'ui_modals_components', file: 'src/components/ScoutUserIcon.tsx', role: 'SVG user icon wearing a neckerchief in the unit color; shown above the name on the Scout home greeting.' },
  { id: 'OfflineStatusBanner.tsx', label: 'OfflineStatusBanner.tsx (Offline / Sync status pill)', type: 'component', community: 'ui_modals_components', file: 'src/components/OfflineStatusBanner.tsx', role: 'Shows "Sin conexión · N", "Enviando…", "Todo enviado" or failed changes with retry; collapses to a small chip under the header so it never covers bottom action buttons.' },
  { id: 'PendingChangesModal.tsx', label: 'PendingChangesModal.tsx (Pending offline changes list)', type: 'component', community: 'ui_modals_components', file: 'src/components/PendingChangesModal.tsx', role: 'Opened from OfflineStatusBanner: lists queued outbox operations in send order, failed ones with a friendly error, retry-all and discard-one actions.' },
  { id: 'ActividadesPersonalesModal.tsx', label: 'ActividadesPersonalesModal.tsx (Personal activities logbook)', type: 'component', community: 'ui_modals_components', file: 'src/components/ActividadesPersonalesModal.tsx', role: 'Logbook for "Actividades Personales (3 de su propia creación)": name, date and description per activity, stored as certificates rows personal_<stage>_<req>; auto-checks the requirement at the required count.' },
  { id: 'MembershipRecordsModal.tsx', label: 'MembershipRecordsModal.tsx (ASV payment receipt & membership history)', type: 'component', community: 'ui_modals_components', file: 'src/components/MembershipRecordsModal.tsx', role: 'mode=self: the member uploads the payment receipt (photo + reference + amount); mode=leader: Scouter/Jefatura view receipts and the year-by-year history of approvals and returns. Rows in certificates (membresia_pago / membresia_hist).' },
  { id: 'SecureImage.tsx', label: 'SecureImage.tsx (Image for the private bucket)', type: 'component', community: 'ui_modals_components', file: 'src/components/SecureImage.tsx', role: 'Drop-in <Image> + useFileUrl(): resolves scout-files URLs to 1-hour signed URLs before rendering; other URIs pass through.' },
  { id: 'InsigniasExportBar.tsx', label: 'InsigniasExportBar.tsx (Badge progress export)', type: 'component', community: 'ui_modals_components', file: 'src/components/InsigniasExportBar.tsx', role: 'Card with Excel/PDF buttons for the badge progress report of a unit or the whole group (online only).' },
  { id: 'ScoutQRCode.tsx', label: 'ScoutQRCode.tsx (Offline QR renderer)', type: 'component', community: 'ui_modals_components', file: 'src/components/ScoutQRCode.tsx', role: 'Draws a QR code on-device with qrcode-generator + react-native-svg (replaces api.qrserver.com, works offline).' },
  { id: 'ManualVisualDiagram.tsx', label: 'ManualVisualDiagram.tsx (SVG Knot & Lashing Diagrams)', type: 'component', community: 'ui_modals_components', file: 'src/components/ManualVisualDiagram.tsx', role: 'Renders step-by-step vector diagrams for knots, lashings, and camping setups.' },

  // Community 8: Supabase Schema (11 Tables), Static Catalogs & PWA/Serverless Config
  { id: 'progressionTemplate.ts', label: 'progressionTemplate.ts (Stages & Requirements Catalog)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/progressionTemplate.ts', role: 'Defines Precursor, Expedicionario, Descubridor, and Fundador stage requirements.' },
  { id: 'unitTemplates.ts', label: 'unitTemplates.ts (Units, age ranges & stage templates)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/unitTemplates.ts', role: 'Manada 7-10, Tropa 10-15, Caminantes 16-18, Clan 18-21; ageFitForUnit / ageFitLabel for the census age check; getStagesForUnit falls back to the Clan template until the other templates are loaded.' },
  { id: 'activitiesCatalog.ts', label: 'activitiesCatalog.ts (Official ASV Activities Catalog)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/activitiesCatalog.ts', role: 'Full catalog of ASV activities mapped to stages and requirement types.' },
  { id: 'achievementIndicatorsData.ts', label: 'achievementIndicatorsData.ts (6 Growth Areas Indicators)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/achievementIndicatorsData.ts', role: 'Indicators across Corporalidad, Creatividad, Carácter, Afectividad, Sociabilidad, and Espiritualidad for Manada, Tropa, Caminantes, and Clan.' },
  { id: 'specialtiesData.ts', label: 'specialtiesData.ts (Scout Specialties Catalog)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/specialtiesData.ts', role: 'Catalog of Scout specialties and requirements across Bronce, Plata, and Oro levels.' },
  { id: 'documentsData.ts', label: 'documentsData.ts (PDF Manuals Metadata)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/documentsData.ts', role: 'Metadata and file paths for official PDF guides in public/documentos/.' },
  { id: 'sdgData.ts', label: 'sdgData.ts (17 UN Sustainable Development Goals)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/sdgData.ts', role: '17 ODS definitions, colors, and icons for ProgramaScout.' },
  { id: 'registrationBadgesData.ts', label: 'registrationBadgesData.ts (Annual Registration Badges)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/registrationBadgesData.ts', role: 'Institutional registration badges and Mundialito programs.' },
  { id: 'trimestresData.ts', label: 'trimestresData.ts (Quarterly Planning Templates)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/trimestresData.ts', role: 'Quarter definitions and suggested milestones.' },
  { id: 'fichaMedicaOrion84Layout.ts', label: 'fichaMedicaOrion84Layout.ts (Ficha Orión 84 Field Map)', type: 'catalog', community: 'database_catalogs_pwa', file: 'src/data/fichaMedicaOrion84Layout.ts', role: 'Single source of truth for the Orión 84 form: field labels/types and exact PDF cell coordinates, plus titles printed on the template blank header bars.' },
  { id: 'docxExporter.ts', label: 'docxExporter.ts (Ficha Médica & Currículum DOCX Exporter)', type: 'util', community: 'database_catalogs_pwa', file: 'src/utils/docxExporter.ts', role: 'Injects user data and images into Ficha Médica and Currículum Scout Word .docx templates.' },
  { id: 'send-push.js', label: 'api/send-push.js (Vercel Web Push Serverless Function)', type: 'config_file', community: 'database_catalogs_pwa', file: 'api/send-push.js', role: 'Dispatches encrypted RFC 8030 Web Push payloads using web-push and VAPID keys.' },
  { id: 'verificar.js', label: 'api/verificar.js (Carnet verification, login required)', type: 'config_file', community: 'database_catalogs_pwa', file: 'api/verificar.js', role: 'GET /api/verificar?id=<uuid> requires a logged-in user (401 otherwise); with the service role returns only name, group, unit/role and membership status/expiry; Cache-Control private, no-store.' },
  { id: 'VerificarCarnetScreen.tsx', label: 'VerificarCarnetScreen.tsx (In-app carnet verification /verificar/:id)', type: 'screen', community: 'scout_progression_screens', file: 'src/screens/VerificarCarnetScreen.tsx', role: 'Opened by the carnet QR. Logged out: AppNavigator saves the id (@pending_verify_id) and LoginScreen shows a notice; after login it navigates here and calls /api/verificar with the session token.' },
  { id: 'membership-reminders.js', label: 'api/membership-reminders.js (Daily membership reminder cron)', type: 'config_file', community: 'database_catalogs_pwa', file: 'api/membership-reminders.js', role: 'Vercel Cron 13:00 UTC: memberships expiring in 30 and 7 days -> scout_notifications + web push to the member and their unit Scouters (Jefatura for Scouters or units without Scouter); no repeats within 20 h; CRON_SECRET if set.' },
  { id: 'sw.js', label: 'public/sw.js (PWA Service Worker & Push Listener)', type: 'config_file', community: 'database_catalogs_pwa', file: 'public/sw.js', role: 'Caches static assets for offline operation and handles push/notificationclick events.' },
  { id: 'supabase_master_fix_all_tables.sql', label: 'supabase_master_fix_all_tables.sql (Master PostgreSQL Schema & RLS)', type: 'sql_script', community: 'database_catalogs_pwa', file: 'supabase_master_fix_all_tables.sql', role: 'Idempotent SQL master script defining tables, columns, RLS policies, and storage buckets.' },

  // Database Table Nodes
  { id: 'db:profiles', label: 'DB Table: public.profiles', type: 'db_table', community: 'database_catalogs_pwa', role: 'Users, roles, units, groups, districts, regions, avatars, medical/curriculum JSON, nights/vida_grupo logs, and membership status.' },
  { id: 'db:stage_progress', label: 'DB Table: public.stage_progress', type: 'db_table', community: 'database_catalogs_pwa', role: 'Stage status per scout (En Progreso, En Revision, Aprobada, Bloqueada).' },
  { id: 'db:requirement_progress', label: 'DB Table: public.requirement_progress', type: 'db_table', community: 'database_catalogs_pwa', role: 'Individual requirement completion records synced with offline queue.' },
  { id: 'db:certificates', label: 'DB Table: public.certificates', type: 'db_table', community: 'database_catalogs_pwa', role: 'Uploaded certificates with title, category, level, file_url, and date.' },
  { id: 'db:scout_programas', label: 'DB Table: public.scout_programas', type: 'db_table', community: 'database_catalogs_pwa', role: 'Unit & sinodal activity programs with schedule, indicators, and SDGs.' },
  { id: 'db:quarterly_plans', label: 'DB Table: public.quarterly_plans', type: 'db_table', community: 'database_catalogs_pwa', role: 'Individual and shared unit quarterly plans with Scouter feedback.' },
  { id: 'db:calendar_events', label: 'DB Table: public.calendar_events', type: 'db_table', community: 'database_catalogs_pwa', role: 'Calendar and CIP events by unit, group, and district.' },
  { id: 'db:scout_notifications', label: 'DB Table: public.scout_notifications', type: 'db_table', community: 'database_catalogs_pwa', role: 'Targeted in-app notifications by user, role, unit, or group.' },
  { id: 'db:notifications', label: 'DB Table: public.notifications', type: 'db_table', community: 'database_catalogs_pwa', role: 'Direct sender-to-receiver notifications.' },
  { id: 'db:push_subscriptions', label: 'DB Table: public.push_subscriptions', type: 'db_table', community: 'database_catalogs_pwa', role: 'Browser/PWA Web Push VAPID endpoints and keys per user.' },
  { id: 'db:bug_reports', label: 'DB Table: public.bug_reports', type: 'db_table', community: 'database_catalogs_pwa', role: 'User feedback and bug reports submitted from HelpFloatingFAB.' },
];

const NODES = RAW_NODES.map((node) => {
  if (node.file) {
    const info = inspectFile(node.file);
    return { ...node, ...info };
  }
  return { ...node, exists: true };
});

const EDGES = [
  { from: 'index.ts', to: 'App.tsx', relation: 'boots_root' },
  { from: 'App.tsx', to: 'ThemeContext.tsx', relation: 'provides_context' },
  { from: 'App.tsx', to: 'AuthContext.tsx', relation: 'provides_context' },
  { from: 'App.tsx', to: 'NotificationContext.tsx', relation: 'provides_context' },
  { from: 'App.tsx', to: 'AppNavigator.tsx', relation: 'renders_router' },
  { from: 'App.tsx', to: 'outbox.ts', relation: 'starts_auto_sync' },
  { from: 'App.tsx', to: 'OfflineStatusBanner.tsx', relation: 'renders_status' },
  { from: 'dataService.ts', to: 'outbox.ts', relation: 'queues_writes' },
  { from: 'dataService.ts', to: 'readCache.ts', relation: 'cached_reads' },
  { from: 'OfflineStatusBanner.tsx', to: 'outbox.ts', relation: 'subscribes' },
  { from: 'OfflineStatusBanner.tsx', to: 'PendingChangesModal.tsx', relation: 'opens' },
  { from: 'PendingChangesModal.tsx', to: 'outbox.ts', relation: 'lists_retries_discards' },
  { from: 'StageDetailScreen.tsx', to: 'ActividadesPersonalesModal.tsx', relation: 'opens' },
  { from: 'ActividadesPersonalesModal.tsx', to: 'dataService.ts', relation: 'personal_activities_crud' },
  { from: 'ProfileScreen.tsx', to: 'MembershipRecordsModal.tsx', relation: 'opens_self' },
  { from: 'ScouterDashboardScreen.tsx', to: 'MembershipRecordsModal.tsx', relation: 'opens_leader' },
  { from: 'JefeGrupoScreen.tsx', to: 'MembershipRecordsModal.tsx', relation: 'opens_leader' },
  { from: 'MembershipRecordsModal.tsx', to: 'dataService.ts', relation: 'membership_records_crud' },
  { from: 'ScouterDashboardScreen.tsx', to: 'InsigniasExportBar.tsx', relation: 'renders' },
  { from: 'JefeGrupoScreen.tsx', to: 'InsigniasExportBar.tsx', relation: 'renders' },
  { from: 'InsigniasExportBar.tsx', to: 'insigniasReport.ts', relation: 'builds_report' },
  { from: 'insigniasReport.ts', to: 'reportWriters', relation: 'exports_with' },
  { from: 'FichaMedicaScreen.tsx', to: 'fichaScoutPdfGenerator.ts', relation: 'exports_pdf' },
  { from: 'JefeGrupoScreen.tsx', to: 'unitTemplates.ts', relation: 'age_check' },
  { from: 'PlanProgresivoScreen.tsx', to: 'unitTemplates.ts', relation: 'template_notice' },
  { from: 'CarnetScoutModal.tsx', to: 'VerificarCarnetScreen.tsx', relation: 'qr_links_to' },
  { from: 'VerificarCarnetScreen.tsx', to: 'verificar.js', relation: 'calls_with_session' },
  { from: 'SecureImage.tsx', to: 'fileUrl.ts', relation: 'resolves_signed_urls' },
  { from: 'DualProfileAvatar.tsx', to: 'SecureImage.tsx', relation: 'renders' },
  { from: 'CertificateUploadScreen.tsx', to: 'SecureImage.tsx', relation: 'renders' },
  { from: 'AuthContext.tsx', to: 'fileUrl.ts', relation: 'prefetch_and_clear_on_logout' },
  { from: 'CarnetScoutModal.tsx', to: 'ScoutQRCode.tsx', relation: 'renders_qr' },
  { from: 'DocumentosScreen.tsx', to: 'offlineDocs.ts', relation: 'caches_guides' },
  { from: 'App.tsx', to: 'dataService.ts', relation: 'flushes_offline_queue_on_reconnect' },
  { from: 'App.tsx', to: 'graphifyBridge.ts', relation: 'initializes_runtime_bridge' },
  { from: 'AppNavigator.tsx', to: 'DrawerNavigator.tsx', relation: 'routes_scout_role' },
  { from: 'AppNavigator.tsx', to: 'LoginScreen.tsx', relation: 'routes_unauthenticated' },
  { from: 'AppNavigator.tsx', to: 'RegisterScreen.tsx', relation: 'routes_unauthenticated' },
  { from: 'AppNavigator.tsx', to: 'ScouterDashboardScreen.tsx', relation: 'routes_scouter_role' },
  { from: 'AppNavigator.tsx', to: 'ScouterReviewScreen.tsx', relation: 'routes_scouter_role' },
  { from: 'AppNavigator.tsx', to: 'JefeGrupoScreen.tsx', relation: 'routes_jefe_grupo_role' },
  { from: 'AppNavigator.tsx', to: 'ComisionadoDashboardScreen.tsx', relation: 'routes_territorial_roles' },
  { from: 'DrawerNavigator.tsx', to: 'ScoutDashboardScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'PlanProgresivoScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'ProgramaScoutScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'QuarterlyPlanScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'FichaMedicaScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'CurriculumScoutScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'CertificateUploadScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'TemporalDriveScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'NudosManualScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'CancioneroScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'DocumentosScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'EspecialidadesScreen.tsx', relation: 'drawer_screen' },
  { from: 'DrawerNavigator.tsx', to: 'CalendarScreen.tsx', relation: 'drawer_screen' },
  { from: 'PlanProgresivoScreen.tsx', to: 'StageDetailScreen.tsx', relation: 'navigates_to_stage' },
  { from: 'StageDetailScreen.tsx', to: 'CatalogSelectorScreen.tsx', relation: 'selects_catalog_activity' },
  { from: 'StageDetailScreen.tsx', to: 'NochesAireLibreModal.tsx', relation: 'opens_nights_log' },
  { from: 'StageDetailScreen.tsx', to: 'VidaGrupoModal.tsx', relation: 'opens_vida_grupo_log' },
  { from: 'StageDetailScreen.tsx', to: 'dataService.ts', relation: 'toggles_requirements_and_submits_review' },
  { from: 'ProgramaScoutScreen.tsx', to: 'ProgramaScoutEditorScreen.tsx', relation: 'creates_or_edits_programa' },
  { from: 'ProgramaScoutEditorScreen.tsx', to: 'programaService.ts', relation: 'saves_programa' },
  { from: 'ProgramaScoutScreen.tsx', to: 'docxProgramaGenerator.ts', relation: 'exports_word_docx' },
  { from: 'ProgramaPdfPreviewModal.tsx', to: 'docxProgramaGenerator.ts', relation: 'exports_word_docx' },
  { from: 'FichaMedicaScreen.tsx', to: 'FichaMedicaOrion84Form.tsx', relation: 'renders_orion84_tab' },
  { from: 'FichaMedicaOrion84Form.tsx', to: 'fichaOrion84PdfGenerator.ts', relation: 'exports_orion84_pdf' },
  { from: 'FichaMedicaOrion84Form.tsx', to: 'fichaMedicaOrion84Layout.ts', relation: 'renders_fields_from_map' },
  { from: 'fichaOrion84PdfGenerator.ts', to: 'fichaMedicaOrion84Layout.ts', relation: 'draws_cells_from_map' },
  { from: 'ScoutDashboardScreen.tsx', to: 'ScoutUserIcon.tsx', relation: 'greeting_icon' },
  { from: 'ProgramaScoutEditorScreen.tsx', to: 'autoSaveService.ts', relation: 'autosaves_draft' },
  { from: 'FichaMedicaScreen.tsx', to: 'docxExporter.ts', relation: 'exports_medical_docx' },
  { from: 'CurriculumScoutScreen.tsx', to: 'docxExporter.ts', relation: 'exports_curriculum_docx' },
  { from: 'CertificateUploadScreen.tsx', to: 'dataService.ts', relation: 'uploads_and_syncs_to_curriculum' },
  { from: 'dataService.ts', to: 'db:profiles', relation: 'reads_writes' },
  { from: 'dataService.ts', to: 'db:stage_progress', relation: 'reads_writes' },
  { from: 'dataService.ts', to: 'db:requirement_progress', relation: 'reads_writes' },
  { from: 'dataService.ts', to: 'db:certificates', relation: 'reads_writes' },
  { from: 'dataService.ts', to: 'db:quarterly_plans', relation: 'reads_writes' },
  { from: 'dataService.ts', to: 'db:calendar_events', relation: 'reads_writes' },
  { from: 'programaService.ts', to: 'db:scout_programas', relation: 'reads_writes' },
  { from: 'notificationService.ts', to: 'db:scout_notifications', relation: 'reads_writes' },
  { from: 'webPushService.ts', to: 'db:push_subscriptions', relation: 'reads_writes' },
  { from: 'webPushService.ts', to: 'send-push.js', relation: 'invokes_serverless_push' },
];

const HYPEREDGES = [
  {
    id: 'he_offline_progression_sync',
    name: 'Offline-First Progression & Stage Approval Flow',
    nodes: ['StageDetailScreen.tsx', 'CatalogSelectorScreen.tsx', 'dataService.ts', 'ScouterReviewScreen.tsx', 'db:requirement_progress', 'db:stage_progress', 'notificationService.ts'],
    description: 'Scout toggles requirements or selects catalog activities (queued in the @scout_outbox_v1 outbox if offline, replayed automatically when back online) -> submits stage for review -> Scouter approves/rejects in ScouterReviewScreen -> triggers real-time + Web Push notification.',
  },
  {
    id: 'he_programa_scout_pipeline',
    name: 'Programa Scout Creation, Indicators, SDGs & DOCX Export Pipeline',
    nodes: ['ProgramaScoutScreen.tsx', 'ProgramaScoutEditorScreen.tsx', 'programaService.ts', 'achievementIndicatorsData.ts', 'sdgData.ts', 'docxProgramaGenerator.ts', 'ProgramaPdfPreviewModal.tsx', 'db:scout_programas'],
    description: 'Leaders/Rovers design unit or sinodal programs selecting 6 Growth Area indicators and 17 UN SDGs -> auto-saved locally -> persisted to scout_programas -> exported to official ASV Word .docx or PDF.',
  },
  {
    id: 'he_certificate_curriculum_sync',
    name: 'Certificate Upload & Automatic Curriculum Scout Synchronization',
    nodes: ['CertificateUploadScreen.tsx', 'storageService.ts', 'dataService.ts', 'CurriculumScoutScreen.tsx', 'docxExporter.ts', 'db:certificates', 'db:profiles'],
    description: 'Uploading a certificate compresses and stores the image in scout-files bucket, inserts into certificates table, and automatically synchronizes the achievement into the Scout Curriculum JSON for instant .docx export.',
  },
  {
    id: 'he_territorial_hierarchy',
    name: 'Multi-Role National Territorial Hierarchy (Scout -> Unidad -> Grupo -> Distrito -> Región -> Nacional)',
    nodes: ['AuthContext.tsx', 'AppNavigator.tsx', 'ScoutDashboardScreen.tsx', 'ScouterDashboardScreen.tsx', 'JefeGrupoScreen.tsx', 'ComisionadoDashboardScreen.tsx', 'db:profiles'],
    description: 'Role-gated navigation and data scoping across all 7 organizational levels of the Asociación de Scouts de Venezuela.',
  },
];

const QA_MATRIX = {
  version: '3.0.0',
  bridgeObject: 'window.__SCOUT_GRAPHIFY__',
  suites: [
    {
      id: 'QA-01',
      screenOrModule: 'LoginScreen & RegisterScreen (routes: Login, Register)',
      file: 'src/screens/LoginScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('Login')",
      focus: 'Authentication, Role Registration & Instant Offline Profile Restore',
      steps: [
        'Verify LoginScreen renders institutional branding, email/password inputs, and password recovery modal.',
        'Navigate to Register (`window.__SCOUT_GRAPHIFY__.navigate("Register")`) and verify role selector (Scout, Scouter, Jefe de Grupo, Comisionado) and Region/District/Group/Unit fields.',
        'Verify AuthContext 800ms safety timer prevents infinite loading spinners when offline.',
      ],
    },
    {
      id: 'QA-02',
      screenOrModule: 'ScoutDashboardScreen (route: Resumen)',
      file: 'src/screens/ScoutDashboardScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('Resumen')",
      focus: 'Scout Main Dashboard, Carnet Digital, Onboarding & Help FAB',
      steps: [
        'Verify active stage card, global progress percentage, and quick access grid render properly.',
        'Open CarnetScoutModal and verify unit colors, QR code, and membership status badge.',
        'Verify NotificationHeaderBell and HelpFloatingFAB open their respective modals.',
      ],
    },
    {
      id: 'QA-03',
      screenOrModule: 'PlanProgresivoScreen & StageDetailScreen (routes: PlanProgresivo, StageDetail)',
      file: 'src/screens/PlanProgresivoScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('PlanProgresivo')",
      focus: '4 Progression Stages (Precursor -> Fundador), Requirements & Offline Sync Queue',
      steps: [
        'Verify Precursor, Expedicionario, Descubridor, and Fundador cards display accurate requirement counts.',
        'Navigate to StageDetail (`window.__SCOUT_GRAPHIFY__.navigate("StageDetail", { stageId: "precursor" })`).',
        'Test opening NochesAireLibreModal and VidaGrupoModal from stage requirements.',
      ],
    },
    {
      id: 'QA-04',
      screenOrModule: 'CatalogSelectorScreen & EspecialidadesScreen (routes: CatalogSelector, Especialidades)',
      file: 'src/screens/CatalogSelectorScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('Especialidades')",
      focus: 'ASV Official Catalog Search & Specialties Levels (Bronce, Plata, Oro)',
      steps: [
        'Verify EspecialidadesScreen filters by category and displays Bronce, Plata, and Oro requirements.',
        'Verify CatalogSelectorScreen filters activities by stage and prevents duplicate selections across stages.',
      ],
    },
    {
      id: 'QA-05',
      screenOrModule: 'ProgramaScoutScreen & ProgramaScoutEditorScreen (routes: ProgramaScout, ProgramaScoutEditor)',
      file: 'src/screens/ProgramaScoutEditorScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('ProgramaScout')",
      focus: 'Activity Programs CRUD, 6 Growth Areas, 17 SDGs, PDF Preview & DOCX Export',
      steps: [
        'Verify ProgramaScoutScreen lists programs with unit filter pills (Manada, Tropa, Caminantes, Clan, Sinodal).',
        'Open ProgramaScoutEditorScreen (`window.__SCOUT_GRAPHIFY__.navigate("ProgramaScoutEditor")`) and verify schedule rows, 6 growth area indicators, and SDG selector.',
        'Test ProgramaPdfPreviewModal and Word .docx export via docxProgramaGenerator.',
      ],
    },
    {
      id: 'QA-06',
      screenOrModule: 'QuarterlyPlanScreen & CalendarScreen (routes: QuarterlyPlan, CalendarStandalone)',
      file: 'src/screens/QuarterlyPlanScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('QuarterlyPlan')",
      focus: 'Quarterly Planning (Trimestres I-IV), Shared Unit Plans & Calendar Events',
      steps: [
        'Verify QuarterlyPlanScreen switches across Trimestres I-IV and displays individual vs unit shared activities.',
        'Navigate to CalendarStandalone (`window.__SCOUT_GRAPHIFY__.navigate("CalendarStandalone")`) and verify monthly markers and event list.',
      ],
    },
    {
      id: 'QA-07',
      screenOrModule: 'FichaMedicaScreen & CurriculumScoutScreen (routes: FichaMedica, CurriculumScout)',
      file: 'src/screens/FichaMedicaScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('FichaMedica')",
      focus: 'Medical Record, Auto-Synced Scout Curriculum & Official DOCX Template Export',
      steps: [
        'Verify FichaMedicaScreen sections (blood type, allergies, emergency contacts, signature) and Word .docx export.',
        'Switch to the "Ficha Médica Orión 84" tab: fields prefilled from profile, Sí/No grid, save, and "Descargar Ficha Orión 84 (PDF)" produces an application/pdf blob.',
        'Navigate to CurriculumScout (`window.__SCOUT_GRAPHIFY__.navigate("CurriculumScout")`) and verify uploaded certificates sync automatically.',
      ],
    },
    {
      id: 'QA-08',
      screenOrModule: 'CertificateUploadScreen & TemporalDriveScreen (routes: CertificateUpload, TemporalDrive)',
      file: 'src/screens/CertificateUploadScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('CertificateUpload')",
      focus: 'Certificate Upload, Canvas Image Compression & Photo Evidence Albums',
      steps: [
        'Verify CertificateUploadScreen category/level pickers and certificate cards.',
        'Navigate to TemporalDrive (`window.__SCOUT_GRAPHIFY__.navigate("TemporalDrive")`) and verify album grid and photo viewer.',
      ],
    },
    {
      id: 'QA-09',
      screenOrModule: 'NudosManualScreen, CancioneroScreen & DocumentosScreen (Offline Library)',
      file: 'src/screens/NudosManualScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('NudosManual')",
      focus: '100% Offline Technical Manuals, SVG Knot Diagrams, Songbook & PDF Guides',
      steps: [
        'Verify NudosManualScreen renders interactive SVG diagrams (ManualVisualDiagram) for knots and lashings.',
        'Navigate to Cancionero (`window.__SCOUT_GRAPHIFY__.navigate("Cancionero")`) and Documentos (`window.__SCOUT_GRAPHIFY__.navigate("Documentos")`).',
      ],
    },
    {
      id: 'QA-10',
      screenOrModule: 'ScouterDashboardScreen, JefeGrupoScreen & ComisionadoDashboardScreen',
      file: 'src/screens/ScouterDashboardScreen.tsx',
      navigateCommand: "window.__SCOUT_GRAPHIFY__.navigate('ScouterDashboard')",
      focus: 'Leadership Dashboards, Requirement Validation, Membership Approval & Territorial Metrics',
      steps: [
        'Verify ScouterDashboardScreen displays unit scouts, online presence dots, and pending reviews.',
        'Verify JefeGrupoScreen membership expiration approval/rejection and ComisionadoDashboardScreen territorial drill-down.',
      ],
    },
  ],
};

const GRAPH_DATA = {
  metadata: {
    project: 'Plan Progresivo Scout ASV',
    version: '3.0.0-full-system',
    generatedAt: new Date().toISOString(),
    generator: 'scripts/graphify.js (Full-System AST/Regex Analyzer)',
    summary: {
      totalCommunities: COMMUNITIES.length,
      totalNodes: NODES.length,
      totalEdges: EDGES.length,
      totalHyperedges: HYPEREDGES.length,
      totalScreens: NODES.filter((n) => n.type === 'screen').length,
      totalComponents: NODES.filter((n) => n.type === 'component').length,
      totalContexts: NODES.filter((n) => n.type === 'context').length,
      totalServices: NODES.filter((n) => n.type === 'service').length,
      totalCatalogs: NODES.filter((n) => n.type === 'catalog').length,
      totalDatabaseTables: NODES.filter((n) => n.type === 'db_table').length,
      totalQaSuites: QA_MATRIX.suites.length,
    },
  },
  communities: COMMUNITIES,
  nodes: NODES,
  edges: EDGES,
  hyperedges: HYPEREDGES,
};

fs.writeFileSync(path.join(OUT_DIR, 'graph.json'), JSON.stringify(GRAPH_DATA, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'qa_matrix.json'), JSON.stringify(QA_MATRIX, null, 2), 'utf8');

// Generate GRAPH_REPORT.md
const reportLines = [
  '# Full-System Graphify Architectural Report — Plan Progresivo Scout ASV (v3.0.0)',
  '',
  `> **Generated**: \`${GRAPH_DATA.metadata.generatedAt}\` | **Communities**: \`${COMMUNITIES.length}\` | **Nodes**: \`${NODES.length}\` (\`${GRAPH_DATA.metadata.summary.totalScreens}\` Screens, \`${GRAPH_DATA.metadata.summary.totalComponents}\` Components, \`${GRAPH_DATA.metadata.summary.totalServices}\` Services, \`${GRAPH_DATA.metadata.summary.totalCatalogs}\` Catalogs, \`${GRAPH_DATA.metadata.summary.totalDatabaseTables}\` DB Tables) | **QA Suites**: \`${QA_MATRIX.suites.length}\``,
  '',
  '---',
  '',
  '## 1. System Communities Overview',
  '',
];

for (const c of COMMUNITIES) {
  reportLines.push(`### ${c.name} (\`${c.id}\`)`);
  reportLines.push(`${c.description}`);
  reportLines.push('');
  const cNodes = NODES.filter((n) => n.community === c.id);
  for (const n of cNodes) {
    const loc = n.file ? `([\`${n.file}\`](file://${path.join(ROOT, n.file)}), \`${n.lines} lines\`)` : '';
    const tables = n.supabaseTables && n.supabaseTables.length ? ` — **DB Tables**: \`${n.supabaseTables.join('`, `')}\`` : '';
    reportLines.push(`- **${n.label}** ${loc}: ${n.role || ''}${tables}`);
  }
  reportLines.push('');
}

reportLines.push('---');
reportLines.push('');
reportLines.push('## 2. Hyperedges (End-to-End Critical Data Flows)');
reportLines.push('');
for (const he of HYPEREDGES) {
  reportLines.push(`- **${he.name}** (\`${he.id}\`): ${he.description}`);
  reportLines.push(`  - *Nodes*: \`${he.nodes.join('` -> `')}\``);
}

reportLines.push('');
reportLines.push('---');
reportLines.push('');
reportLines.push('## 3. E2E & Visual QA Matrix (`window.__SCOUT_GRAPHIFY__`)');
reportLines.push('');
for (const s of QA_MATRIX.suites) {
  reportLines.push(`### ${s.id}: ${s.screenOrModule}`);
  reportLines.push(`- **File**: \`${s.file}\` | **Command**: \`${s.navigateCommand}\``);
  reportLines.push(`- **Focus**: ${s.focus}`);
  for (const step of s.steps) {
    reportLines.push(`  - ${step}`);
  }
  reportLines.push('');
}

fs.writeFileSync(path.join(OUT_DIR, 'GRAPH_REPORT.md'), reportLines.join('\n'), 'utf8');

// Generate Interactive HTML Explorer (graphify-out/graph.html)
const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plan Progresivo Scout ASV — Full-System Graphify Explorer (v3.0.0)</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #a855f7;
      --primary: #3b82f6;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      background: #0b1120;
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 18px; font-weight: 800; }
    .badge {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.4);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .controls { display: flex; align-items: center; gap: 10px; }
    input[type="search"], select {
      background: var(--panel);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 13px;
    }
    main {
      display: grid;
      grid-template-columns: 320px 1fr 380px;
      flex: 1;
      overflow: hidden;
    }
    .col {
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 16px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .card:hover, .card.active { border-color: var(--accent); }
    .card h3 { font-size: 14px; margin-bottom: 4px; }
    .card p { font-size: 12px; color: var(--muted); line-height: 1.4; }
    .pill {
      display: inline-block;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      margin-right: 6px;
      margin-top: 6px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
    }
    pre {
      background: #0b1120;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 8px;
      color: #e2e8f0;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚜️</span>
      <h1>Plan Progresivo Scout ASV — Full-System Graphify Explorer</h1>
      <span class="badge">${NODES.length} Nodes · ${EDGES.length} Edges · ${QA_MATRIX.suites.length} QA Suites</span>
    </div>
    <div class="controls">
      <input type="search" id="search" placeholder="Buscar pantalla, servicio, tabla..." />
      <select id="communityFilter">
        <option value="all">Todas las Comunidades (${COMMUNITIES.length})</option>
      </select>
    </div>
  </header>
  <main>
    <div class="col" id="communitiesCol"></div>
    <div class="col" id="nodesCol"></div>
    <div class="col" id="detailCol">
      <div class="card">
        <h3>Selecciona un nodo o suite QA</h3>
        <p>Explora las 8 comunidades arquitectónicas, contratos de servicios, tablas de Supabase y comandos de prueba para Claude Code.</p>
      </div>
    </div>
  </main>
  <script>
    const GRAPH = ${JSON.stringify(GRAPH_DATA)};
    const QA = ${JSON.stringify(QA_MATRIX)};
    const commSelect = document.getElementById('communityFilter');
    const commCol = document.getElementById('communitiesCol');
    const nodesCol = document.getElementById('nodesCol');
    const detailCol = document.getElementById('detailCol');
    const searchInput = document.getElementById('search');

    GRAPH.communities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      commSelect.appendChild(opt);

      const div = document.createElement('div');
      div.className = 'card';
      div.style.borderLeft = '4px solid ' + c.color;
      div.innerHTML = '<h3>' + c.name + '</h3><p>' + c.description + '</p>';
      div.onclick = () => { commSelect.value = c.id; renderNodes(); };
      commCol.appendChild(div);
    });

    function showDetail(n) {
      const outEdges = GRAPH.edges.filter(e => e.from === n.id);
      const inEdges = GRAPH.edges.filter(e => e.to === n.id);
      detailCol.innerHTML = \`
        <div class="card active">
          <h3>\${n.label}</h3>
          <p style="margin-top:6px">\${n.role || ''}</p>
          <span class="pill">Type: \${n.type}</span>
          \${n.lines ? '<span class="pill">' + n.lines + ' lines</span>' : ''}
          \${n.route ? '<span class="pill">Route: ' + n.route + '</span>' : ''}
          \${n.supabaseTables && n.supabaseTables.length ? '<pre>Supabase Tables:\\n' + n.supabaseTables.join(', ') + '</pre>' : ''}
          \${n.exports && n.exports.length ? '<pre>Exports:\\n' + n.exports.join(', ') + '</pre>' : ''}
          <pre>Outgoing Edges (\${outEdges.length}):\\n\${outEdges.map(e => '-> ' + e.to + ' (' + e.relation + ')').join('\\n') || 'None'}</pre>
          <pre>Incoming Edges (\${inEdges.length}):\\n\${inEdges.map(e => '<- ' + e.from + ' (' + e.relation + ')').join('\\n') || 'None'}</pre>
        </div>
      \`;
    }

    function renderNodes() {
      const q = searchInput.value.toLowerCase();
      const cFilter = commSelect.value;
      nodesCol.innerHTML = '';
      GRAPH.nodes
        .filter(n => (cFilter === 'all' || n.community === cFilter))
        .filter(n => !q || n.label.toLowerCase().includes(q) || (n.role && n.role.toLowerCase().includes(q)) || (n.file && n.file.toLowerCase().includes(q)))
        .forEach(n => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = '<h3>' + n.label + '</h3><p>' + (n.role || '') + '</p><span class="pill">' + n.type + '</span>' + (n.file ? '<span class="pill">' + n.file + '</span>' : '');
          div.onclick = () => showDetail(n);
          nodesCol.appendChild(div);
        });
    }

    searchInput.oninput = renderNodes;
    commSelect.onchange = renderNodes;
    renderNodes();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, 'graph.html'), htmlContent, 'utf8');

// 12 Full-System Verification Checks
const diskCount = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.(tsx?|js)$/.test(f)).length;
const DISK_COMPONENTS = diskCount('src/components');
const DISK_CATALOGS = diskCount('src/data');
const DISK_SCREENS = diskCount('src/screens');

const checks = [
  {
    name: `All ${DISK_SCREENS} Screens in src/screens Indexed & Present (${NODES.filter((n) => n.type === 'screen' && n.exists).length}/${DISK_SCREENS})`,
    ok: NODES.filter((n) => n.type === 'screen').every((n) => n.exists) && NODES.filter((n) => n.type === 'screen').length === DISK_SCREENS,
  },
  {
    name: `All ${DISK_COMPONENTS} Reusable UI Components in src/components Indexed & Present (${NODES.filter((n) => n.type === 'component' && n.exists).length}/${DISK_COMPONENTS})`,
    ok: NODES.filter((n) => n.type === 'component').every((n) => n.exists) && NODES.filter((n) => n.type === 'component').length === DISK_COMPONENTS,
  },
  {
    name: `All 3 Global Context Providers Present (${NODES.filter((n) => n.type === 'context' && n.exists).length}/3)`,
    ok: NODES.filter((n) => n.type === 'context').every((n) => n.exists) && NODES.filter((n) => n.type === 'context').length === 3,
  },
  {
    name: `All ${NODES.filter((n) => n.type === 'service').length} Backend/Offline/Realtime/Push/DOCX/PDF Services Present (${NODES.filter((n) => n.type === 'service' && n.exists).length}/${NODES.filter((n) => n.type === 'service').length})`,
    ok: NODES.filter((n) => n.type === 'service').every((n) => n.exists),
  },
  {
    name: `All ${DISK_CATALOGS} Static Data Catalogs in src/data Present (${NODES.filter((n) => n.type === 'catalog' && n.exists).length}/${DISK_CATALOGS})`,
    ok: NODES.filter((n) => n.type === 'catalog').every((n) => n.exists) && NODES.filter((n) => n.type === 'catalog').length === DISK_CATALOGS,
  },
  {
    name: `All 11 Supabase Database Tables Mapped (${NODES.filter((n) => n.type === 'db_table').length}/11)`,
    ok: NODES.filter((n) => n.type === 'db_table').length === 11,
  },
  {
    name: 'Offline-First Requirement Sync Queue Active (src/lib/dataService.ts)',
    ok: inspectFile('src/lib/dataService.ts').exists,
  },
  {
    name: 'Programa Scout Service & OpenXML DOCX Generator Active (src/lib/docxProgramaGenerator.ts)',
    ok: inspectFile('src/lib/docxProgramaGenerator.ts').exists && inspectFile('src/lib/programaService.ts').exists,
  },
  {
    name: 'Realtime Presence & Web Push VAPID Services Active (presenceService.ts & webPushService.ts)',
    ok: inspectFile('src/services/presenceService.ts').exists && inspectFile('src/services/webPushService.ts').exists,
  },
  {
    name: 'Claude Code Runtime Bridge Active (window.__SCOUT_GRAPHIFY__ in src/lib/graphifyBridge.ts)',
    ok: inspectFile('src/lib/graphifyBridge.ts').exists,
  },
  {
    name: 'PWA Service Worker & Serverless Web Push Endpoint Active (public/sw.js & api/send-push.js)',
    ok: inspectFile('public/sw.js').exists && inspectFile('api/send-push.js').exists,
  },
  {
    name: 'Master Supabase SQL Schema Present (supabase_master_fix_all_tables.sql)',
    ok: inspectFile('supabase_master_fix_all_tables.sql').exists,
  },
];

console.log('======================================================================');
console.log(' ⚜️ PLAN PROGRESIVO SCOUT ASV — FULL-SYSTEM GRAPHIFY REPORT (v3.0.0)');
console.log('======================================================================');
console.log(` • Communities : ${GRAPH_DATA.metadata.summary.totalCommunities}`);
console.log(` • Total Nodes : ${GRAPH_DATA.metadata.summary.totalNodes} (${['screen', 'component', 'context', 'service', 'catalog', 'db_table'].map((t) => `${NODES.filter((n) => n.type === t).length} ${t}`).join(', ')})`);
console.log(` • Total Edges : ${GRAPH_DATA.metadata.summary.totalEdges} directed + ${GRAPH_DATA.metadata.summary.totalHyperedges} hyperedges`);
console.log(` • QA Suites   : ${GRAPH_DATA.metadata.summary.totalQaSuites} E2E & Visual Test Suites for Claude Code`);
console.log('----------------------------------------------------------------------');
let allPassed = true;
for (const c of checks) {
  const icon = c.ok ? '✅' : '❌';
  if (!c.ok) allPassed = false;
  console.log(` ${icon} ${c.name}`);
}
console.log('----------------------------------------------------------------------');
console.log(' 📁 Generated Artifacts:');
console.log('    • graphify-out/graph.json');
console.log('    • graphify-out/qa_matrix.json');
console.log('    • graphify-out/GRAPH_REPORT.md');
console.log('    • graphify-out/graph.html');
console.log('======================================================================');

if (!allPassed) {
  process.exit(1);
}
