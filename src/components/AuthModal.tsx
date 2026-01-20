import { useState, useEffect } from "react";
import { X, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";

export type AuthMode = "login" | "signup" | "recovery" | "reset-password";

function translateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Ошибки входа
  if (lowerMessage.includes("invalid login credentials") ||
      lowerMessage.includes("invalid_grant") ||
      lowerMessage.includes("invalid login")) {
    return "Неверный email или пароль";
  }

  if (lowerMessage.includes("user not found") ||
      lowerMessage.includes("no user found")) {
    return "Пользователь с таким email не найден";
  }

  if (lowerMessage.includes("email not confirmed") ||
      lowerMessage.includes("confirm your email")) {
    return "Email не подтверждён. Проверьте вашу почту";
  }

  // Ошибки регистрации
  if (lowerMessage.includes("user already registered") ||
      lowerMessage.includes("already exists") ||
      lowerMessage.includes("email already") ||
      lowerMessage.includes("a user with this email")) {
    return "Пользователь с таким email уже зарегистрирован";
  }

  if (lowerMessage.includes("password") && lowerMessage.includes("weak")) {
    return "Пароль слишком простой. Используйте более сложный пароль";
  }

  if (lowerMessage.includes("password") && lowerMessage.includes("short")) {
    return "Пароль слишком короткий";
  }

  if (lowerMessage.includes("password") && lowerMessage.includes("length")) {
    return "Пароль должен быть не менее 6 символов";
  }

  // Ошибки email
  if (lowerMessage.includes("invalid email") ||
      lowerMessage.includes("valid email") ||
      lowerMessage.includes("email format")) {
    return "Введите корректный email адрес";
  }

  if (lowerMessage.includes("email") && lowerMessage.includes("required")) {
    return "Введите email адрес";
  }

  // Ошибки восстановления пароля
  if (lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many requests") ||
      lowerMessage.includes("exceeded")) {
    return "Слишком много попыток. Подождите немного и попробуйте снова";
  }

  // Ошибки токена
  if (lowerMessage.includes("token") &&
      (lowerMessage.includes("expired") || lowerMessage.includes("invalid"))) {
    return "Ссылка устарела или недействительна. Запросите новую";
  }

  // Сетевые ошибки
  if (lowerMessage.includes("network") ||
      lowerMessage.includes("fetch") ||
      lowerMessage.includes("connection") ||
      lowerMessage.includes("failed to fetch")) {
    return "Ошибка сети. Проверьте подключение к интернету";
  }

  if (lowerMessage.includes("timeout")) {
    return "Превышено время ожидания. Попробуйте ещё раз";
  }

  // Серверные ошибки
  if (lowerMessage.includes("500") ||
      lowerMessage.includes("internal server") ||
      lowerMessage.includes("server error")) {
    return "Ошибка сервера. Попробуйте позже";
  }

  if (lowerMessage.includes("503") ||
      lowerMessage.includes("service unavailable")) {
    return "Сервис временно недоступен. Попробуйте позже";
  }

  if (lowerMessage.includes("401") ||
      lowerMessage.includes("unauthorized")) {
    return "Ошибка авторизации. Попробуйте войти заново";
  }

  if (lowerMessage.includes("403") ||
      lowerMessage.includes("forbidden")) {
    return "Доступ запрещён";
  }

  // Общие ошибки JSON/API
  if (lowerMessage.includes("json") ||
      lowerMessage.includes("unexpected token") ||
      lowerMessage.includes("parse")) {
    return "Ошибка обработки данных. Попробуйте ещё раз";
  }

  // Если ничего не подошло, возвращаем общее сообщение
  return "Произошла ошибка. Попробуйте ещё раз";
}

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string) => Promise<void>;
  onRecovery: (email: string) => Promise<void>;
  onResetPassword?: (newPassword: string) => Promise<void>;
}

export function AuthModal({
  isOpen,
  initialMode = "login",
  onClose,
  onLogin,
  onSignup,
  onRecovery,
  onResetPassword
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        await onLogin(email, password);
        onClose();
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Пароли не совпадают");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Пароль должен быть не менее 6 символов");
          setIsLoading(false);
          return;
        }
        await onSignup(email, password);
        setSuccess("Письмо с подтверждением отправлено на вашу почту");
        setMode("login");
      } else if (mode === "recovery") {
        await onRecovery(email);
        setSuccess("Инструкции по восстановлению пароля отправлены на вашу почту");
      } else if (mode === "reset-password") {
        if (password !== confirmPassword) {
          setError("Пароли не совпадают");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Пароль должен быть не менее 6 символов");
          setIsLoading(false);
          return;
        }
        if (onResetPassword) {
          await onResetPassword(password);
          setSuccess("Пароль успешно изменён!");
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err) {
      setError(translateError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const titles: Record<AuthMode, string> = {
    login: "Вход",
    signup: "Регистрация",
    recovery: "Восстановление пароля",
    "reset-password": "Новый пароль",
  };

  const showEmailField = mode === "login" || mode === "signup" || mode === "recovery";
  const showPasswordField = mode === "login" || mode === "signup" || mode === "reset-password";
  const showConfirmPasswordField = mode === "signup" || mode === "reset-password";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{titles[mode]}</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === "reset-password" && !success && (
            <p className="text-orange-800/80 text-sm">
              Введите новый пароль для вашего аккаунта
            </p>
          )}

          <div className="space-y-3">
            {showEmailField && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl text-orange-900 placeholder:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {showPasswordField && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="password"
                  placeholder={mode === "reset-password" ? "Новый пароль" : "Пароль"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl text-orange-900 placeholder:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {showConfirmPasswordField && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl text-orange-900 placeholder:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || (mode === "reset-password" && !!success)}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Загрузка...</span>
              </span>
            ) : mode === "login" ? (
              "Войти"
            ) : mode === "signup" ? (
              "Зарегистрироваться"
            ) : mode === "reset-password" ? (
              "Сохранить пароль"
            ) : (
              "Отправить"
            )}
          </button>

          <div className="pt-2 space-y-2 text-center text-sm">
            {mode === "login" && (
              <>
                <p className="text-orange-800/60">
                  Нет аккаунта?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Зарегистрироваться
                  </button>
                </p>
                <p className="text-orange-800/60">
                  <button
                    type="button"
                    onClick={() => setMode("recovery")}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Забыли пароль?
                  </button>
                </p>
              </>
            )}

            {mode === "signup" && (
              <p className="text-orange-800/60">
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Войти
                </button>
              </p>
            )}

            {mode === "recovery" && (
              <p className="text-orange-800/60">
                Вспомнили пароль?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Войти
                </button>
              </p>
            )}

            {mode === "reset-password" && !success && (
              <p className="text-orange-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Отмена
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
