import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  initAuth,
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  onAuthChange,
  authFetch,
  type NetlifyUser,
} from "~/lib/auth";

interface DbUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: NetlifyUser | null;
  dbUser: DbUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NetlifyUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbUser = useCallback(async () => {
    try {
      const response = await authFetch("/api/me");
      const data = await response.json();

      if (data.authenticated && data.user) {
        setDbUser(data.user);
      } else {
        setDbUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setDbUser(null);
    }
  }, []);

  useEffect(() => {
    initAuth();

    // Set initial user
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      fetchDbUser();
    }

    // Listen for auth changes
    const unsubscribe = onAuthChange(async (netlifyUser) => {
      setUser(netlifyUser);

      if (netlifyUser) {
        await fetchDbUser();
      } else {
        setDbUser(null);
      }

      setIsLoading(false);
    });

    // If no user, stop loading
    if (!currentUser) {
      setIsLoading(false);
    }

    return unsubscribe;
  }, [fetchDbUser]);

  const login = useCallback(() => {
    authLogin();
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setDbUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    dbUser,
    isLoading,
    isAuthenticated: !!user && !!dbUser,
    isAdmin: dbUser?.role === "admin",
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
