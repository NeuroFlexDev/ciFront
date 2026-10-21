import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { LOCALE_STORAGE_KEY } from "@/i18n/locale";
import { materialsEnglish } from "@/i18n/materials";
import { adminEditorEnglish } from "@/i18n/adminEditor";
import { ApiError } from "@/shared/errors";
import ResourceUsagePanel from "@/Components/ResourceUsagePanel";
import OrganizationResourcePolicy from "@/Components/OrganizationResourcePolicy";
const mocked = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/shared/api", () => ({ api: mocked }));
vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 9, organization_id: 1 } }),
}));
const policy = {
  revision: "a".repeat(64),
  disk_bytes_limit: 1024 ** 3,
  used_disk_bytes: 0,
  image_monthly_limit: 50,
  chat_monthly_limit: 1000,
  resource_limits: {
    queued_limit: 8,
    background_limit: 2,
    interactive_limit: 4,
    monthly_tokens: 20000,
    monthly_ocr_pages: 30,
    monthly_rub: "10",
  },
};
function wrap(node: React.ReactNode) {
  return (
    <LocaleProvider
      dictionaries={{ en: { ...materialsEnglish, ...adminEditorEnglish } }}
    >
      {node}
    </LocaleProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  vi.resetAllMocks();
});
afterEach(cleanup);

it("shows actual organization usage and zero limits without inventing available budget", async () => {
  mocked.get.mockResolvedValue({
    data: {
      month: "2026-10-01",
      tokens_reserved_or_used: 200,
      tokens_limit: 0,
      ocr_pages_reserved_or_used: 3,
      ocr_pages_limit: 0,
      cost_rub_reserved_upper_bound: "2.5",
      cost_rub_limit: "10",
      used_disk_bytes: 1024 ** 3,
      disk_bytes_limit: 2 * 1024 ** 3,
      images_this_month: 1,
      image_monthly_limit: 50,
      interactive_requests_this_month: 4,
      chat_monthly_limit: 1000,
      background_running: 2,
      background_running_limit: 2,
      interactive_running: 0,
      interactive_running_limit: 4,
      queued: 3,
      queued_limit: 8,
    },
  });
  render(wrap(<ResourceUsagePanel />));
  expect(await screen.findByText("AI tokens")).toBeTruthy();
  expect(screen.getByText("200")).toBeTruthy();
  expect(screen.getByText("2.5")).toBeTruthy();
  expect(screen.queryByText("NaN")).toBeNull();
  expect(
    screen.getByText(/upper estimate, not a provider invoice/),
  ).toBeTruthy();
  expect(mocked.put).not.toHaveBeenCalled();
});

it("retains a quota draft across a lost response and does not retry a write on reconnect", async () => {
  mocked.get.mockResolvedValue({ data: policy });
  mocked.put.mockRejectedValue(new ApiError("Lost response", 0, "network"));
  const page = render(wrap(<OrganizationResourcePolicy organizationId="1" />));
  fireEvent.change(await screen.findByLabelText("Monthly AI budget, RUB"), {
    target: { value: "7.25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save quotas" }));
  await waitFor(() => expect(mocked.put).toHaveBeenCalledTimes(1));
  expect(mocked.put.mock.calls[0][1]).toMatchObject({
    expected_revision: policy.revision,
    resource_limits: { monthly_rub: "7.25" },
  });
  window.dispatchEvent(new Event("online"));
  await waitFor(() =>
    expect(mocked.get.mock.calls.length).toBeGreaterThanOrEqual(1),
  );
  expect(mocked.put).toHaveBeenCalledTimes(1);
  page.unmount();
  render(wrap(<OrganizationResourcePolicy organizationId="1" />));
  expect(
    (
      (await screen.findByLabelText(
        "Monthly AI budget, RUB",
      )) as HTMLInputElement
    ).value,
  ).toBe("7.25");
});

it("requires explicit comparison after another operator changes resource limits", async () => {
  mocked.get
    .mockResolvedValueOnce({ data: policy })
    .mockResolvedValue({
      data: {
        ...policy,
        revision: "b".repeat(64),
        resource_limits: { ...policy.resource_limits, monthly_rub: "20" },
      },
    });
  mocked.put.mockRejectedValue(new ApiError("Conflict", 409, "http"));
  render(wrap(<OrganizationResourcePolicy organizationId="1" />));
  fireEvent.change(await screen.findByLabelText("Monthly AI budget, RUB"), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save quotas" }));
  expect(
    await screen.findByText("Another operator changed these limits"),
  ).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Save quotas" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Monthly AI budget, RUB") as HTMLInputElement).value,
  ).toBe("7");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Apply my draft to the current version",
    }),
  );
  expect(mocked.put).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByRole("button", { name: "Save quotas" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

