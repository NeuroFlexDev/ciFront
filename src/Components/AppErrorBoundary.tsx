import { Component, type ReactNode } from 'react';
import {downloadDrafts} from '@/shared/drafts';
import {StatusScreen} from './RequestState';
import './requestState.css';
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed) return <StatusScreen code="500" title="Ошибка интерфейса" actions={<><button onClick={()=>this.setState({failed:false})}>Повторить</button><button onClick={()=>window.location.reload()}>Обновить страницу</button><button onClick={downloadDrafts}>Скачать копию черновиков</button><a href="/dashboard">В рабочее пространство</a></>}><p>Не удалось показать страницу. Сохранённые материалы остаются на сервере. Если вы редактировали материал, скачайте копию локальных черновиков перед обновлением.</p></StatusScreen>;
    return this.props.children;
  }
}
