const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
export const AUTH_TOKEN_KEY = "lernium_auth_token";
export const LEGACY_AUTH_TOKEN_KEY = "access_token";

type ApiResponse<T = unknown> = {
  data: T;
};

async function parseResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await apiFetch(path, init);
  const data = await parseResponseData(response);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;

    const error = new Error(message) as Error & { response?: { data: unknown; status: number } };
    error.response = { data, status: response.status };
    throw error;
  }

  return { data: data as T };
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem(AUTH_TOKEN_KEY) ??
    window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
  );
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
  });
}

export const api = {
  get<T = unknown>(path: string) {
    return request<T>(path, { method: "GET" });
  },
  post<T = unknown>(path: string, body?: BodyInit | object | null) {
    const payload =
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      typeof body === "string" ||
      body == null
        ? body
        : JSON.stringify(body);

    return request<T>(path, {
      method: "POST",
      body: payload ?? undefined,
    });
  },
  patch<T = unknown>(path: string, body?: BodyInit | object | null) {
    const payload =
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      typeof body === "string" ||
      body == null
        ? body
        : JSON.stringify(body);

    return request<T>(path, {
      method: "PATCH",
      body: payload ?? undefined,
    });
  },
  put<T = unknown>(path: string, body?: BodyInit | object | null) {
    const payload =
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      typeof body === "string" ||
      body == null
        ? body
        : JSON.stringify(body);

    return request<T>(path, {
      method: "PUT",
      body: payload ?? undefined,
    });
  },
  delete<T = unknown>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};
