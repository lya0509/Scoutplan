/**
 * Helper universal de navegación segura para Web, Android e iOS.
 * Si la pila de historial existe y puede retroceder, ejecuta navigation.goBack().
 * Si la pantalla fue abierta directamente o se recargó la página, redirige al panel principal del usuario.
 */
export function navigateBackOrHome(navigation: any, userRole?: string) {
  if (!navigation) return;

  try {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
  } catch (e) {
    console.warn('Error comprobando canGoBack:', e);
  }

  // Fallback seguro según el rol
  const role = (userRole || '').toLowerCase();
  if (role === 'scouter') {
    navigation.navigate('ScouterDashboard');
  } else if (role === 'jefe_grupo' || role === 'admin') {
    navigation.navigate('JefeDashboard');
  } else if (role === 'comisionado') {
    navigation.navigate('ComisionadoDashboard');
  } else {
    try {
      navigation.navigate('Drawer', { screen: 'Resumen' });
    } catch {
      navigation.navigate('Resumen');
    }
  }
}
