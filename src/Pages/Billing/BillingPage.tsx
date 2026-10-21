import {useLocale} from '@/i18n/useLocale';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api } from '@/shared/api';
import { useDurableState } from '@/hooks/useDurableState';
import { Shell } from '@/Pages/Workspace/WorkspaceComponents';
import { dateText } from '@/Pages/Workspace/shared';
import { useResource } from '@/Pages/Integrations/useResource';
import { Empty, Field, ResourceState } from '@/Pages/Integrations/IntegrationComponents';
import { amountMinor, dateInput, endOfDay, money } from './billingUtils';
import s from '@/Pages/Integrations/integrations.module.css';
import b from './billing.module.css';
const termLabels = { ai_charging: 'Учёт AI и стоимость', renewal_terms: 'Продление', cancellation_terms: 'Отмена', refund_terms: 'Возврат', data_retention_terms: 'Хранение и выгрузка данных' };
const statuses: Record<string, string> = { pending: 'Ожидает согласования', active: 'Действует', expired: 'Срок доступа завершён', suspended: 'Приостановлен', cancelled: 'Отменён', issued: 'Ожидает оплаты', paid: 'Оплачен' };
type Account = {
    plan_name: string;
    contract_reference: string;
    currency: string;
    status: string;
    effective_status: string;
    access_until: string | null;
    retention_until: string | null;
    updated_at: string;
    terms: Record<keyof typeof termLabels, string>;
};
type Invoice = {
    id: string;
    number: string;
    amount_minor: number;
    currency: string;
    description: string;
    status: string;
    due_at: string;
    service_until: string;
    paid_at: string | null;
    payment_reference: string | null;
};
type Billing = {
    account: Account | null;
    invoices: {
        total: number;
        items: Invoice[];
    };
    quotas: {
        seat_limit: number;
        course_limit: number;
        source_limit: number;
        generation_limit: number;
    };
};
function TermsEditor({ organizationId, account, onSaved }: {
    organizationId: number;
    account: Account | null;
    onSaved: () => void;
}) {
    const { t } = useLocale();
    const initial = { plan_name: account?.plan_name || '', contract_reference: account?.contract_reference || '', currency: account?.currency || 'RUB', status: account?.status || 'pending', access_until: dateInput(account?.access_until), retention_until: dateInput(account?.retention_until), ai_charging: account?.terms.ai_charging || '', renewal_terms: account?.terms.renewal_terms || '', cancellation_terms: account?.terms.cancellation_terms || '', refund_terms: account?.terms.refund_terms || '', data_retention_terms: account?.terms.data_retention_terms || '', reason: '' };
    const [draft, setDraft, clear] = useDurableState(`billing:${organizationId}:terms`, initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [message, setMessage] = useState('');
    async function save(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); setMessage(''); try {
        await api.put(`/admin/organizations/${organizationId}/billing`, { ...draft, access_until: endOfDay(draft.access_until), retention_until: endOfDay(draft.retention_until) });
        clear(draft);
        setMessage(t("Условия сохранены. Изменение зарегистрировано в журнале."));
        onSaved();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy(false);
    } }
    return <details className={s.details}><summary>{account ? t("Изменить согласованные условия") : t("Зафиксировать индивидуальные условия")}</summary><p>{t("Заполняйте по согласованному договору. Активация доступа вручную должна иметь документированное основание; это не подтверждение платежа.")}</p>{!!error && <ResourceState error={error} loading={false} reload={onSaved}/>} {message && <p className={s.success} role="status">{message}</p>}<form className={s.form} onSubmit={save}><fieldset className={s.form} disabled={busy}><div className={s.fields}><Field label={t("Название условий")} minLength={2} maxLength={160} value={draft.plan_name} onChange={plan_name => setDraft({ ...draft, plan_name })}/><Field label={t("Договор / основание")} minLength={2} maxLength={200} value={draft.contract_reference} onChange={contract_reference => setDraft({ ...draft, contract_reference })}/><label>{t("Валюта")}<select value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>{['RUB', 'USD', 'EUR'].map(value => <option key={value}>{value}</option>)}</select></label><label>{t("Состояние")}<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>{['pending', 'active', 'suspended', 'cancelled'].map(value => <option key={value} value={value}>{t(statuses[value])}</option>)}</select></label><Field label={t("Доступ до (включительно, UTC)")} type="date" required={draft.status === 'active'} value={draft.access_until} onChange={access_until => setDraft({ ...draft, access_until })}/><Field label={t("Хранение до (включительно, UTC)")} type="date" required={false} value={draft.retention_until} onChange={retention_until => setDraft({ ...draft, retention_until })}/></div>{Object.entries(termLabels).map(([key, label]) => <label key={key}>{t(label)}<textarea required minLength={5} maxLength={2000} value={draft[key as keyof typeof termLabels]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>)}<label>{t("Основание изменения для журнала")}<textarea required minLength={5} maxLength={1000} value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })}/></label><div><button disabled={busy}>{busy ? t("Сохраняем…") : t("Сохранить условия")}</button></div></fieldset></form></details>;
}
function InvoiceEditor({ organizationId, currency, onSaved }: {
    organizationId: number;
    currency: string;
    onSaved: () => void;
}) {
    const { t } = useLocale();
    const initial = { number: '', amount: '', description: '', due: '', until: '' };
    const [draft, setDraft, clear] = useDurableState(`billing:${organizationId}:invoice`, initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    async function save(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try {
        await api.post(`/admin/organizations/${organizationId}/invoices`, { number: draft.number, amount_minor: amountMinor(draft.amount,t), description: draft.description, due_at: endOfDay(draft.due), service_until: endOfDay(draft.until) });
        clear();
        setDraft(initial);
        onSaved();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy(false);
    } }
    return <details className={s.details}><summary>{t("Выставить счёт")}</summary>{!!error && <ResourceState error={error} loading={false} reload={onSaved}/>}<form className={s.form} onSubmit={save}><fieldset className={s.form} disabled={busy}><div className={s.fields}><Field label={t("Уникальный номер счёта")} maxLength={100} value={draft.number} onChange={number => setDraft({ ...draft, number })}/><Field label={t("Сумма, {value0}", { value0: currency })} value={draft.amount} onChange={amount => setDraft({ ...draft, amount })}/><Field label={t("Оплатить до (UTC)")} type="date" value={draft.due} onChange={due => setDraft({ ...draft, due })}/><Field label={t("Оплачиваемый доступ до (UTC)")} type="date" value={draft.until} onChange={until => setDraft({ ...draft, until })}/></div><label>{t("Основание и состав услуги")}<textarea required minLength={5} maxLength={1000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><p>{t("Повтор с тем же номером и реквизитами вернёт существующий счёт. После создания сверьте его с договором.")}</p><div><button disabled={busy}>{t("Выставить счёт")}</button></div></fieldset></form></details>;
}
function ConfirmPayment({ invoice, onClose, onSaved }: {
    invoice: Invoice;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useLocale();
    const [draft, setDraft, clear] = useDurableState(`billing:payment:${invoice.id}`, { reference: '', reason: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    async function save(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try {
        await api.post(`/admin/invoices/${invoice.id}/confirm`, { payment_reference: draft.reference, reason: draft.reason });
        clear();
        onSaved();
        onClose();
    }
    catch (e) {
        setError(e);
    }
    finally {
        setBusy(false);
    } }
    return <section className={s.panel}><h2>{t("Подтвердить оплату счёта") + " "}{invoice.number}</h2><p>{money(invoice.amount_minor, invoice.currency)}{t(". Сверьте получателя, сумму и назначение с банковской выпиской. После подтверждения будет продлён доступ.")}</p>{!!error && <ResourceState error={error} loading={false} reload={onSaved}/>}<form className={s.form} onSubmit={save}><fieldset className={s.form} disabled={busy}><Field label={t("Уникальный идентификатор платежа из выписки")} minLength={5} maxLength={200} value={draft.reference} onChange={reference => setDraft({ ...draft, reference })}/><label>{t("Основание проверки")}<textarea required minLength={5} maxLength={1000} value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })}/></label><div className={s.row}><button disabled={busy}>{t("Подтвердить полученный платёж")}</button><button type="button" className={s.secondary} disabled={busy} onClick={onClose}>{t("Отмена")}</button></div></fieldset></form></section>;
}
function BillingContent({ organizationId }: {
    organizationId?: number;
}) {
    const { t } = useLocale();
    const [offset, setOffset] = useState(0);
    const resource = useResource<Billing>(`${organizationId ? `/admin/organizations/${organizationId}` : ''}/billing?offset=${offset}&limit=25`);
    const [selected, setSelected] = useState<Invoice | null>(null);
    const account = resource.data?.account;
    return <><ResourceState {...resource}/>{resource.data && <><section className={`${s.panel} ${b.contract}`}>{account ? <><div className={b.contractHeading}><h2>{account.plan_name}</h2><span className={s.status} data-state={account.effective_status}>{t(statuses[account.effective_status] || account.effective_status)}</span></div><p>{t("Основание:") + " "}{account.contract_reference}</p><p>{account.access_until ? t("Доступ до {value0}", { value0: dateText(account.access_until) }) : t("Срок доступа уточняется в договоре")}{account.retention_until ? t(" · Хранение до {value0}", { value0: dateText(account.retention_until) }) : ''}</p><dl>{Object.entries(termLabels).map(([key, label]) => <div style={{ display: 'contents' }} key={key}><dt>{t(label)}</dt><dd>{account.terms[key as keyof typeof termLabels]}</dd></div>)}</dl>{account.effective_status !== 'active' && <p className={s.notice}>{t("Доступ к новым действиям ограничен условиями договора. Существующие материалы и результаты доступны для просмотра и выгрузки. Для продления свяжитесь с оператором.")}</p>}</> : <><h2>{t("Ознакомительный доступ")}</h2><p>{t("Платный договор не подключён. Цена, сроки, AI и условия поддержки согласуются индивидуально; автоматических списаний нет.")}</p></>}<a href="/legal/contacts/#request">{t("Обсудить условия с оператором ↗")}</a>{organizationId && <TermsEditor key={account?.updated_at || 'new'} organizationId={organizationId} account={account || null} onSaved={resource.reload}/>}</section>
 <h2>{t("Лимиты организации")}</h2><div className={`${s.grid} ${b.quotas}`}>{([['seat_limit', t("Участники")], ['course_limit', t("Курсы")], ['source_limit', t("Источники")], ['generation_limit', t("Генерации")]] as const).map(([key, label]) => <div className={s.stat} key={key}><span>{t(label)}</span><strong>{resource.data!.quotas[key].toLocaleString('ru-RU')}</strong></div>)}</div><p>{t("Использование AI и лимиты задаются согласованной конфигурацией; счёт содержит итоговую сумму услуги.")}</p>
 <section className={`${s.panel} ${b.invoices}`}><h2>{t("Счета и платежи")}</h2>{!resource.data.invoices.items.length ? <Empty>{t("Счетов пока нет. Они появятся после согласования условий.")}</Empty> : <div className={s.tableWrap}><table className={s.table}><thead><tr><th>{t("Счёт")}</th><th>{t("Сумма")}</th><th>{t("Состояние")}</th><th>{t("Сроки")}</th><th>{t("Действие")}</th></tr></thead><tbody>{resource.data.invoices.items.map(invoice => <tr key={invoice.id}><td>{invoice.number}<small>{invoice.description}</small></td><td className={b.amount}>{money(invoice.amount_minor, invoice.currency)}</td><td><span className={s.status} data-state={invoice.status}>{t(statuses[invoice.status] || invoice.status)}</span>{invoice.paid_at && <small>{dateText(invoice.paid_at)}</small>}{invoice.payment_reference && <small>{t("Платёж:") + " "}{invoice.payment_reference}</small>}</td><td>{t("Оплата до") + " "}{dateText(invoice.due_at)}<small>{t("Услуга до") + " "}{dateText(invoice.service_until)}</small></td><td>{organizationId && invoice.status === 'issued' ? <button onClick={() => setSelected(invoice)}>{t("Подтвердить оплату")}</button> : invoice.status === 'issued' ? <a href="/legal/contacts/#request">{t("Реквизиты и помощь")}</a> : <span>{t("Подтверждено")}</span>}</td></tr>)}</tbody></table></div>}{resource.data.invoices.total > 25 && <div className={s.row}><button className={s.secondary} disabled={!offset || resource.loading} onClick={() => setOffset(offset - 25)}>{t("Назад")}</button><span>{offset + 1}–{Math.min(offset + 25, resource.data.invoices.total)}{" " + t("из") + " "}{resource.data.invoices.total}</span><button className={s.secondary} disabled={offset + 25 >= resource.data.invoices.total || resource.loading} onClick={() => setOffset(offset + 25)}>{t("Далее")}</button></div>}{organizationId && account && <InvoiceEditor organizationId={organizationId} currency={account.currency} onSaved={resource.reload}/>}</section>{selected && <ConfirmPayment key={selected.id} invoice={selected} onSaved={resource.reload} onClose={() => setSelected(null)}/>}</>}
 </>;
}
export default function BillingPage() {
    const { t } = useLocale();
    const { organizationId } = useParams();
    const { user } = useAuth();
    const id = organizationId ? Number(organizationId) : undefined;
    const allowed = id ? user?.is_admin : !!user?.organization_id && user.organization_role === 'owner';
    return <Shell title={id ? t("Условия организации №{value0}", { value0: id }) : t("Условия и оплата")} description={t("Договор, лимиты и подтверждённые платежи.")} action={<Link to={id ? '/admin' : '/dashboard'}>{t("Вернуться к") + " "}{id ? t("организациям") : t("обзору")} →</Link>}><div className={`${s.content} ${s.view} ${b.billing}`}>{!allowed || id !== undefined && (!Number.isInteger(id) || id <= 0) ? <Empty><h2>{t("Доступ к условиям")}</h2><p>{t("Просмотр и согласование оплаты доступны владельцу организации и оператору платформы.")}</p><Link to="/account">{t("Открыть профиль")}</Link></Empty> : <BillingContent key={id || 'own'} organizationId={id}/>}</div></Shell>;
}
