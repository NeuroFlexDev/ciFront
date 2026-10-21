import {useEffect,useState} from 'react';
import {Link,NavLink,useNavigate} from 'react-router-dom';
import {useAuth} from '@/auth/useAuth';
import {api} from '@/shared/api';
import logo from '@/assets/icons/logo.svg';
import styles from './styles.module.css';
type Permissions={can_manage_team:boolean;can_author:boolean;can_review:boolean;can_report:boolean};
const roleLabels:Record<string,string>={owner:'Владелец организации',admin:'Администратор',author:'Автор',reviewer:'Проверяющий',manager:'Руководитель',member:'Участник'};
export default function Menu(){
 const {user,logout}=useAuth();const navigate=useNavigate();
 const [permissions,setPermissions]=useState<Permissions|null>(null);const [failed,setFailed]=useState(false);const [version,setVersion]=useState(0);
 useEffect(()=>{let active=true;api.get<Permissions>('/team/permissions').then(({data})=>{if(active){setPermissions(data);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[user?.id,version]);
 const author=permissions?.can_author??(!user?.organization_id);
 const links=[['/dashboard','Дашборд'],['/learning','Моё обучение'],...(author?[['/courses','Курсы'],['/express','Создать курс']]:[]),...(user?.organization_id?[['/employees','Сотрудники']]:[]),...(permissions?.can_report?[['/learning-analytics','Аналитика']]:author?[['/analytics','Аналитика']]:[])];
 const extra=[...(author?[['/templates','Сценарии'],['/ai-helper','ИИ-помощник']]:[]),...(permissions?.can_review?[['/reviews','Проверка работ']]:[]),...(permissions?.can_manage_team?[['/groups','Группы и подразделения'],['/assignments','Назначения'],['/programs','Программы'],['/team-settings','Настройки организации']]:[]),...(user?.organization_role==='owner'?[['/integrations','Интеграции'],['/billing','Договор и оплата']]:[]),...(user?.is_admin?[['/admin','Управление платформой']]:[])];
 return <header className={styles.menuContainer}><Link className={styles.brand} to="/dashboard"><img src={logo} alt="Лерниум"/></Link><nav className={styles.navigationContainer} aria-label="Разделы платформы">{links.map(([path,title])=><NavLink key={path} to={path} className={({isActive})=>`${styles.navText} ${isActive?styles.active:''}`}>{title}</NavLink>)}</nav><details className={styles.accountBlock}><summary><span className={styles.userInfo}><span className={styles.userName}>{user?.full_name||user?.email||'Профиль'}</span><span className={styles.userRole}>{user?.is_admin?'Оператор платформы':roleLabels[user?.organization_role??'']??'Личный профиль'}</span></span><span aria-hidden="true">⌄</span></summary><nav className={styles.dropdown} aria-label="Профиль и дополнительные разделы"><Link to="/account">Профиль и безопасность</Link>{extra.map(([path,title])=><NavLink key={path} to={path}>{title}</NavLink>)}{failed&&<button onClick={()=>{setFailed(false);setVersion(value=>value+1);}}>Повторить загрузку доступных разделов</button>}<button onClick={()=>{logout();navigate('/auth',{replace:true});}}>Выйти из аккаунта ↗</button></nav></details></header>;
}
