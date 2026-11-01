import { Alert, Platform } from 'react-native';

import { tr } from '@/lib/i18n';

/** Xavfli amal oldidan tasdiq so'rash (vebda — brauzer oynasi) */
export const confirm = (title: string, msg: string, onYes: () => void, yes = tr('Ha')) => {
  if (Platform.OS === 'web') { if (globalThis.confirm?.(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: tr('Bekor qilish'), style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
};
