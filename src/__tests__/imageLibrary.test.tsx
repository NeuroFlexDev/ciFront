import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ImageLibrary from "@/Components/ElementUi/ImageEditor/ImageLibrary";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { useLocale } from "@/i18n/useLocale";
import { materialsEnglish } from "@/i18n/materials";
const mocked = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api", () => ({ api: mocked }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 42 } }) }));
vi.mock("@/Components/MarkdownContent", () => ({
  ProtectedImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
const caps = {
  image_max_bytes: 10 * 1024 * 1024,
  image_max_pixels: 20000000,
  image_generation_available: true,
  image_library_available: true,
};
beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  localStorage.clear();
});
afterEach(cleanup);
function SwitchLocale() {
  const { setLocale } = useLocale();
  return <button onClick={() => setLocale("ru")}>Switch language</button>;
}
describe("image author workflow", () => {
  it("localizes controls and statuses while preserving the image prompt and review comment", async () => {
    localStorage.setItem("lernium_locale", "en");
    const asset = {
      id: 7,
      course_id: 2,
      status: "pending_review",
      content_url: "/api/images/7/content",
      prompt: "Схема атома из курса",
      review_comment: "Исходный комментарий",
    };
    mocked.get.mockImplementation(async (path: string) => ({
      data: path.includes("capabilities")
        ? caps
        : { items: [asset], total: 1, limit: 12, offset: 0 },
    }));
    render(
      <LocaleProvider dictionaries={{ en: materialsEnglish }}>
        <SwitchLocale />
        <ImageLibrary courseId={2} />
      </LocaleProvider>,
    );
    expect(await screen.findByText("Awaiting review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByText("Схема атома из курса")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Review comment"), {
      target: { value: "Не переводить мой отзыв" },
    });
    fireEvent.click(screen.getByText("Switch language"));
    expect(
      screen.getByRole("button", { name: "Утвердить" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Комментарий к проверке")).toHaveValue(
      "Не переводить мой отзыв",
    );
    expect(screen.getByText("Схема атома из курса")).toBeInTheDocument();
    expect(mocked.post).not.toHaveBeenCalled();
  });
  it("requires review before inserting a protected uploaded asset", async () => {
    let assets: Record<string, unknown>[] = [];
    mocked.get.mockImplementation(async (path: string) => ({
      data: path.includes("capabilities")
        ? caps
        : { items: assets, total: assets.length, limit: 12, offset: 0 },
    }));
    mocked.post.mockImplementation(async (path: string) => {
      if (path.endsWith("/review"))
        assets = assets.map((asset) => ({ ...asset, status: "approved" }));
      else
        assets = [
          {
            id: 7,
            course_id: 2,
            status: "pending_review",
            content_url: "/api/images/7/content",
            width: 20,
            height: 10,
          },
        ];
      return { data: assets[0] };
    });
    const insert = vi.fn();
    render(<ImageLibrary courseId={2} onInsert={insert} />);
    await waitFor(() => expect(screen.getByText("Выбрать файл")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Загрузить изображение"), {
      target: {
        files: [new File(["png"], "lesson.png", { type: "image/png" })],
      },
    });
    await screen.findByText("Утвердить");
    expect(screen.queryByText("Добавить в урок")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Утвердить"));
    fireEvent.click(await screen.findByText("Добавить в урок"));
    expect(insert).toHaveBeenCalledWith(
      "![Иллюстрация к уроку](/api/images/7/content)",
    );
    expect(mocked.post.mock.calls[0][1]).toBeInstanceOf(FormData);
  });
  it("reuses the saved generation key after a lost response and reload", async () => {
    mocked.get.mockImplementation(async (path: string) => ({
      data: path.includes("capabilities")
        ? caps
        : path.startsWith("/images/")
          ? { id: 8, status: "queued" }
          : { items: [], total: 0, limit: 12, offset: 0 },
    }));
    mocked.post
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce({ data: { id: 8, status: "queued" } });
    const mounted = render(<ImageLibrary courseId={2} />);
    await waitFor(() => expect(screen.getByText("Выбрать файл")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Описание изображения"), {
      target: { value: "Учебная схема атома" },
    });
    fireEvent.click(screen.getByLabelText("Сгенерировать изображение"));
    await waitFor(() => expect(mocked.post).toHaveBeenCalledTimes(1));
    const request = mocked.post.mock.calls[0][1];
    mounted.unmount();
    render(<ImageLibrary courseId={2} />);
    await screen.findByLabelText("Проверить запуск генерации");
    fireEvent.click(screen.getByLabelText("Проверить запуск генерации"));
    await waitFor(() => expect(mocked.post).toHaveBeenCalledTimes(2));
    expect(mocked.post.mock.calls[1][1]).toEqual(request);
    expect(screen.getByLabelText("Описание изображения")).toHaveValue(
      "Учебная схема атома",
    );
  });
});
