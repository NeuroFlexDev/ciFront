import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Platform, View } from 'react-native';
import { api, useSession, useResource } from '../../lib/session';
import { roles } from '../../lib/types';
import { drafts } from '../../lib/drafts';
import {
  Page,
  Card,
  Txt,
  Field,
  Button,
  ErrorState,
  Avatar,
  Badge,
  Chips,
} from '../../ui/components';
import { c } from '../../ui/theme';
import { APP_VERSION, API_ORIGIN } from '../../lib/config';

export default function Profile() {
  const { user, logout, scope, revalidate } = useSession();
  const [name, setName] = useState(user?.full_name || ''),
    [editing, setEditing] = useState(false),
    [tab, setTab] = useState('main');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState('');
  const team = useResource<{ organization: { id: number; name: string } | null }>(
    user?.organization_id ? '/team' : null,
  );
  async function save() {
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await api.request('/me', 'PATCH', { full_name: name.trim() });
      await revalidate();
      setEditing(false);
      setMessage('Имя сохранено.');
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
    <Page title='Личный профиль' subtitle='Управляйте своими данными и настройками'>
      <Chips
        items={[
          { id: 'main', label: 'Основные настройки' },
          { id: 'security', label: 'Безопасность' },
          { id: 'notifications', label: 'Уведомления' },
        ]}
        value={tab}
        onChange={(value) =>
          value === 'notifications' ? router.push('/notification-settings') : setTab(value)
        }
      />
      {!!error && <ErrorState error={error} />}
      {!!message && (
        <Txt style={{ color: c.lime }} size={14}>
          {message}
        </Txt>
      )}
      {tab === 'main' ? (
        <>
          <Card>
            <Avatar name={user?.full_name || user?.username || ''} size={157} />
            <View style={{ gap: 6 }}>
              <Txt heading size={20}>
                {user?.full_name || user?.username || 'Ваш аккаунт'}
              </Txt>
              <Txt size={14}>{user?.email || user?.username}</Txt>
            </View>
            {team.data?.organization?.id === user?.organization_id && (
              <Txt size={14}>{team.data?.organization?.name}</Txt>
            )}
            <Badge tone='accent'>{roles[user?.organization_role || 'member']}</Badge>
            <View style={{ gap: 12, paddingTop: 8 }}>
              <Txt size={16}>Данные организации</Txt>
              <View style={{ gap: 4 }}>
                <Txt muted size={12}>
                  Организация
                </Txt>
                <Txt size={14}>
                  {team.data?.organization?.name ||
                    (!user?.organization_id
                      ? 'Личный аккаунт'
                      : team.isPending
                        ? 'Загружаем…'
                        : 'Не удалось загрузить')}
                </Txt>
              </View>
              <View style={{ gap: 4 }}>
                <Txt muted size={12}>
                  Роль
                </Txt>
                <Txt size={14}>{roles[user?.organization_role || 'member']}</Txt>
              </View>
            </View>
            {!!team.error && <ErrorState error={team.error} retry={() => void team.refetch()} />}
          </Card>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Txt size={16} style={{ flex: 1 }}>
                Личные данные
              </Txt>
              {!editing && (
                <Button
                  title='Редактировать'
                  compact
                  secondary
                  onPress={() => {
                    setName(user?.full_name || '');
                    setEditing(true);
                    setMessage('');
                  }}
                />
              )}
            </View>
            {editing ? (
              <>
                <Field
                  label='Имя и фамилия'
                  value={name}
                  onChangeText={setName}
                  maxLength={160}
                  autoComplete='name'
                />
                <Button
                  title='Сохранить'
                  busy={busy}
                  disabled={!name.trim()}
                  onPress={() => void save()}
                />
                <Button
                  title='Отмена'
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setEditing(false);
                    setName(user?.full_name || '');
                    setError(null);
                  }}
                />
              </>
            ) : (
              <View style={{ backgroundColor: c.bg, borderRadius: 20, padding: 20, gap: 4 }}>
                <Txt muted size={12}>
                  Имя и фамилия
                </Txt>
                <Txt size={16}>{user?.full_name || 'Не указано'}</Txt>
              </View>
            )}
            <View style={{ backgroundColor: c.bg, borderRadius: 20, padding: 20, gap: 4 }}>
              <Txt muted size={12}>
                Язык приложения
              </Txt>
              <Txt size={16}>Русский</Txt>
            </View>
            <Txt muted size={12}>
              Организацию и роль меняет руководитель. Данные аккаунта синхронизируются с
              веб-версией.
            </Txt>
          </Card>
          <Card>
            <Txt size={18}>Электронная почта</Txt>
            <Txt size={14}>{user?.email || 'Аккаунт использует вход по логину'}</Txt>
            <Txt muted size={13}>
              Изменение почты доступно в настройках веб-версии и требует подтверждения.
            </Txt>
          </Card>
          <Button
            title='Мои результаты'
            secondary
            onPress={() => router.push('/results?view=mine')}
          />
        </>
      ) : (
        <>
          <Card>
            <Txt heading size={20}>
              Защищённые черновики
            </Txt>
            <Txt muted size={14}>
              На телефоне ответы шифруются и доступны только вашему аккаунту. При истечении сеанса
              они сохраняются для следующего входа.
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
          <Card>
            <Txt heading size={20}>
              Сеанс на устройстве
            </Txt>
            <Txt muted size={14}>
              Выход завершит текущий сеанс. Сохранённые на сервере ответы и результаты останутся в
              аккаунте.
            </Txt>
            <Button title='Выйти из аккаунта' secondary busy={busy} onPress={() => void exit()} />
          </Card>
        </>
      )}
      <Txt muted size={12}>
        Lernium {APP_VERSION} · {new URL(API_ORIGIN).hostname}
      </Txt>
    </Page>
  );
}
