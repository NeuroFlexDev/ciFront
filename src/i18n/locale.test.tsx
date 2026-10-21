import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "./LocaleContext";
import { useLocale } from "./useLocale";
import { getLocale, LOCALE_STORAGE_KEY, translate } from "./locale";
import { learningEnglish } from "./learning";
import { AnswerForm } from "../Pages/Learning/AssessmentAnswer";
import type { Assessment } from "../Pages/Learning/types";

vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 998 } }) }));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
const item: Assessment = {
  id: "task:locale",
  question: "Заголовок автора",
  description: "",
  question_type: "open",
  answers: [],
  max_points: 1,
  criteria: [],
  grading_mode: "manual",
};
function Switch() {
  const { locale, setLocale, t } = useLocale();
  return (
    <>
      <button onClick={() => setLocale(locale === "ru" ? "en" : "ru")}>
        Switch language
      </button>
      <h1>{t("Моё обучение")}</h1>
    </>
  );
}
beforeEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "ru";
});

describe("RU / EN learning interface", () => {
  it("switches interface language without altering or discarding the user answer", () => {
    render(
      <LocaleProvider>
        <Switch />
        <AnswerForm
          assignmentId={998}
          assessment={item}
          attempt={1}
          onSaved={async () => {}}
        />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Мой ответ: сохраните этот текст exactly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(
      screen.getByRole("heading", { name: "My learning" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save draft" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(
      "Мой ответ: сохраните этот текст exactly",
    );
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(
      screen.getByRole("button", { name: "Сохранить черновик" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(
      "Мой ответ: сохраните этот текст exactly",
    );
  });
  it("restores language preference and lets root add dictionaries without replacing learning text", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    function App() {
      const { t } = useLocale();
      return (
        <>
          <h1>{t("Моё обучение")}</h1>
          <p>{t("Общий раздел")}</p>
        </>
      );
    }
    render(
      <LocaleProvider
        dictionaries={{ en: { "Общий раздел": "Global section" } }}
      >
        <App />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("My learning");
    expect(screen.getByText("Global section")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });
  it("falls back to Russian text for unknown keys and ignores invalid preferences", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "<script>");
    expect(getLocale()).toBe("ru");
    expect(translate("en", "Неизвестная строка {name}", { name: "Иван" })).toBe(
      "Неизвестная строка Иван",
    );
    expect(translate("en", "Участник {v0}", { v0: "<img onerror=x>" })).toBe(
      "Member <img onerror=x>",
    );
  });
  it("keeps every dynamic placeholder in all English translations", () => {
    for (const [ru, en] of Object.entries(learningEnglish)) {
      const placeholders = (text: string) =>
        Array.from(new Set(text.match(/\{\w+\}/g) ?? [])).sort();
      expect(placeholders(en), ru).toEqual(placeholders(ru));
    }
  });
});
