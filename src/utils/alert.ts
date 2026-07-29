import { Alert, Platform } from 'react-native';

export function showAlert(
  title: string, 
  message?: string, 
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
) {
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    const fullMessage = message ? `${title}\n\n${message}` : title;

    if (buttons && buttons.length > 1) {
      // Si hay 2 botones, usar confirm
      const answer = window.confirm(fullMessage);
      if (answer) {
        buttons[0].onPress?.();
      } else {
        buttons[1].onPress?.();
      }
    } else {
      // Si hay 1 solo botón o ninguno, usar alert
      window.alert(fullMessage);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
