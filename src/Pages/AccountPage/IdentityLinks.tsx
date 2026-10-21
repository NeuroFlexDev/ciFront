import {useLocale} from '@/i18n/useLocale';
import { useState } from 'react';
import { api } from '@/shared/api';
import { useResource } from '@/Pages/Integrations/useResource';
import { ResourceState } from '@/Pages/Integrations/IntegrationComponents';
import styles from './styles.module.css';
export default function IdentityLinks() {
    const { t } = useLocale();
    const resource = useResource<{
        items: {
            id: number;
            name: string;
            linked: boolean;
            enabled: boolean;
        }[];
    }>('/me/identities');
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState<unknown>(null);
    async function link(id: number) { setBusy(id); setError(null); try {
        const { data } = await api.post<{
            url: string;
        }>(`/auth/oidc/${id}/link`);
        const url = new URL(data.url);
        if (url.protocol !== 'https:')
            throw new Error(t("Сервис вернул небезопасный адрес входа. Обратитесь к администратору."));
        window.location.assign(url.href);
    }
    catch (e) {
        setError(e);
        setBusy(null);
    } }
    return <section className={styles.card}><h2>{t("Корпоративный вход")}</h2><ResourceState {...resource}/>{!!error && <ResourceState error={error} loading={false} reload={resource.reload}/>}<p>{t("Свяжите аккаунт с сервисом вашей организации. Для подтверждения откроется его страница входа.")}</p>{resource.data && !resource.data.items.length && <p>{t("Владелец организации ещё не подключил корпоративный вход. Продолжайте использовать пароль.")}</p>}{resource.data?.items.map(provider => <div key={provider.id}><h3>{provider.name}</h3><p>{!provider.enabled ? t("Подключение отключено владельцем") : provider.linked ? t("Аккаунт связан. Корпоративный вход доступен.") : t("Аккаунт ещё не связан")}</p>{provider.enabled && !provider.linked && <button className={styles.secondary} disabled={busy !== null} onClick={() => void link(provider.id)}>{busy === provider.id ? t("Открываем сервис…") : t("Связать аккаунт")}</button>}</div>)}</section>;
}
