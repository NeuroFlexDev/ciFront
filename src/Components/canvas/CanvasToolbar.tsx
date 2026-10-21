import { useLocale } from '@/i18n/useLocale';
import { Link, Save, Search, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import LanguageSwitch from '@/Components/LanguageSwitch';

import { AIActionsMenu } from '@/Components/ai/AIActionsMenu';
import styles from '@/Components/canvas/styles.module.css';
import type { CanvasAiActionType } from '@/types/canvas';

type CanvasToolbarProps = {
  courseTitle: string;
  isSaving: boolean;
  isAiRunning: boolean;
  lastSavedAt: number | null;
  onSave: () => void;
  onSearch: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAiAction: (action: CanvasAiActionType) => void;
};

export function CanvasToolbar({
  courseTitle,
  isSaving,
  isAiRunning,
  lastSavedAt,
  onSave,
  onSearch,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAiAction,
}: CanvasToolbarProps) {
  const { t, locale } = useLocale();

  const [searchValue, setSearchValue] = useState('');

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarIdentity}>
        <div className={styles.toolbarEyebrow}>Lernium Canvas</div>
        <h1 className={styles.toolbarTitle}>{courseTitle}</h1>
      </div>

      <div className={styles.toolbarSearch}>
        <Search size={16} />
        <input
          type='search'
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSearch(searchValue);
            }
          }}
          placeholder={t('Найти узел по названию')}
          aria-label={t('Найти узел по названию')}
        />
      </div>

      <div className={styles.toolbarControls}>
        <button
          type='button'
          className={styles.toolbarButton}
          onClick={onZoomOut}
          aria-label={t('Уменьшить масштаб')}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type='button'
          className={styles.toolbarButton}
          onClick={onZoomIn}
          aria-label={t('Увеличить масштаб')}
        >
          <ZoomIn size={16} />
        </button>
        <button type='button' className={styles.toolbarButtonWide} onClick={onFitView}>
          <Link size={16} />
          {t('Показать всю схему')}
        </button>
        <button
          type='button'
          className={styles.toolbarButtonWide}
          onClick={onSave}
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? t('Сохранение...') : t('Сохранить')}
        </button>
      </div>

      <div className={styles.toolbarAi}>
        <div className={styles.toolbarAiHeader}>
          <Sparkles size={15} />
          {t('AI-действия')}
        </div>
        <AIActionsMenu compact isLoading={isAiRunning} onSelect={onAiAction} />
      </div>

      <div className={styles.toolbarStatus}>
        <LanguageSwitch />
        {lastSavedAt
          ? t('Сохранено {v0}', {
              v0: new Date(lastSavedAt).toLocaleTimeString(locale === 'en' ? 'en-US' : 'ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : t('Черновик')}
      </div>
    </header>
  );
}
