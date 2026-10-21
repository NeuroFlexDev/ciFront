import {Link,NavLink,useNavigate} from 'react-router-dom';
import {useAuth} from '@/auth/useAuth';
import styles from './styles.module.css';
export default function Menu(){
 const {user,logout}=useAuth();const navigate=useNavigate();
 const links=[['/dashboard','Обзор'],['/courses','Мои курсы'],['/templates','Сценарии'],['/analytics','Аналитика'],...(user?.organization_id?[['/employees','Команда']]:[]),...(user?.is_admin?[['/admin','Админка']]:[])];
 return <header className={styles.menuContainer}><Link className={styles.brand} to="/dashboard">ЛЕРНИУМ</Link><nav className={styles.navigationContainer} aria-label="Разделы платформы">{links.map(([path,title])=><NavLink key={path} to={path} className={({isActive})=>`${styles.navText} ${isActive?styles.active:''}`}>{title}</NavLink>)}</nav><div className={styles.accountBlock}><Link className={styles.navButton} to="/express">Создать курс +</Link><Link className={styles.userInfo} to="/account"><span className={styles.userName}>{user?.full_name||user?.email||'Профиль'}</span><span className={styles.userRole}>{user?.is_admin?'Владелец платформы':user?.organization_role==='owner'?'Администратор организации':'Личный профиль'}</span></Link><button className={styles.logoutButton} aria-label="Выйти из аккаунта" onClick={()=>{logout();navigate('/auth',{replace:true});}}>↗</button></div></header>;
}
