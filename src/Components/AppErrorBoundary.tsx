import { Component, type ReactNode } from 'react';
import { downloadDrafts } from '@/shared/drafts';
import { StatusScreen } from './RequestState';
import './requestState.css';
import { useLocale } from '@/i18n/useLocale';
export function RecoveryScreen({
  retry,
  assetFailure = false,
}: {
  retry: () => void;
  assetFailure?: boolean;
}) {
  const { t } = useLocale();
  return (
    <StatusScreen
      code={assetFailure ? '↻' : '500'}
      title={t(assetFailure ? 'Не удалось загрузить страницу' : 'Ошибка интерфейса')}
      actions={
        <>
          {!assetFailure && <button onClick={retry}>{t('Повторить')}</button>}
          <button onClick={() => window.location.reload()}>{t('Обновить страницу')}</button>
          <button onClick={downloadDrafts}>{t('Скачать копию черновиков')}</button>
          <a href='/dashboard'>{t('В рабочее пространство')}</a>
        </>
      }
    >
      <p>
        {t(
          assetFailure
            ? 'Соединение прервалось или приложение обновилось. Проверьте интернет и обновите страницу. Материалы на сервере сохранятся. Перед обновлением можно скачать копию локальных черновиков.'
            : 'Не удалось показать страницу. Сохранённые материалы остаются на сервере. Если вы редактировали материал, скачайте копию локальных черновиков перед обновлением.',
        )}
      </p>
    </StatusScreen>
  );
}
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; assetFailure: boolean }
> {
  state = { failed: false, assetFailure: false };
  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return {
      failed: true,
      assetFailure:
        /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
          message,
        ),
    };
  }
  render() {
    if (this.state.failed)
      return (
        <RecoveryScreen
          assetFailure={this.state.assetFailure}
          retry={() => this.setState({ failed: false, assetFailure: false })}
        />
      );
    return this.props.children;
  }
}
