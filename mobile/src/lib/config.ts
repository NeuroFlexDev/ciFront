import Constants from 'expo-constants';
const origin = process.env.EXPO_PUBLIC_API_ORIGIN || 'https://dev.platform.lernium.ru';
if (
  ![
    'https://dev.platform.lernium.ru',
    'https://lernium.ru',
    'https://platform.lernium.ru',
  ].includes(origin) &&
  !(__DEV__ && origin === 'http://127.0.0.1:8006')
)
  throw new Error('Неподдерживаемый адрес сервера');
export const API_ORIGIN = origin;
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
export function compatible(minimum: string) {
  const app = APP_VERSION.split('.').map(Number),
    min = minimum.split('.').map(Number);
  if (app.length !== 3 || min.length !== 3 || min.some((n) => !Number.isInteger(n))) return false;
  for (let i = 0; i < 3; i++) {
    if (app[i] !== min[i]) return app[i] > min[i];
  }
  return true;
}
