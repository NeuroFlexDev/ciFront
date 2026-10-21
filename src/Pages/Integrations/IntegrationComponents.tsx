import {useLocale} from '@/i18n/useLocale';
import { useState, type PropsWithChildren } from 'react';
import { LoadingState, RequestError } from '@/Components/RequestState';
import s from './integrations.module.css';
export function ResourceState({ loading, error, reload }: {
    loading: boolean;
    error: unknown;
    reload: () => void;
}) { return <>{!!error && <RequestError error={error} onRetry={reload} retrying={loading}/>} {loading && <LoadingState />}</>; }
export function Field({ label, value, onChange, type = 'text', required = true, minLength, maxLength = 2048, children }: PropsWithChildren<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
}>) { return <label>{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} minLength={minLength} maxLength={maxLength} autoComplete={type === 'password' ? 'new-password' : undefined}/>{children}</label>; }
export function SecretResult({ value, label, onClose }: {
    value: string;
    label: string;
    onClose: () => void;
}) {
    const { t } = useLocale();
    const [copied, setCopied] = useState(false);
    const [failed, setFailed] = useState(false);
    return <section className={s.secret} aria-label={label}><h2>{label}</h2><p>{t("Сохраните в менеджере секретов. Значение показывается один раз и не хранится в черновиках браузера.")}</p><textarea aria-label={label} readOnly value={value} rows={3} onFocus={e => e.target.select()}/><div className={s.row}><button type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true)).catch(() => setFailed(true))}>{copied ? t("Скопировано") : t("Скопировать")}</button><button type="button" className={s.secondary} onClick={onClose}>{t("Сохранил — закрыть")}</button></div>{failed && <p role="status">{t("Выделите значение и скопируйте вручную.")}</p>}</section>;
}
export function Empty({ children }: PropsWithChildren) { return <div className={s.empty}>{children}</div>; }
