import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/shared/api";
import { setDraftOwner } from "@/shared/drafts";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { useLocale } from "@/i18n/useLocale";
import { useRoleNames } from "./useRoleNames";
import { PersonForm } from "./GroupsPage";
import AssignmentRules, { type RuleOverrides } from "./AssignmentRules";
import type { TeamSettings } from "./types";
const { user } = vi.hoisted(() => ({ user: { id: 861, organization_id: 40 } }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(user.id);
  vi.mocked(api.get).mockResolvedValue({
    data: { items: [], role: "member", can_manage_admins: false },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(null);
});
it("applies custom localized role labels without changing role identifiers and replaces them on tenant switch", async () => {
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data: path.endsWith("40")
      ? {
          profile: "education",
          role_labels: { author_ru: "Наставник", author_en: "Mentor" },
        }
      : { profile: "training_center", role_labels: {} },
  }));
  function View() {
    const roleName = useRoleNames(),
      { setLocale } = useLocale();
    return (
      <>
        <span>{roleName("author")}</span>
        <span>{roleName("member")}</span>
        <button onClick={() => setLocale("en")}>English</button>
      </>
    );
  }
  const view = render(
    <LocaleProvider>
      <View />
    </LocaleProvider>,
  );
  expect(await screen.findByText("Наставник")).toBeInTheDocument();
  expect(screen.getByText("Студент")).toBeInTheDocument();
  fireEvent.click(screen.getByText("English"));
  expect(screen.getByText("Mentor")).toBeInTheDocument();
  expect(screen.getByText("Student")).toBeInTheDocument();
  user.organization_id = 41;
  view.rerender(
    <LocaleProvider>
      <View />
    </LocaleProvider>,
  );
  expect(await screen.findByText("Instructor")).toBeInTheDocument();
  expect(screen.queryByText("Mentor")).not.toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
  user.organization_id = 40;
});
it("edits employee attributes without serializing UI row metadata or discarding existing values", async () => {
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  render(
    <PersonForm
      member={{
        id: 12,
        email: "member@example.test",
        full_name: "Member",
        organization_role: "member",
        is_active: true,
      }}
      person={{
        user_id: 12,
        position: "Engineer",
        department_id: null,
        external_id: "HR-12",
        attributes: { Qualification: "Senior" },
      }}
      departments={[]}
      groups={[]}
      canManage
      reload={async () => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Значение"), {
    target: { value: "Lead" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Добавить поле" }));
  fireEvent.change(screen.getAllByLabelText("Название поля")[1], {
    target: { value: "Site" },
  });
  fireEvent.change(screen.getAllByLabelText("Значение")[1], {
    target: { value: "North" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить карточку" }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/team/people/12", {
      position: "Engineer",
      department_id: null,
      external_id: "HR-12",
      attributes: { Qualification: "Lead", Site: "North" },
    }),
  );
});
it("requires explicit removal of overrides that the organization no longer permits", async () => {
  const settings = {
    revision: 3,
    rules: {
      max_attempts: 3,
      pass_percent: 60,
      assignment_overrides: ["max_attempts"],
    },
  } as TeamSettings;
  let current: RuleOverrides = {};
  function Form() {
    const [value, setValue] = useState<RuleOverrides>({
      max_attempts: 4,
      pass_percent: 80,
    });
    current = value;
    return (
      <AssignmentRules
        settings={settings}
        value={value}
        disabled={false}
        onChange={setValue}
      />
    );
  }
  render(<Form />);
  expect(
    screen.getByText(/Организация больше не разрешает/),
  ).toBeInTheDocument();
  expect(current).toEqual({ max_attempts: 4, pass_percent: 80 });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Убрать недоступные исключения",
      hidden: true,
    }),
  );
  expect(current).toEqual({ max_attempts: 4 });
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Число попыток", hidden: true }),
    { target: { value: "5" } },
  );
  expect(current).toEqual({ max_attempts: 5 });
  await act(async () => {});
});
