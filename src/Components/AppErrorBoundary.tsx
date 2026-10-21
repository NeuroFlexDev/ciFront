import { Component, type ReactNode } from 'react';
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed) return <main style={{minHeight:'100vh',background:'#0b0c0f',color:'#f5f6f1',padding:'12vh 8vw',fontFamily:'GolosText,sans-serif'}}><a href="/" style={{color:'#caf432',fontSize:28,fontWeight:800}}>ЛЕРНИУМ</a><p style={{color:'#caf432',fontSize:96,margin:'40px 0 15px'}}>500</p><h1>Не удалось открыть страницу</h1><p>Сохранённые на сервере материалы остаются в вашем аккаунте. Обновите страницу или обратитесь за помощью.</p><button onClick={()=>window.location.reload()} style={{padding:'15px 24px',borderRadius:30,border:0,background:'#caf432',color:'#10110b',fontWeight:700,cursor:'pointer'}}>Обновить страницу</button><a style={{display:'inline-block',marginLeft:24,color:'#caf432'}} href="/legal/contacts/">Помощь и контакты</a></main>;
    return this.props.children;
  }
}
