import { useLocale } from "@/i18n/useLocale";
import ImageLibrary from "./ImageLibrary";
export default function ImageEditor({
  courseId,
  onInsert,
}: {
  courseId?: number | string;
  onInsert?: (markdown: string) => void;
}) {
  const { t } = useLocale();
  if (!courseId)
    return (
      <p>
        {t(
          "Сначала выберите курс, чтобы сохранять и проверять его иллюстрации.",
        )}
      </p>
    );
  return <ImageLibrary courseId={courseId} onInsert={onInsert} />;
}
