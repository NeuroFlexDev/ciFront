import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api, queryClient, useSession } from './session';
import type { Bootstrap, Notice } from './types';
const channels: Record<string, string> = {
  assignment: 'Новые назначения',
  deadline: 'Сроки обучения',
  result: 'Результаты',
  review: 'Проверки',
  generation: 'Генерация',
};
if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
export function noticeRoute(
  note: Notice,
): '/notifications' | `/assignment/${number}` | `/review/${number}` | `/notice/${number}` {
  if (!Number.isSafeInteger(note.resource_id) || note.resource_id < 1) return '/notifications';
  if (note.resource_type === 'assignment') return `/assignment/${note.resource_id}`;
  if (note.resource_type === 'review') return `/review/${note.resource_id}`;
  if (note.resource_type === 'course') return `/notice/${note.id}`;
  return '/notifications';
}
export async function registerPush(ask: boolean) {
  if (Platform.OS === 'web')
    throw new Error(
      'Push доступен в приложении для iOS и Android. Здесь работает центр уведомлений.',
    );
  if (!Device.isDevice) throw new Error('Для проверки push используйте физическое устройство.');
  const boot = await api.public<Bootstrap>('/auth/mobile/bootstrap');
  if (!boot.push_notifications)
    throw new Error(
      'Доставка push ещё не подключена на сервере. История уведомлений уже доступна в приложении.',
    );
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId)
    throw new Error(
      'Эта сборка ещё не связана с проектом EAS. Push будет доступен после настройки выпуска.',
    );
  if (Platform.OS === 'android')
    for (const [id, name] of Object.entries(channels))
      await Notifications.setNotificationChannelAsync(id, {
        name,
        importance: 3 /* AndroidImportance.DEFAULT */,
      });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && ask && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error('Разрешите уведомления для Lernium в настройках телефона.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.request('/auth/mobile/push-device', 'PUT', { token, platform: Platform.OS });
}
export function usePush() {
  const { user, scope, revalidate } = useSession();
  const userId = user?.id;
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    let active = true;
    const seen = new Set<string>();
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (!response || seen.has(response.notification.request.identifier)) return;
      seen.add(response.notification.request.identifier);
      const id = response.notification.request.content.data?.notification_id;
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) return;
      try {
        const note = await api.request<Notice>('/notifications/' + id);
        if (!active) return;
        await api.request('/notifications/' + id + '/read', 'POST');
        if (!active) return;
        await queryClient.invalidateQueries({ queryKey: [scope] });
        router.push(noticeRoute(note));
      } catch {
        if (active) router.push('/notifications');
      } finally {
        Notifications.clearLastNotificationResponse();
      }
    };
    void handle(Notifications.getLastNotificationResponse());
    const tap = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: [scope] });
    });
    // Permission is requested only from the explicit settings action.
    const sync = () => {
      void revalidate().catch(() => {});
      void Notifications.getPermissionsAsync()
        .then((p) => {
          if (p.granted) return registerPush(false);
        })
        .catch(() => {});
      void queryClient.invalidateQueries({ queryKey: [scope] });
    };
    const state = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    const token = Notifications.addPushTokenListener(() => sync());
    sync();
    return () => {
      active = false;
      tap.remove();
      received.remove();
      state.remove();
      token.remove();
    };
  }, [userId, scope, revalidate]);
}
