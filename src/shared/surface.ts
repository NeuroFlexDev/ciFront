export const isAdminSurface = import.meta.env.VITE_APP_SURFACE === 'admin';
export const homePath = isAdminSurface ? '/admin' : '/dashboard';
export const adminAppUrl =
  import.meta.env.VITE_ADMIN_APP_URL ??
  (window.location.hostname === 'dev.platform.lernium.ru'
    ? 'https://admin.dev.platform.lernium.ru'
    : ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://localhost:5174'
      : 'https://admin.lernium.ru');
