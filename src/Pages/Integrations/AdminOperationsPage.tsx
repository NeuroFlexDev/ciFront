import {useLocale} from '@/i18n/useLocale';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api } from '@/shared/api';
import { Shell } from '@/Pages/Workspace/WorkspaceComponents';
import { dateText } from '@/Pages/Workspace/shared';
import { useResource } from './useResource';
import { Empty, Field, ResourceState } from './IntegrationComponents';
import s from './integrations.module.css';
import o from './operations.module.css';
type Operations = {
    checked_at: string;
    db: {
        status: string;
        latency_ms: number;
    };
    redis: {
        status: string;
        memory_bytes?: number;
        generation_queued?: number;
    };
    disk: {
        total_bytes: number;
        free_bytes: number;
        used_percent: number;
    };
    outbox: Record<string, number>;
    mail_configured: boolean;
    ai: {
        runs_started_last_day: number;
        calls_in_those_runs: number;
        failed_calls_in_those_runs: number;
        average_latency_ms: number | null;
        known_cost_usd: number | null;
    };
};
function Diagnostics() {
    const { t } = useLocale();
    const resource = useResource<Operations>('/admin/operations');
    const [payment, setPayment] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [message, setMessage] = useState('');
    async function reconcile(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); setMessage(''); try {
        await api.post(`/admin/payments/${encodeURIComponent(payment.trim())}/reconcile`);
        setMessage(t("Платёж проверен у провайдера и связан со счётом."));
        setPayment('');
        resource.reload();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy(false);
    } }
    const data = resource.data;
    return <><ResourceState {...resource}/><div className={o.toolbar}><button className={s.secondary} disabled={resource.loading} onClick={resource.reload}>{t("Обновить показатели")}</button>{data && <p>{t("Проверено") + " "}{dateText(data.checked_at)}</p>}</div>{data && <><div className={`${s.grid} ${o.metrics}`}><div className={`${s.stat} ${o.metric}`} data-state={data.db.status === "up" ? "good" : "error"}><span>{t("База данных")}</span><strong>{data.db.status === 'up' ? t("Доступна") : t("Недоступна")}</strong><p>{data.db.latency_ms}{" " + t("мс")}</p></div><div className={`${s.stat} ${o.metric}`} data-state={data.redis.status === "up" ? "good" : "error"}><span>{t("Очередь Redis")}</span><strong>{data.redis.status === 'up' ? t("Доступна") : t("Недоступна")}</strong><p>{t("Генераций в очереди:") + " "}{data.redis.generation_queued ?? t("нет связи")}</p></div><div className={`${s.stat} ${o.metric}`} data-state={data.disk.used_percent >= 90 ? "error" : data.disk.used_percent >= 80 ? "warning" : "good"}><span>{t("Диск занят")}</span><strong>{data.disk.used_percent}%</strong><p>{t("Свободно") + " "}{(data.disk.free_bytes / 1024 ** 3).toFixed(1)}{" " + t("ГБ")}</p></div><div className={`${s.stat} ${o.metric}`} data-state={data.mail_configured ? "good" : "warning"}><span>{t("Почтовые уведомления")}</span><strong>{data.mail_configured ? t("Настроены") : t("Не настроены")}</strong><p>{data.mail_configured ? t("SMTP и шифрование заданы. Фактические ошибки видны в очереди.") : t("Нужны SMTP_HOST, SMTP_FROM и ключ шифрования в конфигурации контура.")}</p></div></div>
 {(data.redis.status !== 'up' || data.disk.used_percent >= 90 || (data.outbox.failed || 0) > 0 || data.outbox.oldest_pending_seconds > 3600) && <section className={s.notice}><h2>{t("Требуется вмешательство")}</h2><p>{t("Проверьте очереди, доступность сервиса и свободное место. Повторно запускайте только завершившиеся с ошибкой доставки после устранения причины.")}</p></section>}
 <div className={o.breakdown}><section className={s.panel}><h2>{t("Доставка уведомлений и интеграций")}</h2><dl>{Object.entries({ pending: t("В очереди"), sending: t("Доставляется"), delivered: t("Доставлено"), failed: t("Ошибка"), expired: t("Истёк срок"), cancelled: t("Отменено") }).map(([key, label]) => <div style={{ display: 'contents' }} key={key}><dt>{t(label)}</dt><dd>{data.outbox[key] || 0}</dd></div>)}<dt>{t("Старейшее ожидающее событие")}</dt><dd>{Math.floor(data.outbox.oldest_pending_seconds / 60)}{" " + t("мин.")}</dd></dl></section>
 <section className={s.panel}><h2>{t("AI за последние сутки")}</h2><p>{t("Показатели относятся к запускам, начатым за последние 24 часа.")}</p><dl><dt>{t("Запуски")}</dt><dd>{data.ai.runs_started_last_day}</dd><dt>{t("Вызовы модели")}</dt><dd>{data.ai.calls_in_those_runs}</dd><dt>{t("Ошибки вызовов")}</dt><dd>{data.ai.failed_calls_in_those_runs}</dd><dt>{t("Средняя задержка")}</dt><dd>{data.ai.average_latency_ms === null ? t("Нет данных") : t("{value0} мс", { value0: Math.round(data.ai.average_latency_ms) })}</dd><dt>{t("Учтённая стоимость")}</dt><dd>{data.ai.known_cost_usd === null ? t("Нет данных") : `${data.ai.known_cost_usd.toFixed(4)} USD`}</dd></dl></section></div></>}
 <section className={`${s.panel} ${o.payment}`}><h2>{t("Проверить платёж у провайдера")}</h2><p>{t("Для подключённой ЮKassa. Проверка получает фактический статус, сумму и привязку к счёту напрямую у провайдера. Тестовый платёж не активирует договор.")}</p>{!!error && <ResourceState error={error} loading={false} reload={resource.reload}/>} {message && <p className={s.success} role="status">{message}</p>}<form className={s.form} onSubmit={reconcile}><fieldset className={s.form} disabled={busy}><Field label={t("ID платежа ЮKassa")} maxLength={64} value={payment} onChange={setPayment}/><div><button disabled={busy}>{busy ? t("Проверяем…") : t("Проверить и сверить со счётом")}</button></div></fieldset></form></section></>;
}
export default function AdminOperationsPage() { const { t } = useLocale(); const { user } = useAuth(); return <Shell title={t("Эксплуатация")} description={t("Доступность сервисов, очереди, место и использование AI.")} action={<Link to="/admin">{t("Админка →")}</Link>}><div className={`${s.content} ${s.view} ${o.operations}`}>{user?.is_admin ? <Diagnostics /> : <Empty><h2>{t("Доступ только оператору")}</h2><p>{t("Показатели инфраструктуры доступны администратору платформы.")}</p><Link to="/dashboard">{t("Открыть рабочее пространство")}</Link></Empty>}</div></Shell>; }
