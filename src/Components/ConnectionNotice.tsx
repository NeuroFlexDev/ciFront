import {useEffect,useState} from 'react';
import './requestState.css';
import {useLocale} from '@/i18n/useLocale';
export default function ConnectionNotice(){
  const {t}=useLocale();
  const [offline,setOffline]=useState(!navigator.onLine);
  useEffect(()=>{
    const off=()=>setOffline(true);const on=()=>setOffline(false);
    window.addEventListener('offline',off);window.addEventListener('online',on);
    window.addEventListener('lernium-network-failed',off);window.addEventListener('lernium-network-restored',on);
    return()=>{window.removeEventListener('offline',off);window.removeEventListener('online',on);window.removeEventListener('lernium-network-failed',off);window.removeEventListener('lernium-network-restored',on);};
  },[]);
  return offline?<aside className="connection-notice" role="status">{t('Нет связи с сервером. Не закрывайте вкладку, если черновик ещё не сохранён. После восстановления связи повторите сохранение.')}<button onClick={()=>window.dispatchEvent(new Event('lernium-retry-reads'))}>{t('Проверить соединение')}</button></aside>:null;
}
