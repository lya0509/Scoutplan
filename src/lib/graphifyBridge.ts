import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import { dataService } from './dataService';
import { programaService } from './programaService';
import { storageService } from './storageService';
import { autoSaveService } from '../services/autoSaveService';
import { notificationService } from '../services/notificationService';
import { presenceService } from '../services/presenceService';
import { webPushService } from '../services/webPushService';
import { showBadgeCelebration } from './celebration';
import { stagesData } from '../data/progressionTemplate';
import { STAGE_COLORS } from '../theme/stageColors';
import { BADGE_IMAGES } from '../components/StageBadgeIcon';

export interface GraphifyRuntimeState {
  currentRoute: string;
  currentUserId: string | null;
  currentUserRole: string | null;
  currentUserUnit: string | null;
  currentUserGroup: string | null;
  isDarkMode: boolean;
  primaryColor: string;
}

type NavigateFn = (routeName: string, params?: Record<string, any>) => boolean;
type ThemeToggleFn = () => void;
type PrimaryColorFn = (hex: string) => void;

let navigateController: NavigateFn | null = null;
let themeToggleController: ThemeToggleFn | null = null;
let primaryColorController: PrimaryColorFn | null = null;

const currentRuntimeState: GraphifyRuntimeState = {
  currentRoute: 'Login',
  currentUserId: null,
  currentUserRole: null,
  currentUserUnit: null,
  currentUserGroup: null,
  isDarkMode: false,
  primaryColor: '#6b21a8',
};

export function registerGraphifyControllers(controllers: {
  navigate?: NavigateFn;
  toggleDarkMode?: ThemeToggleFn;
  setPrimaryColor?: PrimaryColorFn;
}) {
  if (controllers.navigate) navigateController = controllers.navigate;
  if (controllers.toggleDarkMode) themeToggleController = controllers.toggleDarkMode;
  if (controllers.setPrimaryColor) primaryColorController = controllers.setPrimaryColor;
}

export function updateGraphifyRuntimeState(partial: Partial<GraphifyRuntimeState>) {
  Object.assign(currentRuntimeState, partial);
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).__SCOUT_GRAPHIFY__) {
    (window as any).__SCOUT_GRAPHIFY__.runtimeState = { ...currentRuntimeState };
  }
}

export const FULL_SYSTEM_GRAPH_MANIFEST = {
  project: 'Plan Progresivo Scout ASV',
  version: '3.0.0-full-system',
  communities: [
    '1. Core Entry, Contexts & Multi-Role Navigation Router',
    '2. Backend, Offline Sync Queue, Realtime Presence & Web Push Services',
    '3. Scout Progression, Stages, Catalog & Evidence Screens',
    '4. Scouter, Jefe de Grupo & Comisionado Territorial Dashboards',
    '5. Programas Scout, Plan Trimestral, Calendario & DOCX Generators',
    '6. Ficha Médica, Currículum Scout, Certificados & Offline Manuals',
    '7. Reusable Modals, Avatars, Notifications & Theme Components',
    '8. Supabase Schema (11 Tables, Storage Buckets), Static Catalogs & PWA Config',
  ],
  routes: [
    { route: 'Login', path: '/ingresar', component: 'LoginScreen', file: 'src/screens/LoginScreen.tsx', requiresAuth: false },
    { route: 'Register', path: '/registro', component: 'RegisterScreen', file: 'src/screens/RegisterScreen.tsx', requiresAuth: false },
    { route: 'Resumen', path: '/inicio', component: 'ScoutDashboardScreen', file: 'src/screens/ScoutDashboardScreen.tsx', requiresAuth: true, drawer: true },
    { route: 'Perfil', path: '/perfil', component: 'ProfileScreen', file: 'src/screens/ProfileScreen.tsx', requiresAuth: true, drawer: true },
    { route: 'PlanProgresivo', path: '/plan', component: 'PlanProgresivoScreen', file: 'src/screens/PlanProgresivoScreen.tsx', requiresAuth: true, drawer: true },
    { route: 'StageDetail', path: '/etapa/:stageId', component: 'StageDetailScreen', file: 'src/screens/StageDetailScreen.tsx', requiresAuth: true },
    { route: 'CatalogSelector', path: '/catalogo', component: 'CatalogSelectorScreen', file: 'src/screens/CatalogSelectorScreen.tsx', requiresAuth: true },
    { route: 'ScouterDashboard', path: '/scouter', component: 'ScouterDashboardScreen', file: 'src/screens/ScouterDashboardScreen.tsx', requiresAuth: true },
    { route: 'ScouterReview', path: '/scouter-revision', component: 'ScouterReviewScreen', file: 'src/screens/ScouterReviewScreen.tsx', requiresAuth: true },
    { route: 'JefeDashboard', path: '/jefe-grupo', component: 'JefeGrupoScreen', file: 'src/screens/JefeGrupoScreen.tsx', requiresAuth: true },
    { route: 'ComisionadoDashboard', path: '/comisionado', component: 'ComisionadoDashboardScreen', file: 'src/screens/ComisionadoDashboardScreen.tsx', requiresAuth: true },
    { route: 'ProgramaScout', path: '/programas-actividades', component: 'ProgramaScoutScreen', file: 'src/screens/ProgramaScoutScreen.tsx', requiresAuth: true },
    { route: 'ProgramaScoutEditor', path: '/programa-editor', component: 'ProgramaScoutEditorScreen', file: 'src/screens/ProgramaScoutEditorScreen.tsx', requiresAuth: true },
    { route: 'QuarterlyPlan', path: '/plan-trimestral-standalone', component: 'QuarterlyPlanScreen', file: 'src/screens/QuarterlyPlanScreen.tsx', requiresAuth: true },
    { route: 'CalendarStandalone', path: '/calendario', component: 'CalendarScreen', file: 'src/screens/CalendarScreen.tsx', requiresAuth: true },
    { route: 'CentroActividades', path: '/actividades', component: 'ActivityCenterScreen', file: 'src/screens/ActivityCenterScreen.tsx', requiresAuth: true, drawer: true },
    { route: 'TemporalDrive', path: '/drive-fotos-standalone', component: 'TemporalDriveScreen', file: 'src/screens/TemporalDriveScreen.tsx', requiresAuth: true },
    { route: 'CertificateUpload', path: '/mis-certificados', component: 'CertificateUploadScreen', file: 'src/screens/CertificateUploadScreen.tsx', requiresAuth: true },
    { route: 'ScoutFullProfile', path: '/perfil-completo', component: 'ScoutFullProfileScreen', file: 'src/screens/ScoutFullProfileScreen.tsx', requiresAuth: true },
    { route: 'FichaMedica', path: '/ficha-medica-standalone', component: 'FichaMedicaScreen', file: 'src/screens/FichaMedicaScreen.tsx', requiresAuth: true },
    { route: 'CurriculumScout', path: '/curriculo-standalone', component: 'CurriculumScoutScreen', file: 'src/screens/CurriculumScoutScreen.tsx', requiresAuth: true },
    { route: 'Especialidades', path: '/especialidades-catalogo', component: 'EspecialidadesScreen', file: 'src/screens/EspecialidadesScreen.tsx', requiresAuth: true },
    { route: 'NudosManual', path: '/manual-nudos', component: 'NudosManualScreen', file: 'src/screens/NudosManualScreen.tsx', requiresAuth: true },
    { route: 'Cancionero', path: '/cancionero-scout', component: 'CancioneroScreen', file: 'src/screens/CancioneroScreen.tsx', requiresAuth: true },
    { route: 'Documentos', path: '/documentos-scout', component: 'DocumentosScreen', file: 'src/screens/DocumentosScreen.tsx', requiresAuth: true },
  ],
  databaseTables: [
    { table: 'profiles', pk: 'id', purpose: 'Perfiles de usuarios (scout, scouter, jefe_grupo, comisionado_distrital/regional, nacional, admin), membresía, avatares, ficha médica, currículum, bitácoras y carnet' },
    { table: 'stage_progress', pk: 'id', purpose: 'Estado de etapas de progresión por scout (En Progreso, En Revision, Aprobada, Bloqueada)' },
    { table: 'requirement_progress', pk: 'id', purpose: 'Avance individual de requisitos por etapa y scout (sincronizado con cola offline)' },
    { table: 'certificates', pk: 'id', purpose: 'Certificados y cursos cargados por el scout y sincronizados al Currículum Scout' },
    { table: 'scout_programas', pk: 'id', purpose: 'Programas de actividades de unidad/sinodales con cronograma, indicadores de logro y ODS' },
    { table: 'quarterly_plans', pk: 'id', purpose: 'Planes trimestrales individuales y compartidos por unidad/grupo con retroalimentación de Scouter' },
    { table: 'calendar_events', pk: 'id', purpose: 'Eventos del calendario de unidad, grupo, distrito y CIP' },
    { table: 'scout_notifications', pk: 'id', purpose: 'Notificaciones enriquecidas del sistema por usuario, rol, unidad o grupo' },
    { table: 'notifications', pk: 'id', purpose: 'Tabla legacy/directa de notificaciones usuario a usuario' },
    { table: 'push_subscriptions', pk: 'id', purpose: 'Suscripciones Web Push VAPID activas por dispositivo y usuario' },
    { table: 'bug_reports', pk: 'id', purpose: 'Reportes de soporte y diagnóstico enviados desde el botón flotante de ayuda' },
  ],
  storageBuckets: [
    { bucket: 'scout-files', purpose: 'Fotos de perfil, avatares scout/custom, firmas digitales, carnets, certificados y álbumes de evidencia fotográfica' },
  ],
  storageKeys: [
    { key: '@scout_cached_profile', purpose: 'Caché instantánea (0-10ms) del perfil autenticado para soporte offline' },
    { key: '@scout_cached_session', purpose: 'Caché local de sesión de Supabase Auth' },
    { key: '@scout_outbox_v1', purpose: 'Cola de cambios hechos sin conexión (requisitos, noches, certificados, fichas, planes…) pendientes por enviar' },
    { key: '@scout_programas_list', purpose: 'Almacenamiento local/offline de Programas Scout creados y descargados' },
    { key: '@scout_temporal_drive_albums', purpose: 'Caché local de álbumes fotográficos de evidencia (Drive Temporal)' },
    { key: '@scout_autosave_*', purpose: 'Borradores autoguardados con debounce de formularios largos (Ficha Médica, Currículum, Programa, Plan Trimestral)' },
    { key: 'app_dark_mode', purpose: 'Preferencia de modo oscuro/claro persistida' },
    { key: 'app_primary_color', purpose: 'Color primario personalizado de la interfaz' },
  ],
};

export function initGraphifyBridge() {
  // Solo en desarrollo: en producción expondría todos los servicios en la consola.
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;

  const w = window as any;
  const bridge = {
    version: FULL_SYSTEM_GRAPH_MANIFEST.version,
    manifest: FULL_SYSTEM_GRAPH_MANIFEST,
    runtimeState: currentRuntimeState,
    getState: async () => {
      const queue = await dataService.getSyncQueue();
      return {
        ...currentRuntimeState,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        pendingOfflineRequirements: queue.length,
      };
    },
    navigate: (routeName: string, params?: Record<string, any>) => {
      if (navigateController) {
        const ok = navigateController(routeName, params);
        return { ok, navigatedTo: routeName, params };
      }
      return { ok: false, error: 'Navigation controller not mounted yet' };
    },
    uiTestHelpers: {
      toggleDarkMode: () => {
        if (themeToggleController) {
          themeToggleController();
          return true;
        }
        return false;
      },
      setPrimaryColor: (hex: string) => {
        if (primaryColorController) {
          primaryColorController(hex);
          return true;
        }
        return false;
      },
      /** Muestra la celebración de una insignia sin aprobar nada (QA / vista previa). */
      celebrate: (stageId: string = 'precursor') => {
        const idx = stagesData.findIndex(st => st.id === stageId);
        return showBadgeCelebration({
          title: stagesData[idx]?.title || stageId,
          color: STAGE_COLORS[stageId] || '#7c3aed',
          badge: BADGE_IMAGES[stageId],
          isMax: idx === stagesData.length - 1,
          unitLabel: 'Clan',
          nextTitle: stagesData[idx + 1]?.title,
        });
      },
    },
    services: {
      dataService,
      programaService,
      storageService,
      autoSaveService,
      notificationService,
      presenceService,
      webPushService,
    },
    runDiagnostics: async () => {
      const queue = await dataService.getSyncQueue();
      const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        project: FULL_SYSTEM_GRAPH_MANIFEST.project,
        version: FULL_SYSTEM_GRAPH_MANIFEST.version,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        offlineSyncQueueLength: queue.length,
        currentRoute: currentRuntimeState.currentRoute,
        currentUserRole: currentRuntimeState.currentUserRole,
        checks: {},
      };

      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        results.checks.supabaseAuth = {
          ok: !sessionErr,
          authenticated: Boolean(sessionData?.session?.user),
          userId: sessionData?.session?.user?.id || null,
        };
      } catch (e: any) {
        results.checks.supabaseAuth = { ok: false, error: e?.message };
      }

      try {
        const programas = await programaService.getProgramas();
        results.checks.programasService = {
          ok: Array.isArray(programas),
          count: programas.length,
        };
      } catch (e: any) {
        results.checks.programasService = { ok: false, error: e?.message };
      }

      return results;
    },
  };

  w.__SCOUT_GRAPHIFY__ = bridge;
  w.__PLAN_GRAPHIFY__ = bridge;
}
