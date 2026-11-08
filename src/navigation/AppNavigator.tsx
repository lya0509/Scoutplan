import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Platform, BackHandler } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { registerGraphifyControllers, updateGraphifyRuntimeState } from '../lib/graphifyBridge';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

import ScoutDashboardScreen from '../screens/ScoutDashboardScreen';
import ScouterDashboardScreen from '../screens/ScouterDashboardScreen';
import JefeGrupoScreen from '../screens/JefeGrupoScreen';
import ComisionadoDashboardScreen from '../screens/ComisionadoDashboardScreen';
import StageDetailScreen from '../screens/StageDetailScreen';
import ScouterReviewScreen from '../screens/ScouterReviewScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CatalogSelectorScreen from '../screens/CatalogSelectorScreen';
import CertificateUploadScreen from '../screens/CertificateUploadScreen';
import ScoutFullProfileScreen from '../screens/ScoutFullProfileScreen';
import QuarterlyPlanScreen from '../screens/QuarterlyPlanScreen';
import TemporalDriveScreen from '../screens/TemporalDriveScreen';
import FichaMedicaScreen from '../screens/FichaMedicaScreen';
import CurriculumScoutScreen from '../screens/CurriculumScoutScreen';
import NudosManualScreen from '../screens/NudosManualScreen';
import CancioneroScreen from '../screens/CancioneroScreen';
import DocumentosScreen from '../screens/DocumentosScreen';
import ProgramaScoutScreen from '../screens/ProgramaScoutScreen';
import ProgramaScoutEditorScreen from '../screens/ProgramaScoutEditorScreen';
import EspecialidadesScreen from '../screens/EspecialidadesScreen';
import VerificarCarnetScreen from '../screens/VerificarCarnetScreen';
import CuentaEnRevisionScreen from '../screens/CuentaEnRevisionScreen';
import AdministracionScreen from '../screens/AdministracionScreen';
import NuevaContrasenaScreen from '../screens/NuevaContrasenaScreen';

import DrawerNavigator from './DrawerNavigator';

const Stack = createNativeStackNavigator();

const linking: any = {
  prefixes: [
    'scoutplan://',
    'http://localhost:8081',
    'http://localhost:19006',
    'https://scoutplan.vercel.app',
    'https://*.vercel.app'
  ],
  config: {
    screens: {
      Login: 'ingresar',
      Register: 'registro',
      Drawer: {
        screens: {
          Resumen: 'inicio',
          Perfil: 'perfil',
          PlanProgresivo: 'plan',
          ProgramasScoutDrawer: 'programas',
          PlanTrimestralDrawer: 'plan-trimestral',
          TemporalDriveDrawer: 'drive-fotos',
          FichaMedicaDrawer: 'ficha-medica',
          CurriculumScoutDrawer: 'curriculo',
          NudosManualDrawer: 'nudos',
          CancioneroDrawer: 'cancionero',
          DocumentosDrawer: 'documentos',
          EspecialidadesDrawer: 'especialidades',
          CertificadosDrawer: 'certificados',
          CentroActividades: 'actividades',
          Calendario: 'calendario',
        }
      },
      StageDetail: 'etapa/:stageId',
      ScouterDashboard: 'scouter',
      ScouterReview: 'scouter-revision',
      JefeDashboard: 'jefe-grupo',
      Administracion: 'administracion',
      CatalogSelector: 'catalogo',
      CertificateUpload: 'mis-certificados',
      ScoutFullProfile: 'perfil-completo',
      QuarterlyPlan: 'plan-trimestral-standalone',
      TemporalDrive: 'drive-fotos-standalone',
      FichaMedica: 'ficha-medica-standalone',
      CurriculumScout: 'curriculo-standalone',
      NudosManual: 'manual-nudos',
      Cancionero: 'cancionero-scout',
      Documentos: 'documentos-scout',
      Especialidades: 'especialidades-catalogo',
      ProgramaScout: 'programas-actividades',
      ProgramaScoutEditor: 'programa-editor',
      VerificarCarnet: 'verificar/:id',
    }
  }
};


const DRAWER_SUBROUTES = new Set([
  'Resumen',
  'Perfil',
  'PlanProgresivo',
  'ProgramasScoutDrawer',
  'PlanTrimestralDrawer',
  'TemporalDriveDrawer',
  'FichaMedicaDrawer',
  'CurriculumScoutDrawer',
  'NudosManualDrawer',
  'CancioneroDrawer',
  'DocumentosDrawer',
  'EspecialidadesDrawer',
  'CertificadosDrawer',
  'CentroActividades',
  'Calendario',
]);

// Verificación de carnet abierta sin sesión (/verificar/<id>): se recuerda el código y,
// al iniciar sesión, se abre la verificación. Sin sesión no se muestra nada.
const PENDING_VERIFY_KEY = '@pending_verify_id';
const VERIFY_PATH = /^\/verificar\/([0-9a-f-]{36})\/?$/i;

function rememberPendingVerify() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    const m = VERIFY_PATH.exec(window.location.pathname);
    if (m) window.sessionStorage.setItem(PENDING_VERIFY_KEY, m[1]);
  } catch {}
}

function takePendingVerify(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const id = window.sessionStorage.getItem(PENDING_VERIFY_KEY);
    if (id) window.sessionStorage.removeItem(PENDING_VERIFY_KEY);
    return id;
  } catch {
    return null;
  }
}

export function hasPendingVerify(): boolean {
  try { return typeof window !== 'undefined' && !!window.sessionStorage.getItem(PENDING_VERIFY_KEY); } catch { return false; }
}

export default function AppNavigator() {
  const { user, isLoading, recoveryMode } = useAuth();
  const { isDarkMode, primaryColor, toggleDarkMode, setPrimaryColor } = useTheme();
  const navigationRef = React.useRef<any>(null);

  // Sin sesión: guardar el código del QR para después del inicio de sesión
  if (!user) rememberPendingVerify();

  useEffect(() => {
    if (!user || user.account_status === 'pending' || user.account_status === 'rejected') return;
    const id = takePendingVerify();
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const nav = navigationRef.current;
      if (nav?.isReady?.()) {
        clearInterval(timer);
        if (nav.getCurrentRoute?.()?.name !== 'VerificarCarnet') nav.navigate('VerificarCarnet', { id });
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [user?.id, user?.account_status]);

  useEffect(() => {
    updateGraphifyRuntimeState({
      currentUserId: user?.id || null,
      currentUserRole: user?.role || null,
      currentUserUnit: user?.unit || null,
      currentUserGroup: user?.group_name || null,
      isDarkMode,
      primaryColor,
    });
  }, [user, isDarkMode, primaryColor]);

  useEffect(() => {
    registerGraphifyControllers({
      toggleDarkMode,
      setPrimaryColor,
      navigate: (routeName: string, params?: Record<string, any>) => {
        if (!navigationRef.current || !navigationRef.current.isReady()) return false;
        if (DRAWER_SUBROUTES.has(routeName) && (!user?.role || user?.role === 'scout')) {
          navigationRef.current.navigate('Drawer', { screen: routeName, params });
        } else {
          navigationRef.current.navigate(routeName, params);
        }
        updateGraphifyRuntimeState({ currentRoute: routeName });
        return true;
      },
    });
  }, [user, toggleDarkMode, setPrimaryColor]);

  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#18181b' }}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      // Encabezados y fondos de navegación según el modo claro/oscuro de la app
      theme={isDarkMode
        ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: primaryColor, background: '#000000', card: '#121214', border: '#27272a' } }
        : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: primaryColor } }}
      onStateChange={() => {
        const current = navigationRef.current?.getCurrentRoute?.();
        if (current?.name) {
          updateGraphifyRuntimeState({ currentRoute: current.name });
        }
      }}
    >
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false, 
          gestureEnabled: true, 
          fullScreenGestureEnabled: true, 
          animation: 'slide_from_right' 
        }}
      >
        {!user ? (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Ingresar' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Registro' }} />
          </Stack.Group>
        ) : recoveryMode ? (
          // Entró con el enlace de «¿Olvidaste tu contraseña?»: primero la contraseña nueva
          <Stack.Screen name="NuevaContrasena" component={NuevaContrasenaScreen} options={{ title: 'Contraseña nueva' }} />
        ) : (user.account_status === 'pending' || user.account_status === 'rejected') ? (
          // Cuenta nueva sin aprobar: no ve nada del grupo hasta que la aprueben
          <Stack.Screen name="CuentaEnRevision" component={CuentaEnRevisionScreen} options={{ title: 'Cuenta en revisión' }} />
        ) : (
          <Stack.Group>
            {(!user.role || user.role === 'scout') && (
              <>
                <Stack.Screen name="Drawer" component={DrawerNavigator} />
                <Stack.Screen name="StageDetail" component={StageDetailScreen} options={{ headerShown: true, title: 'Detalle de Etapa' }} />
              </>
            )}

            {user.role === 'scouter' && (
              <>
                <Stack.Screen name="ScouterDashboard" component={ScouterDashboardScreen} />
                <Stack.Screen name="ScouterReview" component={ScouterReviewScreen} options={{ headerShown: true, title: 'Revisión de Scout' }} />
                <Stack.Screen name="CalendarStandalone" component={CalendarScreen} options={{ headerShown: true, title: 'Calendario de Unidad' }} />
              </>
            )}

            {user.role === 'jefe_grupo' && (
              <>
                <Stack.Screen name="JefeDashboard" component={JefeGrupoScreen} />
                <Stack.Screen name="CalendarStandalone" component={CalendarScreen} options={{ headerShown: true, title: 'Calendario de Grupo' }} />
                <Stack.Screen name="Administracion" component={AdministracionScreen} options={{ headerShown: true, title: 'Roles y miembros' }} />
              </>
            )}

            {(user.role === 'comisionado_distrital' || user.role === 'comisionado_regional' || user.role === 'nacional' || user.role === 'admin') && (
              <>
                <Stack.Screen name="ComisionadoDashboard" component={ComisionadoDashboardScreen} />
                <Stack.Screen name="CalendarStandalone" component={CalendarScreen} options={{ headerShown: true, title: 'Calendario Territorial' }} />
                <Stack.Screen name="Administracion" component={AdministracionScreen} options={{ headerShown: true, title: 'Administración' }} />
              </>
            )}

            {/* Rutas compartidas por cualquier usuario autenticado */}
            <Stack.Screen name="CatalogSelector" component={CatalogSelectorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CertificateUpload" component={CertificateUploadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ScoutFullProfile" component={ScoutFullProfileScreen} options={{ headerShown: true, title: 'Perfil Completo del Scout' }} />
            <Stack.Screen name="QuarterlyPlan" component={QuarterlyPlanScreen} options={{ headerShown: true, title: 'Plan Trimestral' }} />
            <Stack.Screen name="TemporalDrive" component={TemporalDriveScreen} options={{ headerShown: true, title: 'Drive de Fotos' }} />
            <Stack.Screen name="FichaMedica" component={FichaMedicaScreen} options={{ headerShown: true, title: 'Ficha Médica Scout' }} />
            <Stack.Screen name="CurriculumScout" component={CurriculumScoutScreen} options={{ headerShown: true, title: 'Currículum Scout Joven' }} />
            <Stack.Screen name="NudosManual" component={NudosManualScreen} options={{ headerShown: true, title: 'Manuales y Técnicas Scout (Offline)' }} />
            <Stack.Screen name="Cancionero" component={CancioneroScreen} options={{ headerShown: true, title: 'Cancionero Scout (Offline)' }} />
            <Stack.Screen name="Documentos" component={DocumentosScreen} options={{ headerShown: true, title: 'Documentos y Guías Scout' }} />
            <Stack.Screen name="Especialidades" component={EspecialidadesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProgramaScout" component={ProgramaScoutScreen} options={{ headerShown: true, title: 'Programas de Actividades' }} />
            <Stack.Screen name="ProgramaScoutEditor" component={ProgramaScoutEditorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VerificarCarnet" component={VerificarCarnetScreen} options={{ headerShown: false, title: 'Verificar carnet' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
