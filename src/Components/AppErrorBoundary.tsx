import { Component, type ReactNode } from 'react';
import {downloadDrafts} from '@/shared/drafts';
import {StatusScreen} from './RequestState';
import './requestState.css';
import {useLocale} from '@/i18n/useLocale';
export function RecoveryScreen({retry}:{retry:()=>void}){
  const {t}=useLocale();
  return <StatusScreen code="500" title={t('Ошибка интерфейса')} actions={<><button onClick={retry}>{t('Повторить')}</button><button onClick={()=>window.location.reload()}>{t('Обновить страницу')}</button><button onClick={downloadDrafts}>{t('Скачать копию черновиков')}</button><a href="/dashboard">{t('В рабочее пространство')}</a></>}><p>{t('Не удалось показать страницу. Сохранённые материалы остаются на сервере. Если вы редактировали материал, скачайте копию локальных черновиков перед обновлением.')}</p></StatusScreen>;
}
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed) return <RecoveryScreen retry={()=>this.setState({failed:false})}/>;
    return this.props.children;
  }
}
