import { homePath } from '@/shared/surface';
import { Link } from 'react-router-dom';
import { StatusScreen } from '@/Components/RequestState';
import { useLocale } from '@/i18n/useLocale';
export default function StatusPage({
  title,
  code = '404',
  description,
}: {
  title?: string;
  code?: string;
  description?: string;
}) {
  const { t } = useLocale();
  const defaultTitle =
    code === '403'
      ? 'Доступ заблокирован'
      : code === '500'
        ? 'Ошибка сервиса'
        : 'Эта страница не найдена';
  const defaultDescription =
    code === '403'
      ? 'У вашего аккаунта нет прав для этого действия. Вернитесь в рабочее пространство или обратитесь к администратору организации.'
      : code === '500'
        ? 'Сервис временно не смог обработать запрос. Попробуйте снова немного позже.'
        : 'Возможно, адрес изменился или в ссылке есть опечатка.';
  return (
    <StatusScreen
      code={code}
      title={t(title ?? defaultTitle)}
      actions={
        <>
          <Link className='status-screen__primary' to={homePath}>
            {t('В рабочее пространство ↗')}
          </Link>
          <Link to='/auth'>{t('Войти')}</Link>
        </>
      }
    >
      <p>{t(description ?? defaultDescription)}</p>
    </StatusScreen>
  );
}
