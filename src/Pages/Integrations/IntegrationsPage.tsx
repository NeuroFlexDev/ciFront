import {useLocale} from '@/i18n/useLocale';
import { useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api, apiUrl } from '@/shared/api';
import { useDurableState } from '@/hooks/useDurableState';
import { Shell } from '@/Pages/Workspace/WorkspaceComponents';
import { dateText } from '@/Pages/Workspace/shared';
import { useResource } from './useResource';
import { Empty, Field, ResourceState, SecretResult } from './IntegrationComponents';
import FederationPanel from './FederationPanel';
import s from './integrations.module.css';
const scopes: Record<string, string> = { 'courses:read': 'Просмотр курсов', 'members:read': 'Просмотр сотрудников', 'assignments:read': 'Просмотр назначений', 'assignments:write': 'Назначение и отзыв обучения', 'results:read': 'Просмотр результатов' };
const events: Record<string, string> = { 'course.published': 'Курс опубликован', 'assignment.created': 'Обучение назначено', 'assignment.revoked': 'Назначение отозвано', 'submission.graded': 'Ответ оценён', 'invoice.paid': 'Счёт оплачен', 'member.revoked': 'Доступ сотрудника отозван' };
type Key = {
    id: number;
    name: string;
    prefix: string;
    scopes: string[];
    expires_at: string;
    revoked_at: string | null;
    last_used_at: string | null;
};
type Hook = {
    id: number;
    url: string;
    events: string[];
    enabled: boolean;
};
type Delivery = {
    id: string;
    kind: string;
    status: string;
    attempts: number;
    created_at: string;
    available_at: string;
    last_error: string | null;
};
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
function KeysPanel() {
    const { t } = useLocale();
    const resource = useResource<{
        items: Key[];
        scopes: string[];
    }>('/integrations/keys');
    const [draft, setDraft, clear] = useDurableState('integrations:key', { name: '', scopes: [] as string[], expires: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [secret, setSecret] = useState('');
    const [confirm, setConfirm] = useState<{
        id: number;
        rotate: boolean;
    } | null>(null);
    async function create(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try {
        const result = await api.post<{
            key: string;
        }>('/integrations/keys', { name: draft.name, scopes: draft.scopes, expires_at: new Date(draft.expires).toISOString() });
        setSecret(result.data.key);
        clear();
        setDraft({ name: '', scopes: [], expires: '' });
        resource.reload();
    }
    catch (e) {
        setError(e);
        resource.reload();
    }
    finally {
        setBusy(false);
    } }
    async function mutate() { if (!confirm)
        return; setBusy(true); setError(null); try {
        if (confirm.rotate) {
            const { data } = await api.post<{
                key: string;
            }>(`/integrations/keys/${confirm.id}/rotate`);
            setSecret(data.key);
        }
        else
            await api.delete(`/integrations/keys/${confirm.id}`);
        setConfirm(null);
        resource.reload();
    }
    catch (e) {
        setError(e);
        resource.reload();
    }
    finally {
        setBusy(false);
    } }
    return <><ResourceState {...resource}/>{!!error && <ResourceState error={error} loading={false} reload={resource.reload}/>}<p>{t("Ключ ограничен выбранными правами и вашей организацией.") + " "}<a href={apiUrl('/v1/openapi.json')} target="_blank" rel="noopener">{t("Спецификация API v1 ↗")}</a></p>{secret && <SecretResult label={t("Новый ключ API")} value={secret} onClose={() => setSecret('')}/>}
 {resource.data && (!resource.data.items.length ? <Empty>{t("Ключей пока нет. Создайте ключ для приложения, которому требуется доступ к данным организации.")}</Empty> : <div className={s.tableWrap}><table className={s.table}><thead><tr><th>{t("Приложение")}</th><th>{t("Права")}</th><th>{t("Срок и состояние")}</th><th>{t("Действия")}</th></tr></thead><tbody>{resource.data.items.map(key => <tr key={key.id}><td>{key.name}<small>{key.prefix}…</small><small>{key.last_used_at ? t("Использован {value0}", { value0: dateText(key.last_used_at) }) : t("Ещё не использован")}</small></td><td>{key.scopes.map(scope => <small key={scope}>{t(scopes[scope] || scope)}</small>)}</td><td>{key.revoked_at ? t("Отозван") : new Date(key.expires_at + 'Z') < new Date() ? t("Истёк") : t("Действует")}<small>{dateText(key.expires_at)}</small></td><td>{!key.revoked_at && <div className={s.row}><button className={s.secondary} disabled={busy || !!secret} onClick={() => setConfirm({ id: key.id, rotate: true })}>{t("Заменить ключ")}</button><button className={s.danger} disabled={busy} onClick={() => setConfirm({ id: key.id, rotate: false })}>{t("Отозвать")}</button></div>}</td></tr>)}</tbody></table></div>)}
 {confirm && <section className={s.notice}><p>{confirm.rotate ? t("Прежний ключ перестанет работать сразу. Сохраните новый и обновите подключённое приложение.") : t("Приложение потеряет доступ по этому ключу. История действий сохранится.")}</p><div className={s.row}><button disabled={busy} onClick={() => void mutate()}>{t("Подтвердить") + " "}{confirm.rotate ? t("замену") : t("отзыв")}</button><button className={s.secondary} disabled={busy} onClick={() => setConfirm(null)}>{t("Отмена")}</button></div></section>}
 <section className={s.panel}><h2>{t("Новый ключ приложения")}</h2><form className={s.form} onSubmit={create}><fieldset className={s.form} disabled={busy}><div className={s.fields}><Field label={t("Название приложения")} value={draft.name} minLength={2} maxLength={160} onChange={name => setDraft({ ...draft, name })}/><Field label={t("Действует до")} type="datetime-local" value={draft.expires} onChange={expires => setDraft({ ...draft, expires })}/></div><p>{t("Срок — до одного года. Выберите только необходимые права.")}</p><div className={s.checks}>{(resource.data?.scopes || Object.keys(scopes)).map(scope => <label className={s.check} key={scope}><input type="checkbox" checked={draft.scopes.includes(scope)} onChange={() => setDraft({ ...draft, scopes: toggle(draft.scopes, scope) })}/>{t(scopes[scope] || scope)}</label>)}</div><div><button disabled={busy || !draft.scopes.length || !!secret}>{busy ? t("Сохраняем…") : t("Создать ключ")}</button></div></fieldset></form></section></>;
}
function WebhooksPanel() {
    const { t } = useLocale();
    const resource = useResource<{
        items: Hook[];
        events: string[];
    }>('/integrations/webhooks');
    const [draft, setDraft, clear] = useDurableState('integrations:webhook', { url: '', events: [] as string[] });
    const [secret, setSecret] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [confirm, setConfirm] = useState<number | null>(null);
    async function create(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try {
        const { data } = await api.post<{
            secret: string;
        }>('/integrations/webhooks', draft);
        setSecret(data.secret);
        clear();
        setDraft({ url: '', events: [] });
        resource.reload();
    }
    catch (e) {
        setError(e);
        resource.reload();
    }
    finally {
        setBusy(false);
    } }
    async function disable() { setBusy(true); try {
        await api.delete(`/integrations/webhooks/${confirm}`);
        setConfirm(null);
        resource.reload();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy(false);
    } }
    return <><ResourceState {...resource}/>{!!error && <ResourceState error={error} loading={false} reload={resource.reload}/>}<p>{t("События доставляются с повторными попытками и подписью. Получатель должен проверять подпись и учитывать повторную доставку по ID события.")}</p>{secret && <SecretResult label={t("Секрет подписи webhook")} value={secret} onClose={() => setSecret('')}/>}
 {resource.data && (!resource.data.items.length ? <Empty>{t("Получатели событий ещё не подключены.")}</Empty> : <div className={s.grid}>{resource.data.items.map(hook => <section className={s.panel} key={hook.id}><h3>{new URL(hook.url).hostname}</h3><p style={{ overflowWrap: 'anywhere' }}>{hook.url}</p><p>{hook.events.map(event => t(events[event] || event)).join(' · ')}</p>{hook.enabled ? <button className={s.danger} disabled={busy} onClick={() => setConfirm(hook.id)}>{t("Отключить доставку")}</button> : <p>{t("Доставка отключена")}</p>}</section>)}</div>)}
 {confirm !== null && <section className={s.notice}><p>{t("Остановить доставку на этот адрес? Новые события перестанут поступать; история останется.")}</p><div className={s.row}><button disabled={busy} onClick={() => void disable()}>{t("Отключить")}</button><button className={s.secondary} onClick={() => setConfirm(null)}>{t("Отмена")}</button></div></section>}
 <section className={s.panel}><h2>{t("Подключить получателя")}</h2><form className={s.form} onSubmit={create}><fieldset className={s.form} disabled={busy}><Field label={t("HTTPS-адрес обработчика")} type="url" value={draft.url} onChange={url => setDraft({ ...draft, url })}/><div className={s.checks}>{(resource.data?.events || Object.keys(events)).map(event => <label className={s.check} key={event}><input type="checkbox" checked={draft.events.includes(event)} onChange={() => setDraft({ ...draft, events: toggle(draft.events, event) })}/>{t(events[event] || event)}</label>)}</div><div><button disabled={busy || !draft.events.length || !!secret}>{t("Подключить webhook")}</button></div></fieldset></form></section>
 <details className={s.details}><summary>{t("Проверка подлинности события")}</summary><p>{t("Заголовок X-Lernium-Signature содержит t=время,v1=подпись. Подпись: HMAC-SHA256 от строки времени, точки и исходного тела запроса. Проверяйте время (например, окно 5 минут), сравнивайте подпись за постоянное время и сохраняйте X-Lernium-Event-ID для защиты от повторов.")}</p></details></>;
}
function DeliveriesPanel() {
    const { t } = useLocale();
    const [offset, setOffset] = useState(0);
    const resource = useResource<{
        items: Delivery[];
        total: number;
    }>(`/integrations/deliveries?offset=${offset}&limit=25`);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState<unknown>(null);
    const status: Record<string, string> = { pending: t("В очереди"), sending: t("Доставляется"), delivered: t("Доставлено"), failed: t("Ошибка"), expired: t("Срок истёк"), cancelled: t("Отменено") };
    async function retry(id: string) { setBusy(id); setError(null); try {
        await api.post(`/integrations/deliveries/${id}/retry`);
        resource.reload();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy('');
    } }
    return <><ResourceState {...resource}/>{!!error && <ResourceState error={error} loading={false} reload={resource.reload}/>}<button className={s.secondary} disabled={resource.loading} onClick={resource.reload}>{t("Обновить доставки")}</button>{resource.data && (!resource.data.items.length ? <Empty>{t("Доставок ещё нет. Они появятся после события в подключённой интеграции.")}</Empty> : <><div className={s.tableWrap}><table className={s.table}><thead><tr><th>{t("Событие")}</th><th>{t("Состояние")}</th><th>{t("Попытки")}</th><th>{t("Дата")}</th><th>{t("Действие")}</th></tr></thead><tbody>{resource.data.items.map(row => <tr key={row.id}><td>{row.kind === 'webhook' ? 'Webhook' : t("Результат в LMS")}<small>{row.id}</small></td><td><span className={s.status} data-state={row.status}>{status[row.status] || row.status}</span>{row.last_error && <small>{row.last_error}</small>}</td><td>{row.attempts}</td><td>{dateText(row.created_at)}{row.status === 'pending' && <small>{t("Следующая:") + " "}{dateText(row.available_at)}</small>}</td><td>{row.status === 'failed' && <button disabled={!!busy} onClick={() => void retry(row.id)}>{busy === row.id ? t("Повторяем…") : t("Повторить доставку")}</button>}</td></tr>)}</tbody></table></div><div className={s.row}><button className={s.secondary} disabled={!offset || resource.loading} onClick={() => setOffset(offset - 25)}>{t("Назад")}</button><span>{offset + 1}–{Math.min(offset + 25, resource.data.total)}{" " + t("из") + " "}{resource.data.total}</span><button className={s.secondary} disabled={offset + 25 >= resource.data.total || resource.loading} onClick={() => setOffset(offset + 25)}>{t("Далее")}</button></div></>)}</>;
}
export default function IntegrationsPage() {
    const { t } = useLocale();
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'keys';
    const baseAllowed = !!user?.organization_id && ['owner','admin'].includes(user.organization_role||'');
    const permissions = useResource<{can_manage_team:boolean}>(user?.organization_id && !baseAllowed ? '/team/permissions' : null);
    const allowed = baseAllowed || !!permissions.data?.can_manage_team;
    return <Shell title={t("Интеграции")} description={t("Подключайте приложения, корпоративный вход и учебные системы.")}><div className={s.content}>{!baseAllowed && user?.organization_id && (permissions.loading || permissions.error) ? <ResourceState {...permissions}/> : !allowed ? <Empty><h2>{t("Управление подключениями")}</h2><p>{t("Настраивать интеграции может владелец или администратор организации. Попросите их подключить нужный сервис.")}</p><Link to="/account">{t("Открыть профиль")}</Link></Empty> : <><nav className={s.tabs} aria-label={t("Разделы интеграций")}>{[['keys', t("Ключи API")], ['webhooks', 'Webhooks'], ['deliveries', t("Доставки")], ['oidc', t("Корпоративный вход")], ['lti', t("Учебная система")]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setParams({ tab: id })}>{t(label)}</button>)}</nav><div key={tab} className={s.view}>{tab === 'webhooks' ? <WebhooksPanel /> : tab === 'deliveries' ? <DeliveriesPanel /> : tab === 'oidc' || tab === 'lti' ? <FederationPanel key={tab} kind={tab}/> : <KeysPanel />}</div></>}</div></Shell>;
}
