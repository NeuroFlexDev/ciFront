import {homePath} from '@/shared/surface';
import { Link } from 'react-router-dom';
import {StatusScreen} from '@/Components/RequestState';
import {useLocale} from '@/i18n/useLocale';
export default function StatusPage({title='Эта страница не найдена',code='404',description='Возможно, адрес изменился или в ссылке есть опечатка.'}:{title?:string;code?:string;description?:string}) {
  const {t}=useLocale();
  return <StatusScreen code={code} title={t(title)} actions={<><Link className="status-screen__primary" to={homePath}>{t('В рабочее пространство ↗')}</Link><Link to="/auth">{t('Войти')}</Link></>}><p>{t(description)}</p></StatusScreen>;
}
