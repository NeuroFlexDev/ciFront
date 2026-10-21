import type { CanvasAiActionType } from '@/types/canvas';
import { useLocale } from '@/i18n/useLocale';
import { AI_ACTION_DEFINITIONS } from '@/utils/canvasAdapters';
import styles from '@/Components/canvas/styles.module.css';

type AIActionsMenuProps = {
  onSelect: (action: CanvasAiActionType) => void;
  isLoading?: boolean;
  compact?: boolean;
};

export function AIActionsMenu({
  onSelect,
  isLoading = false,
  compact = false,
}: AIActionsMenuProps) {
  const { t } = useLocale();
  return (
    <div className={compact ? styles.aiActionsCompact : styles.aiActions}>
      {(
        Object.entries(AI_ACTION_DEFINITIONS) as Array<
          [CanvasAiActionType, (typeof AI_ACTION_DEFINITIONS)[CanvasAiActionType]]
        >
      ).map(([key, config]) => {
        const Icon = config.icon;

        return (
          <button
            key={key}
            type='button'
            className={styles.aiActionButton}
            onClick={() => onSelect(key)}
            disabled={isLoading}
          >
            <Icon size={16} />
            <span className={styles.aiActionBody}>
              <span className={styles.aiActionTitle}>{t(config.label)}</span>
              <span className={styles.aiActionText}>{t(config.description)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
