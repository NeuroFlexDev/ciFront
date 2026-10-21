import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminPage from "./AdminPage";
import { api } from "@/shared/api";
import { setDraftOwner } from "@/shared/drafts";

const identity = vi.hoisted(() => ({ is_admin: true }));
vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 90, is_admin: identity.is_admin } }),
}));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const organization = {
  id: 2,
  name: "Учебная компания",
  kind: "business",
  is_active: true,
  seat_limit: 10,
  reserved_seats: 4,
  courses: 3,
  course_limit: 20,
  source_limit: 12,
  generation_limit: 30,
};
const overview = {
  users: 17,
  organizations: 2,
  open_requests: 4,
  unassigned_courses: 1,
  metrics: {
    courses: 9,
    runs: 7,
    completed: 5,
    failed: 2,
    known_cost_usd: null,
  },
  daily: [
    { date: "2026-10-20", count: 2 },
    { date: "2026-10-21", count: 5 },
  ],
  courses: [],
  runs: [],
};
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(90);
  identity.is_admin = true;
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data:
      path === "/admin/overview"
        ? overview
        : path.startsWith("/admin/organizations")
          ? { items: [organization], total: 1 }
          : { items: [], total: 0 },
  }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  setDraftOwner(null);
  localStorage.clear();
});
const show = (tab = "overview") =>
  render(
    <MemoryRouter initialEntries={[`/admin?tab=${tab}`]}>
      <AdminPage />
    </MemoryRouter>,
  );

it("renders actual overview counts and chart values, and opens the unassigned archive from its action", async () => {
  show();
  const accounts = await screen.findByRole(
    "button",
    { name: "Аккаунты 17" },
    { timeout: 10000 },
  );
  expect(accounts).toBeEnabled();
  const chart = screen.getByRole("figure");
  expect(within(chart).getAllByRole("listitem")).toHaveLength(2);
  expect(within(chart).getByText("2")).toBeVisible();
  expect(within(chart).getByText("5")).toBeVisible();
  expect(screen.getByText("Нет данных")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Разобрать архив" }));
  expect(
    screen.getByRole("checkbox", { name: "Только без владельца" }),
  ).toBeChecked();
  await waitFor(
    () =>
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining(
          "/admin/courses?limit=50&offset=0&q=&unassigned=true",
        ),
      ),
    { timeout: 10000 },
  );
});

it("keeps the organization draft across keyboard tab changes and failed saves", async () => {
  show("organizations");
  await screen.findByRole(
    "heading",
    { name: "Учебная компания" },
    { timeout: 10000 },
  );
  fireEvent.click(screen.getByRole("button", { name: "Настроить лимиты" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Название" }), {
    target: { value: "Редактируемое название" },
  });
  fireEvent.keyDown(screen.getByRole("tab", { name: "Заказчики" }), {
    key: "ArrowRight",
  });
  expect(screen.getByRole("tab", { name: "Пользователи" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Пользователи" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("tab", { name: "Пользователи" }), {
    key: "ArrowLeft",
  });
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue(
    "Редактируемое название",
  );
  let reject!: (reason: Error) => void;
  vi.mocked(api.put).mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Сохранить заказчика" }));
  expect(screen.getByRole("textbox", { name: "Название" })).toBeDisabled();
  expect(screen.getByRole("tab", { name: "Пользователи" })).toBeDisabled();
  await act(async () => {
    reject(new Error("Сохранение недоступно"));
  });
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue(
    "Редактируемое название",
  );
  expect(screen.getByRole("textbox", { name: "Название" })).toBeEnabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Сохранение недоступно");
});

it("keeps customer limits and billing/profile actions bound to the correct organization", async () => {
  show("organizations");
  await screen.findByRole(
    "heading",
    { name: "Учебная компания" },
    { timeout: 10000 },
  );
  expect(
    screen.getByRole("link", { name: "Учебная компания · Функции и профиль" }),
  ).toHaveAttribute("href", "/admin/organizations/2/delivery");
  expect(screen.getByRole("link", { name: "Договор и счета" })).toHaveAttribute(
    "href",
    "/admin/organizations/2/billing",
  );
  expect(
    screen.getByRole("progressbar", { name: "Участники и приглашения:" }),
  ).toHaveAttribute("value", "4");
  expect(
    screen.getByRole("progressbar", { name: "Участники и приглашения:" }),
  ).toHaveAttribute("max", "10");
  fireEvent.click(screen.getByRole("button", { name: "Пригласить владельца" }));
  expect(screen.getByLabelText("Организация")).toHaveValue("2");
  expect(screen.getByLabelText("Роль")).toHaveValue("owner");
  expect(api.post).not.toHaveBeenCalled();
});

it("never loads administrator data for an organization member", async () => {
  identity.is_admin = false;
  await act(async () => {
    show();
  });
  expect(
    screen.getByRole("heading", { name: "Доступ заблокирован" }),
  ).toBeVisible();
  expect(api.get).not.toHaveBeenCalled();
});
