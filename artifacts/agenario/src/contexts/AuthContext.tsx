import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import("@/lib/api").User | null>(null);
  const [loading, setLoading] = useState(true);

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
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
