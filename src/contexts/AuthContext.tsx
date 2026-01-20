import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  getCurrentUser,
  authFetch,
  requestPasswordRecovery,
  recoverWithToken,
  updatePassword,
  confirmEmail,
  parseAuthHash,
  clearAuthHash,
  type GoTrueUser,
} from "~/lib/auth";
import { AuthModal, type AuthMode } from "~/components/AuthModal";

interface DbUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: GoTrueUser | null;
  dbUser: DbUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoTrueUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthMode>("login");
  const [pendingRecoveryUser, setPendingRecoveryUser] = useState<GoTrueUser | null>(null);

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

  // Обработка токенов из URL (recovery, confirmation)
  useEffect(() => {
    const handleAuthToken = async () => {
      const authData = parseAuthHash();
      if (!authData) return;

      try {
        if (authData.type === "recovery") {
          // Восстановление пароля - авторизуем пользователя с токеном
          const recoveredUser = await recoverWithToken(authData.token);
          setPendingRecoveryUser(recoveredUser);
          setModalMode("reset-password");
          setIsModalOpen(true);
          clearAuthHash();
        } else if (authData.type === "confirmation") {
          // Подтверждение email - авторизуем пользователя
          const confirmedUser = await confirmEmail(authData.token);
          setUser(confirmedUser);
          await fetchDbUser();
          clearAuthHash();
        }
      } catch (error) {
        console.error("Failed to process auth token:", error);
        clearAuthHash();
      }
    };

    handleAuthToken();
  }, [fetchDbUser]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      fetchDbUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchDbUser]);

  const openLogin = useCallback(() => {
    setModalMode("login");
    setIsModalOpen(true);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authLogin(email, password);
    setUser(loggedInUser);
    await fetchDbUser();
  }, [fetchDbUser]);

  const handleSignup = useCallback(async (email: string, password: string) => {
    await authSignup(email, password);
  }, []);

  const handleRecovery = useCallback(async (email: string) => {
    await requestPasswordRecovery(email);
  }, []);

  const handleResetPassword = useCallback(async (newPassword: string) => {
    await updatePassword(newPassword);
    // После смены пароля обновляем состояние пользователя
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchDbUser();
    }
    setPendingRecoveryUser(null);
  }, [fetchDbUser]);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setDbUser(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingRecoveryUser(null);
    setModalMode("login");
  }, []);

  const value: AuthContextType = {
    user,
    dbUser,
    isLoading,
    isAuthenticated: !!user && !!dbUser,
    isAdmin: dbUser?.role === "admin",
    login: openLogin,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={closeModal}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onRecovery={handleRecovery}
        onResetPassword={handleResetPassword}
      />
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
