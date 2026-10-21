import { Link } from 'react-router-dom';
import {StatusScreen} from '@/Components/RequestState';
export default function StatusPage({title='Эта страница не найдена',code='404',description='Возможно, адрес изменился или в ссылке есть опечатка.'}:{title?:string;code?:string;description?:string}) {
  return <StatusScreen code={code} title={title} actions={<><Link className="status-screen__primary" to="/dashboard">В рабочее пространство ↗</Link><Link to="/auth">Войти</Link></>}><p>{description}</p></StatusScreen>;
}
