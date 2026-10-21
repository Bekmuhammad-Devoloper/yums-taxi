import { Alert, Platform } from 'react-native';

/** Xavfli amal oldidan tasdiq so'rash (vebda — brauzer oynasi) */
export const confirm = (title: string, msg: string, onYes: () => void, yes = 'Ha') => {
  if (Platform.OS === 'web') { if (globalThis.confirm?.(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'Bekor qilish', style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
};
