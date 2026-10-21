export class ApiError extends Error {
  response: {status:number;data:unknown};
  constructor(message: string, public status = 0, public code = 'network', public data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.response = {status,data};
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Не удалось связаться с сервером. Проверьте подключение и повторите действие.';
  return error instanceof Error ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

export function describeError(error: unknown) {
  const status = error instanceof ApiError ? error.status : 0;
  const titles: Record<number, string> = {
    401: 'Сессия истекла', 403: 'Доступ ограничен', 404: 'Материал не найден',
    409: 'Материал изменился', 413: 'Файл слишком большой', 429: 'Слишком много запросов',
    500: 'Сервер временно недоступен',
  };
  return {
    code: status >= 500 ? '500' : status ? String(status) : 'Связь',
    title: titles[status >= 500 ? 500 : status] ?? 'Не удалось выполнить действие',
    message: errorMessage(error),
    retryable: ![403, 404].includes(status),
  };
}
