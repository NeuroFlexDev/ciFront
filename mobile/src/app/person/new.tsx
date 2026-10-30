import { useState } from 'react';
import { router } from 'expo-router';
import { api, useSession, queryClient } from '../../lib/session';
import { Page, Card, Field, Chips, Button, ErrorState, Txt } from '../../ui/components';
import { roles } from '../../lib/types';
export default function NewPerson() {
  const { user, scope } = useSession(),
    [name, setName] = useState(''),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [role, setRole] = useState('member'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [created, setCreated] = useState(false);
  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api.request('/business/employees', 'POST', {
        full_name: name.trim(),
        username: username.trim(),
        password,
        role,
      });
      setPassword('');
      setCreated(true);
      await queryClient.invalidateQueries({ queryKey: [scope] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={created ? 'Участник создан' : 'Новый участник'} back>
      {created ? (
        <Card>
          <Txt>
            {name} · {username}
          </Txt>
          <Txt muted>
            Передайте участнику заданный пароль безопасным способом. Он сможет войти в приложение
            или веб-платформу с этим логином.
          </Txt>
          <Button title='Вернуться к команде' onPress={() => router.replace('/team')} />
        </Card>
      ) : (
        <Card>
          <Field label='Имя и фамилия' value={name} onChangeText={setName} maxLength={160} />
          <Chips
            items={[
              'member',
              'candidate',
              ...(user?.organization_role === 'owner' ? ['manager'] : []),
            ].map((id) => ({ id, label: roles[id] }))}
            value={role}
            onChange={setRole}
          />
          <Field
            label='Логин (латиница)'
            value={username}
            onChangeText={setUsername}
            autoCapitalize='none'
            autoCorrect={false}
          />
          <Field
            label='Начальный пароль (от 12 символов)'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete='new-password'
          />
          {!!error && <ErrorState error={error} />}
          <Button
            title='Создать'
            busy={busy}
            disabled={!name.trim() || username.length < 3 || password.length < 12}
            onPress={() => void create()}
          />
        </Card>
      )}
    </Page>
  );
}
