import { useLocale } from "@/i18n/useLocale";
import {
  Expand,
  Save,
  Search,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LanguageSwitch from "@/Components/LanguageSwitch";

import { AIActionsMenu } from "@/Components/ai/AIActionsMenu";
import styles from "@/Components/canvas/styles.module.css";
import type { CanvasAiActionType } from "@/types/canvas";
import type { CanvasAiDisabledReasons } from "@/utils/canvasAiAvailability";

type CanvasToolbarProps = {
  courseTitle: string;
  isSaving: boolean;
  isAiRunning: boolean;
  lastSavedAt: number | null;
  hasUnsavedChanges?: boolean;
  onSave: () => void;
  onSearch: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAiAction: (action: CanvasAiActionType) => void;
  aiDisabledReasons?: CanvasAiDisabledReasons;
};

export function CanvasToolbar({
  courseTitle,
  isSaving,
  isAiRunning,
  lastSavedAt,
  hasUnsavedChanges = false,
  onSave,
  onSearch,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAiAction,
  aiDisabledReasons,
}: CanvasToolbarProps) {
  const { t, locale } = useLocale();

  const [searchValue, setSearchValue] = useState("");
  const aiRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (aiRef.current && !aiRef.current.contains(event.target as Node))
        aiRef.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && aiRef.current?.open) {
        aiRef.current.open = false;
        aiRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

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
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch(searchValue);
            }
          }}
          placeholder={t("Найти узел по названию")}
          aria-label={t("Найти узел по названию")}
        />
        <button
          type="button"
          onClick={() => onSearch(searchValue)}
          aria-label={t("Найти узел")}
        >
          <Search size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.toolbarControls}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={onZoomOut}
          aria-label={t("Уменьшить масштаб")}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={onZoomIn}
          aria-label={t("Увеличить масштаб")}
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          className={styles.toolbarButtonWide}
          onClick={onFitView}
        >
          <Expand size={16} />
          {t("Показать всю схему")}
        </button>
        <button
          type="button"
          className={`${styles.toolbarButtonWide} ${styles.saveButton}`}
          onClick={onSave}
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? t("Сохранение...") : t("Сохранить")}
        </button>
      </div>

      <details ref={aiRef} className={styles.toolbarAi}>
        <summary className={styles.toolbarAiHeader}>
          <Sparkles size={15} />
          {t("AI-действия")}
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className={styles.toolbarAiPanel}>
          <AIActionsMenu
            compact
            isLoading={isAiRunning}
            disabledReasons={aiDisabledReasons}
            onSelect={(action) => {
              if (aiRef.current) aiRef.current.open = false;
              onAiAction(action);
            }}
          />
        </div>
      </details>

      <div className={styles.toolbarStatus}>
        <LanguageSwitch />
        <span role="status" data-unsaved={hasUnsavedChanges || undefined}>
          {isSaving
            ? t("Сохранение...")
            : hasUnsavedChanges
              ? t("Есть несохранённые изменения")
              : lastSavedAt
                ? t("Сохранено {v0}", {
                    v0: new Date(lastSavedAt).toLocaleTimeString(
                      locale === "en" ? "en-US" : "ru-RU",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    ),
                  })
                : t("Черновик")}
        </span>
      </div>
    </header>
  );
}
