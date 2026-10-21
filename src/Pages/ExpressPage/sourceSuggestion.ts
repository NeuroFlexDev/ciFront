export type SuggestedField = "title" | "goal";
export type SourceSuggestion = { title: string; goal: string; method: "source_excerpt"; sources: { id: number; version: number; filename: string }[] };
export type SuggestibleDraft = {
  settings: { title: string; goal: string };
  edited_source_fields?: Partial<Record<SuggestedField, boolean>>;
  source_fill?: Partial<Record<SuggestedField, string>>;
};

/** Only untouched empty fields or our own unchanged suggestions may be replaced. */
export function applySourceSuggestion<T extends SuggestibleDraft>(draft: T, suggestion: SourceSuggestion): T {
  const next = { ...draft, settings: { ...draft.settings }, source_fill: { ...draft.source_fill } };
  for (const field of ["title", "goal"] as const) {
    const current = draft.settings[field];
    if (suggestion[field] && !draft.edited_source_fields?.[field] && (!current.trim() || current === draft.source_fill?.[field])) {
      next.settings[field] = suggestion[field];
      next.source_fill[field] = suggestion[field];
    }
  }
  return next;
}
