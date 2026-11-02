import { useState } from 'react';
import { Switch, View, Linking } from 'react-native';
import { api, useResource, queryClient, useSession } from '../lib/session';
import type { Preferences } from '../lib/types';
import { registerPush } from '../lib/push';
import { Page, Card, Txt, Field, Button, Loading, ErrorState } from '../ui/components';
import { c } from '../ui/theme';
const labels = {
  push_enabled: 'Push на устройствах',
  assignment_enabled: 'Новое обучение',
  deadline_enabled: 'Приближение срока',
  result_enabled: 'Результаты проверки',
  review_enabled: 'Ответы на проверку',
  generation_enabled: 'Готовность генерации',
  quiet_enabled: 'Тихие часы',
};
export default function Settings() {
  const query = useResource<Preferences>('/notifications/preferences'),
    { scope } = useSession(),
    [edited, setForm] = useState<Preferences | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState<unknown>(null);
  const form = edited || query.data || null;
  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await api.request('/notifications/preferences', 'PUT', form);
      await queryClient.invalidateQueries({ queryKey: [scope] });
      setMessage('Настройки сохранены на всех устройствах.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await registerPush(true);
      setMessage('Это устройство подключено к push.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title='Уведомления'
      back
      subtitle='Важное приходит вовремя. История в приложении сохраняется, даже если push выключены.'
    >
      {query.isPending && <Loading />}
      {(error || query.error) && (
        <ErrorState error={error || query.error} retry={() => void query.refetch()} />
      )}
      <Card>
        <Txt size={20}>На этом устройстве</Txt>
        <Txt muted size={14}>
          Разрешите уведомления, чтобы узнавать о назначениях и проверках без открытого приложения.
          Тексты ответов и названия компании на экране блокировки не показываются.
        </Txt>
        <Button title='Подключить push' busy={busy} onPress={() => void enable()} />
        <Button
          title='Настройки телефона'
          secondary
          onPress={() => void Linking.openSettings().catch(setError)}
        />
      </Card>
      {form && (
        <Card>
          {Object.entries(labels).map(([key, label]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Txt style={{ flex: 1 }}>{label}</Txt>
              <Switch
                accessibilityLabel={label}
                value={form[key as keyof Preferences] === true}
                onValueChange={(value) => setForm({ ...form, [key]: value })}
                trackColor={{ true: c.lime, false: c.inner }}
                thumbColor={c.text}
              />
            </View>
          ))}
          {form.quiet_enabled && (
            <>
              <Field
                label='Не беспокоить с (ЧЧ:ММ)'
                value={form.quiet_start}
                onChangeText={(quiet_start) => setForm({ ...form, quiet_start })}
              />
              <Field
                label='До (ЧЧ:ММ)'
                value={form.quiet_end}
                onChangeText={(quiet_end) => setForm({ ...form, quiet_end })}
              />
            </>
          )}
          <Field
            label='Часовой пояс'
            value={form.timezone}
            onChangeText={(timezone) => setForm({ ...form, timezone })}
            autoCapitalize='none'
          />
          <Txt muted size={12}>
            В тихие часы push откладываются до указанного времени. Прочитанные и уже неактуальные
            напоминания не отправляются.
          </Txt>
          <Button title='Сохранить' busy={busy} onPress={() => void save()} />
        </Card>
      )}
      {message && <Txt style={{ color: c.lime }}>{message}</Txt>}
    </Page>
  );
}
