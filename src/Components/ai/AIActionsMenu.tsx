import type { CanvasAiActionType } from "@/types/canvas";
import { useLocale } from "@/i18n/useLocale";
import { AI_ACTION_DEFINITIONS } from "@/utils/canvasAdapters";
import styles from "@/Components/canvas/styles.module.css";
import type { CanvasAiDisabledReasons } from "@/utils/canvasAiAvailability";

type AIActionsMenuProps = {
  onSelect: (action: CanvasAiActionType) => void;
  isLoading?: boolean;
  compact?: boolean;
  disabledReasons?: CanvasAiDisabledReasons;
};

export function AIActionsMenu({
  onSelect,
  isLoading = false,
  compact = false,
  disabledReasons = {},
}: AIActionsMenuProps) {
  const { t } = useLocale();
  const reasons = Object.values(disabledReasons);
  const commonReason =
    reasons.length === Object.keys(AI_ACTION_DEFINITIONS).length &&
    reasons.every((reason) => reason === reasons[0])
      ? reasons[0]
      : null;
  return (
    <div className={compact ? styles.aiActionsCompact : styles.aiActions}>
      {commonReason && (
        <p className={styles.aiUnavailableReason}>{t(commonReason)}</p>
      )}
      {(
        Object.entries(AI_ACTION_DEFINITIONS) as Array<
          [
            CanvasAiActionType,
            (typeof AI_ACTION_DEFINITIONS)[CanvasAiActionType],
          ]
        >
      ).map(([key, config]) => {
        const Icon = config.icon;

        return (
          <button
            key={key}
            type="button"
            className={styles.aiActionButton}
            onClick={() => onSelect(key)}
            disabled={isLoading || Boolean(disabledReasons[key])}
            title={disabledReasons[key] ? t(disabledReasons[key]) : undefined}
          >
            <Icon size={16} />
            <span className={styles.aiActionBody}>
              <span className={styles.aiActionTitle}>{t(config.label)}</span>
              <span className={styles.aiActionText}>
                {t(
                  (!commonReason && disabledReasons[key]) || config.description,
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
