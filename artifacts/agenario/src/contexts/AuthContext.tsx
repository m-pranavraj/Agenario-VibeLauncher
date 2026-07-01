import { useEffect, useState, useCallback } from "react";
import { api, clearStoredToken, setStoredToken } from "@/lib/api";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import("@/lib/api").User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: pick up token from URL (Google OAuth redirect) then load current user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setStoredToken(urlToken);
      // Remove the token from the URL bar so it's not visible / bookmarked
      const clean = new URL(window.location.href);
      clean.searchParams.delete("token");
      window.history.replaceState({}, "", clean.toString());
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const u = await api.auth.login({ email, password });
    setUser(u);
  };

  const register = async (name: string, email: string, password: string, phone?: string, otp?: string) => {
    const u = await api.auth.register({ name, email, password, phone, otp });
    setUser(u);
  };

  const logout = async () => {
    await api.auth.logout();
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
