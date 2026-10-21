import {type ReactNode} from 'react';
import {describeError} from '@/shared/errors';
import './requestState.css';

export function RequestError({error, onRetry, retrying=false, fullPage=false}: {
  error: unknown; onRetry?: () => void; retrying?: boolean; fullPage?: boolean;
}) {
  const info = describeError(error);
  const Heading = fullPage ? 'h1' : 'h2';
  return <section className={`request-state ${fullPage ? 'request-state--page' : ''}`} role="alert">
    <span className="request-state__code">{info.code}</span>
    <Heading>{info.title}</Heading><p>{info.message}</p>
    <div className="request-state__actions">
      {onRetry && info.retryable && <button type="button" disabled={retrying} onClick={onRetry}>{retrying ? 'Пробуем снова…' : 'Повторить загрузку'}</button>}
      <a href="/dashboard">В рабочее пространство</a><a href="/legal/contacts/">Помощь</a>
    </div>
  </section>;
}

export function LoadingState({children='Загружаем данные…'}:{children?:ReactNode}) {
  return <p className="request-loading" role="status">{children}</p>;
}

export function StatusScreen({code,title,children,actions}:{code:string;title:string;children:ReactNode;actions:ReactNode}){
  return <main className="status-screen"><header><a className="status-screen__brand" href="/dashboard">ЛЕРНИУМ</a><a href="/legal/contacts/">Помощь</a></header>
    <section className="request-state request-state--page" role="alert"><span className="request-state__code">{code}</span><h1>{title}</h1><div className="status-screen__description">{children}</div><div className="request-state__actions">{actions}</div></section>
  </main>;
}
