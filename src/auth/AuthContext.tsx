import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
  type AuthPayload,
  type AuthResponse,
  type AuthUser,
} from "@/auth/auth-context";
import { apiFetch, getAuthToken, setAuthToken } from "@/shared/api";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? "Ошибка авторизации";
  } catch {
    return "Ошибка авторизации";
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (!response.ok) {
          throw new Error("Сессия недействительна");
        }

        const nextUser = (await response.json()) as AuthUser;
        setUser(nextUser);
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function authenticate(path: string, payload: AuthPayload): Promise<void> {
    const response = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = (await response.json()) as AuthResponse;
    setAuthToken(data.access_token);
    setUser(data.user);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login: (payload) => authenticate("/auth/login", payload),
    register: (payload) => authenticate("/auth/register", payload),
    logout: () => {
      setAuthToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
