import type { CanvasAiActionType, LerniumNode } from "@/types/canvas";

export type CanvasAiDisabledReasons = Partial<
  Record<CanvasAiActionType, string>
>;

/** Mirrors the request's ten-node boundary and explains which fragment an action needs. */
export function canvasAiDisabledReasons(
  selectedNodes: LerniumNode[],
  unavailableReason: string | null,
  hasPendingProposal: boolean,
): CanvasAiDisabledReasons {
  const globalReason =
    unavailableReason ??
    (hasPendingProposal
      ? "Сначала примите или отклоните текущее предложение."
      : null) ??
    (selectedNodes.length > 10
      ? "Выберите не больше 10 узлов для одного AI-действия."
      : null) ??
    (!selectedNodes.length ? "Сначала выделите узлы на схеме" : null);
  if (globalReason)
    return Object.fromEntries(
      [
        "split_module",
        "generate_test",
        "extend_branch",
        "simplify_structure",
        "find_gaps",
      ].map((action) => [action, globalReason]),
    );
  const reasons: CanvasAiDisabledReasons = {};
  if (selectedNodes.length !== 1 || selectedNodes[0].data.nodeType !== "module")
    reasons.split_module = "Для разбиения выберите один модуль.";
  const content = selectedNodes.filter(
    (node) =>
      !["frame", "comment", "skill", "competency"].includes(node.data.nodeType),
  );
  if (!content.length) {
    reasons.generate_test =
      "Выберите учебный блок, по которому нужно составить тест.";
    reasons.extend_branch =
      "Выберите учебный блок, от которого продолжится ветка.";
  }
  if (selectedNodes.length < 2)
    reasons.simplify_structure =
      "Выберите не меньше двух узлов для упрощения связанной структуры.";
  if (
    selectedNodes.every((node) =>
      ["frame", "comment"].includes(node.data.nodeType),
    )
  )
    reasons.find_gaps =
      "Выберите учебные блоки, навыки или компетенции для анализа.";
  return reasons;
}
