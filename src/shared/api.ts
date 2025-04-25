import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/learn/api',
  withCredentials: false,      // true, если нужны cookie / auth
  timeout: 10000,
});
