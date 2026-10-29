import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
// Web is a preview; credentials never enter browser persistent storage.
const memory = new Map<string, string>();
export const secure = {
  get: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(memory.get(key) || null)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(void memory.set(key, value))
      : SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
  delete: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(void memory.delete(key))
      : SecureStore.deleteItemAsync(key),
};
