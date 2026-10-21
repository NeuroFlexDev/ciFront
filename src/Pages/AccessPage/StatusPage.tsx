import { Link } from 'react-router-dom';
import styles from '../AccountPage/styles.module.css';
export default function StatusPage({title='Эта страница не найдена',code='404',description='Возможно, адрес изменился или в ссылке есть опечатка.'}:{title?:string;code?:string;description?:string}) {
  return <main className={styles.page}><header className={styles.header}><a href="/" className={styles.brand}>ЛЕРНИУМ</a><a href="/legal/contacts/">Помощь</a></header><section className={styles.container} style={{maxWidth:720,paddingTop:'8vh'}}><div style={{fontSize:'clamp(64px,12vw,150px)',color:'#caf432',fontWeight:750,lineHeight:1}}>{code}</div><h1 style={{marginTop:35}}>{title}</h1><p>{description}</p><div style={{display:'flex',gap:24,marginTop:30}}><Link to="/courses">Мои курсы ↗</Link><Link to="/auth">Войти</Link></div><footer className={styles.footer}><a href="/legal/">Документы</a><a href="/legal/privacy/">Персональные данные</a></footer></section></main>;
}
