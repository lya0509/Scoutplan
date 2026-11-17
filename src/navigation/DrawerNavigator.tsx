import React, { useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DualProfileAvatar } from '../components/DualProfileAvatar';
import {
  Moon, Sun, Palette, Home, User, Award, ClipboardList, Compass, Camera, HeartPulse, FileText, BookOpen, Music,
  FolderOpen, Medal, FileCheck, ListChecks, CalendarDays, Menu, Smartphone, LogOut,
} from 'lucide-react-native';
import { Press, ScreenTransition } from '../components/ui';
import { RADIUS } from '../theme/tokens';
import { ThemeCustomizerModal } from '../components/ThemeCustomizerModal';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { PWAInstallModal } from '../components/PWAInstallModal';

// Pantallas del Drawer
import ProfileScreen from '../screens/ProfileScreen';
import PlanProgresivoScreen from '../screens/PlanProgresivoScreen';
import ActivityCenterScreen from '../screens/ActivityCenterScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ScoutDashboardScreen from '../screens/ScoutDashboardScreen';
import CertificateUploadScreen from '../screens/CertificateUploadScreen';
import QuarterlyPlanScreen from '../screens/QuarterlyPlanScreen';
import TemporalDriveScreen from '../screens/TemporalDriveScreen';
import FichaMedicaScreen from '../screens/FichaMedicaScreen';
import CurriculumScoutScreen from '../screens/CurriculumScoutScreen';
import NudosManualScreen from '../screens/NudosManualScreen';
import CancioneroScreen from '../screens/CancioneroScreen';
import DocumentosScreen from '../screens/DocumentosScreen';
import EspecialidadesScreen from '../screens/EspecialidadesScreen';
import ProgramaScoutScreen from '../screens/ProgramaScoutScreen';

const Drawer = createDrawerNavigator();

// Ícono de cada pantalla del menú (antes eran emojis dentro del texto)
const ROUTE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Resumen: Home,
  Perfil: User,
  PlanProgresivo: Award,
  ProgramasScoutDrawer: ClipboardList,
  PlanTrimestralDrawer: Compass,
  TemporalDriveDrawer: Camera,
  FichaMedicaDrawer: HeartPulse,
  CurriculumScoutDrawer: FileText,
  NudosManualDrawer: BookOpen,
  CancioneroDrawer: Music,
  DocumentosDrawer: FolderOpen,
  EspecialidadesDrawer: Medal,
  CertificadosDrawer: FileCheck,
  CentroActividades: ListChecks,
  Calendario: CalendarDays,
};

// Barra inferior del teléfono: los cuatro destinos de todos los días + «Más» (abre el menú)
const TABS: { route: string; label: string }[] = [
  { route: 'Resumen', label: 'Inicio' },
  { route: 'PlanProgresivo', label: 'Plan' },
  { route: 'Calendario', label: 'Calendario' },
  { route: 'Perfil', label: 'Perfil' },
];
/** Desde este ancho el menú queda fijo a la izquierda y la barra inferior desaparece. */
const SIDEBAR_BREAKPOINT = 1024;

function BottomBar({ navigation, current }: { navigation: any; current: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.bottomBar, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]} accessibilityRole="tablist">
      {TABS.map(tab => {
        const Icon = ROUTE_ICONS[tab.route];
        const on = current === tab.route;
        const color = on ? theme.accentText : theme.subText;
        return (
          <Press
            key={tab.route}
            onPress={() => navigation.navigate(tab.route)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            style={styles.tab}
            scaleTo={0.92}
          >
            <View style={[styles.tabPill, on && { backgroundColor: theme.accentSoft }]}>
              <Icon size={22} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color, fontWeight: on ? '700' : '500' }]} numberOfLines={1}>{tab.label}</Text>
          </Press>
        );
      })}
      <Press onPress={() => navigation.openDrawer()} accessibilityRole="tab" accessibilityLabel="Más opciones" style={styles.tab} scaleTo={0.92}>
        <View style={styles.tabPill}><Menu size={22} color={theme.subText} /></View>
        <Text style={[styles.tabLabel, { color: theme.subText, fontWeight: '500' }]} numberOfLines={1}>Más</Text>
      </Press>
    </View>
  );
}

function HeaderRightButtons({ onOpenCustomizer }: { onOpenCustomizer: () => void }) {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const tint = isDarkMode ? '#ffffff' : theme.onPrimary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
      <Press style={styles.headerBtn} onPress={onOpenCustomizer} accessibilityLabel="Personalizar color" scaleTo={0.92}>
        <Palette size={20} color={tint} />
      </Press>
      <Press style={styles.headerBtn} onPress={toggleDarkMode} accessibilityLabel={isDarkMode ? 'Modo claro' : 'Modo oscuro'} scaleTo={0.92}>
        {isDarkMode ? <Sun size={20} color={tint} /> : <Moon size={20} color={tint} />}
      </Press>
    </View>
  );
}

function DrawerRow({ label, Icon, focused, onPress, tone }: { label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; focused?: boolean; onPress: () => void; tone?: 'danger' }) {
  const { theme } = useTheme();
  const color = tone === 'danger' ? theme.err : focused ? theme.accentText : theme.text;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!focused }}
      style={[styles.drawerRow, focused && { backgroundColor: theme.accentSoft }]}
      hoverStyle={focused ? undefined : { backgroundColor: theme.inputBg }}
      scaleTo={0.98}
    >
      <Icon size={20} color={color} />
      <Text style={[styles.drawerRowLabel, { color, fontWeight: focused ? '700' : '500' }]} numberOfLines={1}>{label}</Text>
    </Press>
  );
}

function CustomDrawerContent(props: any & { onOpenCustomizer: () => void; onOpenInstall: () => void }) {
  const { user, signOut } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const headerBg = isDarkMode ? theme.cardBg : theme.primary;
  const headerFg = isDarkMode ? '#ffffff' : theme.onPrimary;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ backgroundColor: theme.cardBg, paddingBottom: 20, paddingTop: 0, paddingStart: 0, paddingEnd: 0 }}
    >
      <View style={[styles.drawerHeader, { backgroundColor: headerBg, borderBottomWidth: isDarkMode ? 1 : 0, borderBottomColor: theme.border }]}>
        <View style={styles.avatarContainer}>
          {/* Foto del usuario (scout o, si no hay, la personal); si no tiene ninguna, la silueta */}
          <DualProfileAvatar
            scoutAvatarUrl={user?.avatar_url}
            customAvatarUrl={user?.custom_avatar_url}
            unit={user?.unit || undefined}
            role={user?.role}
            size={72}
            editable={false}
            showTabs={false}
          />
        </View>
        <Text style={[styles.userName, { color: headerFg }]}>{user?.name || 'Scout'}</Text>
        <Text style={[styles.userUnit, { color: headerFg }]}>{user?.group_name ? `${user.group_name} • ${user?.unit?.toUpperCase() || ''}` : 'Sin Grupo'}</Text>
      </View>

      <View style={{ paddingHorizontal: 12, gap: 2 }}>
        {props.state.routes.map((route: any, index: number) => {
          const isFocused = props.state.index === index;
          const options = props.descriptors[route.key].options;
          const label =
            options.drawerLabel !== undefined
              ? options.drawerLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          return (
            <DrawerRow
              key={route.key}
              label={label}
              Icon={ROUTE_ICONS[route.name] || Home}
              focused={isFocused}
              onPress={() => {
                if (isFocused) {
                  props.navigation.closeDrawer();
                } else {
                  props.navigation.navigate(route.name);
                }
              }}
            />
          );
        })}

        <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />
        <DrawerRow label="Instalar aplicación" Icon={Smartphone} onPress={props.onOpenInstall} />
        <DrawerRow label="Personalizar color" Icon={Palette} onPress={props.onOpenCustomizer} />
        <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />
        <DrawerRow label="Cerrar sesión" Icon={LogOut} tone="danger" onPress={() => signOut()} />
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { isDarkMode, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= SIDEBAR_BREAKPOINT;
  const headerFg = isDarkMode ? '#ffffff' : theme.onPrimary;
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(showCustomizer, () => setShowCustomizer(false));
  useModalBackHandler(showInstall, () => setShowInstall(false));

  return (
    <>
      <Drawer.Navigator
        backBehavior="history"
        drawerContent={(props) => (
          <CustomDrawerContent 
            {...props} 
            onOpenCustomizer={() => setShowCustomizer(true)} 
            onOpenInstall={() => setShowInstall(true)}
          />
        )}
        // Teléfono: barra inferior con los destinos de todos los días (el menú completo sigue en «Más»)
        screenLayout={({ children, navigation, route }: any) => (
          <View style={{ flex: 1 }}>
            <ScreenTransition>{children}</ScreenTransition>
            {!isWide && <BottomBar navigation={navigation} current={route.name} />}
          </View>
        )}
        screenOptions={{
          // Computadora: el menú queda fijo a la izquierda; teléfono: se abre encima
          drawerType: isWide ? 'permanent' : 'front',
          swipeEnabled: !isWide,
          swipeEdgeWidth: 120,
          overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
          headerStyle: { backgroundColor: isDarkMode ? '#000000' : theme.primary },
          headerTintColor: headerFg,
          headerTitleStyle: { fontWeight: '500', fontSize: 18 },
          ...(isWide ? { headerLeft: () => null } : {}),
          // La cabecera calcula el ancho del título suponiendo UN botón a la derecha; aquí hay dos
          // (paleta y modo oscuro, ~112 px). Sin esto los títulos largos («Documentos y Guías Scout»)
          // se montaban sobre los botones en el teléfono. Ahora se cortan con «…».
          headerTitleContainerStyle: { maxWidth: Math.max(120, width - 190) },
          headerRight: () => (
            <HeaderRightButtons
              onOpenCustomizer={() => setShowCustomizer(true)}
            />
          ),
          drawerStyle: { backgroundColor: theme.cardBg, width: isWide ? 264 : undefined, borderRightColor: theme.border, borderRightWidth: isWide ? 1 : 0 },
        }}
      >
        <Drawer.Screen name="Resumen" component={ScoutDashboardScreen} options={{ drawerLabel: 'Inicio' }} />
        <Drawer.Screen name="Perfil" component={ProfileScreen} />
        <Drawer.Screen name="PlanProgresivo" component={PlanProgresivoScreen} options={{ drawerLabel: 'Plan Progresivo', title: 'Plan Progresivo' }} />
        <Drawer.Screen name="ProgramasScoutDrawer" component={ProgramaScoutScreen} options={{ drawerLabel: 'Programas de Actividades', title: 'Programas' }} />
        <Drawer.Screen name="PlanTrimestralDrawer" component={QuarterlyPlanScreen} options={{ drawerLabel: 'Plan Trimestral', title: 'Plan Trimestral' }} />
        <Drawer.Screen name="TemporalDriveDrawer" component={TemporalDriveScreen} options={{ drawerLabel: 'Drive de Fotos', title: 'Drive de Fotos' }} />
        <Drawer.Screen name="FichaMedicaDrawer" component={FichaMedicaScreen} options={{ drawerLabel: 'Ficha Médica', title: 'Ficha Médica' }} />
        <Drawer.Screen name="CurriculumScoutDrawer" component={CurriculumScoutScreen} options={{ drawerLabel: 'Currículum Scout Joven', title: 'Currículum Scout Joven' }} />
        <Drawer.Screen name="NudosManualDrawer" component={NudosManualScreen} options={{ drawerLabel: 'Manuales', title: 'Manuales Scout' }} />
        <Drawer.Screen name="CancioneroDrawer" component={CancioneroScreen} options={{ drawerLabel: 'Cancionero y Oraciones', title: 'Cancionero' }} />
        <Drawer.Screen name="DocumentosDrawer" component={DocumentosScreen} options={{ drawerLabel: 'Documentos y Guías', title: 'Documentos y Guías' }} />
        <Drawer.Screen name="EspecialidadesDrawer" component={EspecialidadesScreen} options={{ drawerLabel: 'Especialidades Scout', title: 'Especialidades Scout' }} />
        <Drawer.Screen name="CertificadosDrawer" component={CertificateUploadScreen} options={{ drawerLabel: 'Mis Certificados', title: 'Mis Certificados' }} />
        <Drawer.Screen name="CentroActividades" component={ActivityCenterScreen} options={{ drawerLabel: 'Centro de Actividades', title: 'Actividades' }} />
        <Drawer.Screen name="Calendario" component={CalendarScreen} />
      </Drawer.Navigator>

      <ThemeCustomizerModal
        visible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />

      <PWAInstallModal
        visible={showInstall}
        onClose={() => setShowInstall(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  drawerHeader: { padding: 20, alignItems: 'center', marginBottom: 10 },
  avatarContainer: { marginBottom: 10 },
  userName: { fontSize: 18, fontWeight: '700' },
  userUnit: { fontSize: 13, marginTop: 2, fontWeight: '600', opacity: 0.9 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: RADIUS.md },
  drawerRowLabel: { fontSize: 14, flexShrink: 1 },
  drawerDivider: { height: 1, marginVertical: 8 },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 6, paddingBottom: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 2 },
  tabPill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12 },
});
