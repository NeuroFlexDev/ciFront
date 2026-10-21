import {ApiError} from './errors';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
export const AUTH_TOKEN_KEY = "lernium_auth_token";
export const LEGACY_AUTH_TOKEN_KEY = "access_token";

type ApiResponse<T = unknown> = {
  data: T;
};

async function parseResponseData(response: Response): Promise<unknown> {
  if(response.status===204)return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try{return await response.json();}
    catch{throw new ApiError('Сервер прислал неполный ответ. Проверьте результат перед повторным сохранением.',response.ok?502:response.status,'invalid_response');}
  }

  return response.text();
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await apiFetch(path, init);
  const data = await parseResponseData(response);

  if (!response.ok) {
    const detail = typeof data === 'object' && data !== null && 'detail' in data
      ? (data as {detail: unknown}).detail : null;
    const message = response.status >= 500 ? 'Сервер не смог обработать запрос. Ваши несохранённые изменения не отправлены повторно. Попробуйте ещё раз.' : typeof detail === 'string' ? detail
      : typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string'
        ? detail.message
        : Array.isArray(detail) ? detail.map(item => `${item.loc?.slice(1).join('.') ?? ''}: ${item.msg ?? 'Некорректное значение'}`).join('; ')
          : response.status===403 ? 'У вашего аккаунта нет доступа к этому материалу. Обратитесь к администратору организации.'
            : response.status===404 ? 'Материал удалён или недоступен по этому адресу.'
              : response.status===401 ? 'Войдите снова, затем повторите действие.' : `Ошибка запроса (${response.status})`;

    throw new ApiError(message,response.status,'http',data);
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

  const controller=new AbortController();
  let timedOut=false;
  const abort=()=>controller.abort();
  if(init.signal?.aborted) controller.abort();
  init.signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();}, init.method && init.method!=='GET' ? 120000 : 30000);
  try {
    const response = await fetch(apiUrl(path), {...init,headers,signal:controller.signal});
    if(response.status<500) window.dispatchEvent(new Event('lernium-network-restored'));
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent('lernium-session-expired'));
    if (response.status === 403) {
      try {
        const body=await response.clone().json();
        if(['mfa_step_up_required','mfa_enrollment_required'].includes(body?.detail?.code))
          window.dispatchEvent(new CustomEvent('lernium-mfa-required',{detail:body.detail.code}));
      } catch { /* Ordinary non-JSON 403 keeps its original error handling. */ }
    }
    return response;
  } catch(error) {
    if(init.signal?.aborted) throw error;
    window.dispatchEvent(new Event('lernium-network-failed'));
    throw new ApiError(timedOut?'Сервер не ответил вовремя. Проверьте результат перед повторным сохранением.':'Нет связи с сервером. Проверьте подключение и повторите действие.',0,timedOut?'timeout':'network');
  } finally {
    clearTimeout(timer);init.signal?.removeEventListener('abort',abort);
  }
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
