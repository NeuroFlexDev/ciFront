import { useRef, useState, type FormEvent } from 'react';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { useDurableState } from '@/hooks/useDurableState';
import { useResource } from './useResource';
import { Empty, Field, ResourceState, SecretResult } from './IntegrationComponents';
import s from './integrations.module.css';
import { ManagementCapabilityNotice } from '../TeamLearning/ManagementCapability';
import { useManagementCapability } from '../TeamLearning/useManagementCapability';

const events: Record<string, string> = { 'course.published': 'Курс опубликован', 'assignment.created': 'Обучение назначено', 'assignment.revoked': 'Назначение отозвано', 'submission.graded': 'Ответ оценён', 'invoice.paid': 'Счёт оплачен', 'member.revoked': 'Доступ сотрудника отозван' };
type Hook = { id: number; url: string; events: string[]; enabled: boolean; state_token: string };
type HookEdit = { id: number; url: string; events: string[]; enabled: boolean; expected_state: string };
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];

export default function WebhooksPanel() {
  const { t } = useLocale();
  const capability = useManagementCapability();
  const resource = useResource<{ items: Hook[]; events: string[] }>('/integrations/webhooks');
  const [draft, setDraft, clear] = useDurableState('integrations:webhook', { url: '', events: [] as string[] });
  const [edit, setEdit] = useDurableState<HookEdit | null>('integrations:webhook-edit', null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [confirm, setConfirm] = useState<Hook | null>(null);
  const current = resource.data?.items.find(row => row.id === edit?.id);
  const conflict = !!edit && (!current || !edit.expected_state || edit.expected_state !== current.state_token);
  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await action(); }
    catch (reason) { setError(reason); }
    finally { resource.reload(); setBusy(false); inFlight.current = false; }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const result = await api.post<{ secret: string }>('/integrations/webhooks', draft);
      setSecret(result.data.secret); clear(draft); setDraft({ url: '', events: [] });
    });
  }
  const eventFields = (selected: string[], change: (next: string[]) => void) => <div className={s.checks}>
    {(resource.data?.events || Object.keys(events)).map(event => <label className={s.check} key={event}>
      <input type="checkbox" checked={selected.includes(event)} onChange={() => change(toggle(selected, event))} />{t(events[event] || event)}
    </label>)}</div>;
  return <>
    <ManagementCapabilityNotice capability={capability} />
    <ResourceState {...resource} />{!!error && <ResourceState error={error} loading={false} reload={resource.reload} />}
    <p>{t('События доставляются с повторными попытками и подписью. Получатель должен проверять подпись и учитывать повторную доставку по ID события.')}</p>
    {secret && <SecretResult label={t('Секрет подписи webhook')} value={secret} onClose={() => setSecret('')} />}
    {resource.data && (!resource.data.items.length ? <Empty>{t('Получатели событий ещё не подключены.')}</Empty> : <div className={s.grid}>
      {resource.data.items.map(hook => <section className={s.panel} key={hook.id}>
        <h3>{new URL(hook.url).hostname}</h3><p style={{ overflowWrap: 'anywhere' }}>{hook.url}</p>
        <p>{hook.events.map(event => t(events[event] || event)).join(' · ')}</p>
        <div className={s.row}><button className={s.secondary} disabled={!capability.supported || busy || !!edit} onClick={() => setEdit({ id: hook.id, url: hook.url, events: hook.events, enabled: hook.enabled, expected_state: hook.state_token })}>{t('Изменить подключение')}</button>
          {hook.enabled ? <button className={s.danger} disabled={!capability.supported || busy} onClick={() => setConfirm(hook)}>{t('Отключить доставку')}</button> : <p>{t('Доставка отключена')}</p>}
        </div>
      </section>)}
    </div>)}
    {edit && <section className={s.panel}><h2>{t('Изменить подключение')}</h2>
      <p>{t('Новый адрес и события действуют для новых доставок. Ранее поставленные в очередь события сохраняют исходный адрес и подпись. Секрет подписи не меняется.')}</p>
      <form className={s.form} onSubmit={event => { event.preventDefault(); if (!capability.supported || conflict) return; void perform(async () => {
        const { id, ...body } = edit; await api.put(`/integrations/webhooks/${id}`, body); setEdit(null);
      }); }}><fieldset className={s.form} disabled={busy}>
        {conflict && <div className={s.notice}><h3>{t('Сравните сохранённую запись')}</h3>
          <p>{current?.url || t('Запись недоступна в активном списке.')}</p>
          {current && <><p>{current.events.map(event => t(events[event] || event)).join(' · ')} · {t(current.enabled ? 'Доставка включена' : 'Доставка отключена')}</p>
            <button type="button" className={s.secondary} onClick={() => setEdit({ ...edit, expected_state: current.state_token })}>{t('Сохранить мои изменения поверх после сравнения')}</button></>}
          <p>{t('Ваш черновик сохранён. Подтвердите текущую версию перед записью изменений.')}</p>
        </div>}
        <Field label={t('Новый HTTPS-адрес обработчика')} type="url" value={edit.url} onChange={url => setEdit({ ...edit, url })} />
        {eventFields(edit.events, selected => setEdit({ ...edit, events: selected }))}
        <label className={s.check}><input type="checkbox" checked={edit.enabled} onChange={event => setEdit({ ...edit, enabled: event.target.checked })} />{t('Доставка включена')}</label>
        <div className={s.row}><button disabled={!capability.supported || conflict || !edit.events.length}>{t('Сохранить подключение')}</button>
          <button type="button" className={s.secondary} onClick={() => setEdit(null)}>{t('Отмена')}</button></div>
      </fieldset></form>
    </section>}
    {confirm && <section className={s.notice}><p>{t('Остановить доставку на этот адрес? Новые события перестанут поступать; история останется.')}</p>
      <div className={s.row}><button disabled={!capability.supported || busy} onClick={() => void perform(async () => {
        await api.delete(`/integrations/webhooks/${confirm.id}?expected_state=${encodeURIComponent(confirm.state_token)}`); setConfirm(null);
      })}>{t('Отключить')}</button><button className={s.secondary} disabled={busy} onClick={() => setConfirm(null)}>{t('Отмена')}</button></div>
    </section>}
    <section className={s.panel}><h2>{t('Подключить получателя')}</h2><form className={s.form} onSubmit={create}><fieldset className={s.form} disabled={busy}>
      <Field label={t('HTTPS-адрес обработчика')} type="url" value={draft.url} onChange={url => setDraft({ ...draft, url })} />
      {eventFields(draft.events, selected => setDraft({ ...draft, events: selected }))}
      <div><button disabled={!draft.events.length || !!secret}>{t('Подключить webhook')}</button></div>
    </fieldset></form></section>
    <details className={s.details}><summary>{t('Проверка подлинности события')}</summary>
      <p>{t('Заголовок X-Lernium-Signature содержит t=время,v1=подпись. Подпись: HMAC-SHA256 от строки времени, точки и исходного тела запроса. Проверяйте время (например, окно 5 минут), сравнивайте подпись за постоянное время и сохраняйте X-Lernium-Event-ID для защиты от повторов.')}</p>
    </details>
  </>;
}
