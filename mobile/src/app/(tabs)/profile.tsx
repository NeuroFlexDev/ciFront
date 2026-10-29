import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { api, useSession, queryClient } from '../../lib/session';
import { roles, type User } from '../../lib/types';
import { drafts } from '../../lib/drafts';
import { Page, Card, Txt, Field, Button, ErrorState } from '../../ui/components';
import { APP_VERSION, API_ORIGIN } from '../../lib/config';
export default function Profile() {
  const { user, logout, scope } = useSession(),
    [name, setName] = useState(user?.full_name || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState('');
  async function save() {
    setBusy(true);
    try {
      await api.request<User>('/me', 'PATCH', { full_name: name });
      setMessage('Имя сохранено.');
      await queryClient.invalidateQueries();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function exit() {
    setBusy(true);
    try {
      await logout();
      router.replace('/login');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    try {
      await drafts.clear(scope);
      setMessage('Черновики на этом устройстве удалены.');
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Page title='Профиль'>
      <Card>
        <Txt heading size={26}>
          {user?.full_name || user?.username || 'Ваш аккаунт'}
        </Txt>
        <Txt muted>{roles[user?.organization_role || 'member']}</Txt>
        <Txt size={14}>{user?.email || user?.username}</Txt>
      </Card>
      {!!error && <ErrorState error={error} />}
      <Card>
        <Field label='Имя и фамилия' value={name} onChangeText={setName} maxLength={160} />
        <Button
          title='Сохранить имя'
          busy={busy}
          disabled={!name.trim()}
          onPress={() => void save()}
        />
      </Card>
      <Button
        title='Настройки уведомлений'
        secondary
        onPress={() => router.push('/notification-settings')}
      />
      <Button title='Мои результаты' secondary onPress={() => router.push('/results')} />
      <Card>
        <Txt size={20}>Защищённые черновики</Txt>
        <Txt muted size={14}>
          На телефоне ответы шифруются и доступны только вашему аккаунту. При истечении сеанса они
          сохраняются для следующего входа.
          {Platform.OS === 'web'
            ? ' В браузерном предпросмотре черновики хранятся только до закрытия страницы.'
            : ''}
        </Txt>
        <Button
          title='Удалить локальные черновики'
          secondary
          onPress={() =>
            Alert.alert(
              'Удалить черновики?',
              'Несинхронизированные ответы будут удалены с этого устройства.',
              [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => void clear() },
              ],
            )
          }
        />
      </Card>
      {message && <Txt>{message}</Txt>}
      <Button title='Выйти из аккаунта' secondary busy={busy} onPress={() => void exit()} />
      <Txt muted size={12}>
        Lernium {APP_VERSION} · {new URL(API_ORIGIN).hostname}
      </Txt>
    </Page>
  );
}
