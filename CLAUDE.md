# CLAUDE.md — Full-System Graphify & QA Guide for Claude Code (Plan Progresivo Scout ASV)

## 1. Agent Role Division & Protocolo Graphy
- **Antigravity (Backend, Offline Engine & Core Architecture Brain)**: Owns the Supabase PostgreSQL schema & RLS migrations ([`supabase_master_fix_all_tables.sql`](file:///home/lya/proyectos/plan-progresivo/supabase_master_fix_all_tables.sql)), Offline-First Sync Queue & Progression Engine ([`src/lib/dataService.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/dataService.ts)), Programa Scout CRUD & OpenXML `.docx` Generator ([`src/lib/programaService.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/programaService.ts), [`src/lib/docxProgramaGenerator.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/docxProgramaGenerator.ts)), Realtime Presence ([`src/services/presenceService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/presenceService.ts)), VAPID Web Push ([`src/services/webPushService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/webPushService.ts), [`api/send-push.js`](file:///home/lya/proyectos/plan-progresivo/api/send-push.js)), and the Runtime Graphify Bridge ([`src/lib/graphifyBridge.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/graphifyBridge.ts)).
- **Claude Code (Frontend Design, Visual Polish & E2E Testing Agent)**: Owns UI/UX polish, responsive layout inspection, component styling, and E2E verification across all **25 screens** and **21 reusable components** using the **Full-System Graphify** artifacts and `window.__SCOUT_GRAPHIFY__`.
- **Sincronización Incremental Obligatoria (Alta y Poda)**:
  - Antes de crear, modificar o refactorizar cualquier función, parámetro o pantalla, consulta **[`SYSTEM_GRAPH.md`](file:///home/lya/proyectos/plan-progresivo/SYSTEM_GRAPH.md)** y **[`graphify-out/GRAPH_REPORT.md`](file:///home/lya/proyectos/plan-progresivo/graphify-out/GRAPH_REPORT.md)**.
  - Al agregar o eliminar parámetros, funciones, pantallas o tablas, actualiza [`SYSTEM_GRAPH.md`](file:///home/lya/proyectos/plan-progresivo/SYSTEM_GRAPH.md) y ejecuta `npm run graphify`.

---

## 2. Always Start With the Full-System Graphify Artifacts
Before running broad file searches, read the pre-indexed Full-System Graphify suite:
1. **[`SYSTEM_GRAPH.md`](file:///home/lya/proyectos/plan-progresivo/SYSTEM_GRAPH.md)**: Master Mermaid architecture diagram, interface contracts, role matrix, and incremental synchronization log (Protocolo Graphy).
2. **[`graphify-out/GRAPH_REPORT.md`](file:///home/lya/proyectos/plan-progresivo/graphify-out/GRAPH_REPORT.md)**: Exhaustive architectural manual covering all **8 system communities**, **25 screens**, **21 components**, **3 contexts**, **16 services**, **9 static catalogs**, **11 database tables**, and **10 QA suites**.
3. **[`graphify-out/graph.json`](file:///home/lya/proyectos/plan-progresivo/graphify-out/graph.json)**: Machine-readable knowledge graph (`107 nodes`, `83 directed edges`, `4 hyperedges`) with exact exports, imports, Supabase tables touched, storage buckets, and AsyncStorage keys per file.
4. **[`graphify-out/qa_matrix.json`](file:///home/lya/proyectos/plan-progresivo/graphify-out/qa_matrix.json)**: Complete 10-suite E2E & Visual QA test matrix (`QA-01` through `QA-10`) with exact programmatic navigation commands.
5. **[`graphify-out/graph.html`](file:///home/lya/proyectos/plan-progresivo/graphify-out/graph.html)**: Interactive visual knowledge graph & QA matrix explorer.
6. **Regenerate / Verify Graph Anytime**:
   ```bash
   npm run graphify
   ```

---

## 3. Complete System Map (8 Communities)

### Community 1: Core Entry, Contexts & Multi-Role Navigation Router
- [`index.ts`](file:///home/lya/proyectos/plan-progresivo/index.ts) — Expo root entry.
- [`App.tsx`](file:///home/lya/proyectos/plan-progresivo/App.tsx) — Initializes `initGraphifyBridge()`, registers `/sw.js` PWA Service Worker, starts `outbox.startAutoSync()` (flush on `online`, on tab focus and every 30 s), renders `<OfflineStatusBanner/>`, and mounts `ThemeProvider` -> `AuthProvider` -> `NotificationProvider` -> `AppNavigator`.
- [`src/navigation/AppNavigator.tsx`](file:///home/lya/proyectos/plan-progresivo/src/navigation/AppNavigator.tsx) — Multi-role Stack router (`scout` -> `DrawerNavigator`, `scouter` -> `ScouterDashboardScreen`, `jefe_grupo` -> `JefeGrupoScreen`, `comisionado_*`/`nacional`/`admin` -> `ComisionadoDashboardScreen`).
- [`src/navigation/DrawerNavigator.tsx`](file:///home/lya/proyectos/plan-progresivo/src/navigation/DrawerNavigator.tsx) — 15-screen Scout sidebar drawer with theme customizer and PWA install modal.
- [`src/context/AuthContext.tsx`](file:///home/lya/proyectos/plan-progresivo/src/context/AuthContext.tsx), [`src/context/ThemeContext.tsx`](file:///home/lya/proyectos/plan-progresivo/src/context/ThemeContext.tsx), [`src/context/NotificationContext.tsx`](file:///home/lya/proyectos/plan-progresivo/src/context/NotificationContext.tsx).

### Community 2: Backend, Offline Sync Queue, Realtime Presence & Web Push Services
- [`src/lib/dataService.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/dataService.ts) — Offline-First data layer over the outbox queue in [`src/lib/offline/`](file:///home/lya/proyectos/plan-progresivo/src/lib/offline) (`@scout_outbox_v1`, migrates the legacy `@scout_offline_sync_queue`), stage/requirement progression, certificates + curriculum auto-sync, quarterly plans, CIP events, nights & vida de grupo logs, and membership date workflows.
- [`src/lib/programaService.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/programaService.ts) — CRUD & local cache (`@scout_programas_list`) for `scout_programas`.
- [`src/lib/storageService.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/storageService.ts) — HTML5 Canvas image compression (`<=800px`) & upload to `scout-files` bucket.
- [`src/lib/docxProgramaGenerator.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/docxProgramaGenerator.ts) — OpenXML `.docx` generator for `ProgramaScout`.
- [`src/lib/graphifyBridge.ts`](file:///home/lya/proyectos/plan-progresivo/src/lib/graphifyBridge.ts) — Mounts `window.__SCOUT_GRAPHIFY__`.
- [`src/services/autoSaveService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/autoSaveService.ts), [`src/services/notificationService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/notificationService.ts), [`src/services/presenceService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/presenceService.ts), [`src/services/webPushService.ts`](file:///home/lya/proyectos/plan-progresivo/src/services/webPushService.ts).

### Community 3: Scout Progression, Stages, Catalog & Evidence Screens
- [`src/screens/LoginScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/LoginScreen.tsx), [`src/screens/RegisterScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/RegisterScreen.tsx), [`src/screens/ScoutDashboardScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ScoutDashboardScreen.tsx), [`src/screens/PlanProgresivoScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/PlanProgresivoScreen.tsx), [`src/screens/StageDetailScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/StageDetailScreen.tsx), [`src/screens/CatalogSelectorScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/CatalogSelectorScreen.tsx), [`src/screens/EspecialidadesScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/EspecialidadesScreen.tsx), [`src/screens/ProfileScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ProfileScreen.tsx), [`src/screens/ScoutFullProfileScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ScoutFullProfileScreen.tsx).

### Community 4: Scouter, Jefe de Grupo & Comisionado Territorial Dashboards
- [`src/screens/ScouterDashboardScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ScouterDashboardScreen.tsx), [`src/screens/ScouterReviewScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ScouterReviewScreen.tsx), [`src/screens/JefeGrupoScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/JefeGrupoScreen.tsx), [`src/screens/ComisionadoDashboardScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ComisionadoDashboardScreen.tsx).

### Community 5: Programas Scout, Plan Trimestral, Calendario & Drive Screens
- [`src/screens/ProgramaScoutScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ProgramaScoutScreen.tsx), [`src/screens/ProgramaScoutEditorScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ProgramaScoutEditorScreen.tsx), [`src/screens/QuarterlyPlanScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/QuarterlyPlanScreen.tsx), [`src/screens/CalendarScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/CalendarScreen.tsx), [`src/screens/ActivityCenterScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/ActivityCenterScreen.tsx), [`src/screens/TemporalDriveScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/TemporalDriveScreen.tsx).

### Community 6: Ficha Médica, Currículum Scout, Certificados & Offline Manuals
- [`src/screens/FichaMedicaScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/FichaMedicaScreen.tsx), [`src/screens/CurriculumScoutScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/CurriculumScoutScreen.tsx), [`src/screens/CertificateUploadScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/CertificateUploadScreen.tsx), [`src/screens/NudosManualScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/NudosManualScreen.tsx), [`src/screens/CancioneroScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/CancioneroScreen.tsx), [`src/screens/DocumentosScreen.tsx`](file:///home/lya/proyectos/plan-progresivo/src/screens/DocumentosScreen.tsx).

---

## 4. Using `window.__SCOUT_GRAPHIFY__` in Browser / Playwright Tests
When running `npm run web`, use `window.__SCOUT_GRAPHIFY__` in DevTools or `agent-browser` / Playwright `page.evaluate()` to jump to any screen, inspect state, or run diagnostics:

```javascript
// 1. Run full backend & offline queue diagnostics
await window.__SCOUT_GRAPHIFY__.runDiagnostics();

// 2. Navigate to any screen instantaneously
window.__SCOUT_GRAPHIFY__.navigate('Resumen');
window.__SCOUT_GRAPHIFY__.navigate('PlanProgresivo');
window.__SCOUT_GRAPHIFY__.navigate('StageDetail', { stageId: 'precursor' });
window.__SCOUT_GRAPHIFY__.navigate('ProgramaScout');
window.__SCOUT_GRAPHIFY__.navigate('ProgramaScoutEditor');
window.__SCOUT_GRAPHIFY__.navigate('QuarterlyPlan');
window.__SCOUT_GRAPHIFY__.navigate('FichaMedica');
window.__SCOUT_GRAPHIFY__.navigate('CurriculumScout');
window.__SCOUT_GRAPHIFY__.navigate('NudosManual');
window.__SCOUT_GRAPHIFY__.navigate('Cancionero');
window.__SCOUT_GRAPHIFY__.navigate('Especialidades');

// 3. Toggle theme / palette for visual contrast checks
window.__SCOUT_GRAPHIFY__.uiTestHelpers.toggleDarkMode();
```
