import type { Session } from './types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class Client {
  session: Session | null = null;
  private refreshFlight: Promise<void> | null = null;
  private epoch = 0;
  private controller = new AbortController();
  private persistence: Promise<void> = Promise.resolve();
  constructor(
    private origin: string,
    private save: (session: Session | null) => Promise<void>,
    private expired: () => void,
    private transport: typeof fetch = fetch,
  ) {}
  private persist(session: Session | null) {
    const next = this.persistence.catch(() => {}).then(() => this.save(session));
    this.persistence = next;
    return next;
  }
  async replace(session: Session | null) {
    const epoch = ++this.epoch;
    this.controller.abort();
    this.controller = new AbortController();
    this.session = null;
    await this.persist(session);
    if (epoch === this.epoch) this.session = session;
  }
  private async decode(res: globalThis.Response) {
    const data = await res.json().catch(() => {
      throw new ApiError(
        502,
        'Сервер прислал неполный ответ. Проверьте результат перед повторной отправкой.',
      );
    });
    if (!res.ok) {
      const message =
        res.status >= 500
          ? 'Сервер временно недоступен. Попробуйте ещё раз.'
          : typeof data.detail === 'string'
            ? data.detail
            : (
                {
                  401: 'Сеанс истёк. Войдите снова.',
                  403: 'У вас нет доступа к этому действию.',
                  404: 'Материал недоступен или был удалён.',
                  409: 'Данные изменились на другом устройстве. Ваш ответ сохранён локально.',
                  429: 'Слишком много запросов. Попробуйте немного позже.',
                } as Record<number, string>
              )[res.status] ||
              (res.status >= 500
                ? 'Сервер временно недоступен. Попробуйте ещё раз.'
                : 'Проверьте заполнение полей.');
      throw new ApiError(res.status, message);
    }
    return data;
  }
  async public<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.transport(this.origin + '/api' + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    return this.decode(res);
  }
  private async refresh() {
    if (this.refreshFlight) return this.refreshFlight;
    const epoch = this.epoch,
      current = this.session;
    if (!current) throw new ApiError(401, 'Войдите в аккаунт');
    this.refreshFlight = (async () => {
      try {
        const session = await this.public<Session>('/auth/mobile/refresh', {
          refresh_token: current.refresh_token,
        });
        if (epoch !== this.epoch) throw new ApiError(401, 'Аккаунт изменён');
        await this.persist(session);
        if (epoch !== this.epoch) throw new ApiError(401, 'Аккаунт изменён');
        this.session = session;
      } catch (error) {
        // A lost response may already have consumed the rotating refresh token.
        // Never replay it: reauthenticate and retain the account-scoped answer drafts.
        if (epoch === this.epoch) {
          try {
            await this.replace(null);
          } finally {
            this.expired();
          }
        }
        throw error;
      }
    })().finally(() => {
      this.refreshFlight = null;
    });
    return this.refreshFlight;
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
    const epoch = this.epoch;
    const send = () =>
      this.transport(this.origin + '/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.session?.access_token,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(30000)]),
      });
    if (!this.session) throw new ApiError(401, 'Войдите в аккаунт');
    const sentToken = this.session.access_token;
    let res = await send();
    if (res.status === 401) {
      if (sentToken === this.session?.access_token) await this.refresh();
      if (epoch !== this.epoch) throw new ApiError(401, 'Сеанс завершён');
      res = await send();
    }
    if (epoch !== this.epoch) throw new ApiError(401, 'Аккаунт изменён');
    if (res.status === 401) {
      try {
        await this.replace(null);
      } finally {
        this.expired();
      }
      throw new ApiError(401, 'Сеанс истёк. Войдите снова.');
    }
    const data = await this.decode(res);
    if (epoch !== this.epoch) throw new ApiError(401, 'Аккаунт изменён');
    return data;
  }
}
export const errorText = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error && !['TypeError', 'AbortError', 'TimeoutError'].includes(error.name)
      ? error.message
      : 'Нет соединения. Проверьте интернет и повторите. Проверьте отметку сохранения под ответом.';
