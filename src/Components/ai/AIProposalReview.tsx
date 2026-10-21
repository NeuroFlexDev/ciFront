import { useLocale } from "@/i18n/useLocale";
import { Check, X, Sparkles } from "lucide-react";
import MarkdownContent from "@/Components/MarkdownContent";
import { useCanvasStore } from "@/store/canvasStore";
import styles from "./proposal.module.css";

export default function AIProposalReview() {
  const { t } = useLocale();
  const proposal = useCanvasStore((state) => state.aiProposal);
  const accept = useCanvasStore((state) => state.acceptAiProposal);
  const reject = useCanvasStore((state) => state.rejectAiProposal);
  if (!proposal) return null;
  return (
    <section className={styles.panel} aria-label={t("Проверка предложения AI")}>
      <header>
        <h2>
          <Sparkles size={19} /> {t("Предложение AI")}
        </h2>
        <span>
          {proposal.result.nodes.length} {t("новых узлов")}
        </span>
      </header>
      <p>{proposal.result.summary}</p>
      <p className={styles.hint}>
        {t(
          "Проверьте содержание и ссылки на источники. Принятие добавит узлы в рабочую схему; содержание уроков редактируется отдельно.",
        )}
      </p>
      <div className={styles.proposals}>
        {proposal.result.nodes.map((node) => (
          <article key={node.id}>
            <h3>{node.data.title}</h3>
            <MarkdownContent>{node.data.description || ""}</MarkdownContent>
          </article>
        ))}
      </div>
      <footer>
        <button onClick={accept}>
          <Check size={17} /> {t("Принять в канву")}
        </button>
        <button onClick={reject}>
          <X size={17} /> {t("Отклонить")}
        </button>
      </footer>
    </section>
  );
}
