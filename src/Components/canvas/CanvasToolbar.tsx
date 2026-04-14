import { Link, Save, Search, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

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
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSearch(searchValue);
            }
          }}
          placeholder="Найти узел по названию"
        />
      </div>

      <div className={styles.toolbarControls}>
        <button type="button" className={styles.toolbarButton} onClick={onZoomOut}>
          <ZoomOut size={16} />
        </button>
        <button type="button" className={styles.toolbarButton} onClick={onZoomIn}>
          <ZoomIn size={16} />
        </button>
        <button type="button" className={styles.toolbarButtonWide} onClick={onFitView}>
          <Link size={16} />
          Fit view
        </button>
        <button type="button" className={styles.toolbarButtonWide} onClick={onSave} disabled={isSaving}>
          <Save size={16} />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className={styles.toolbarAi}>
        <div className={styles.toolbarAiHeader}>
          <Sparkles size={15} />
          AI-действия
        </div>
        <AIActionsMenu compact isLoading={isAiRunning} onSelect={onAiAction} />
      </div>

      <div className={styles.toolbarStatus}>
        {lastSavedAt ? `Сохранено ${new Date(lastSavedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Черновик'}
      </div>
    </header>
  );
}
