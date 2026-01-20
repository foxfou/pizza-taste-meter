import { useAuth } from "~/contexts/AuthContext";

export function AuthButton() {
  const { user, dbUser, isLoading, isAdmin, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-10 px-4 flex items-center text-orange-800/40 text-sm">
        ...
      </div>
    );
  }

  if (!user || !dbUser) {
    return (
      <button
        onClick={login}
        className="h-10 px-4 bg-white/80 backdrop-blur text-orange-600 font-medium rounded-xl text-sm hover:bg-white transition-colors shadow-sm"
      >
        Войти
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg">
          Админ
        </span>
      )}
      <div className="flex items-center gap-2 h-10 px-3 bg-white/80 backdrop-blur rounded-xl shadow-sm">
        <span className="text-orange-800 text-sm truncate max-w-[120px]">
          {dbUser.email}
        </span>
        <button
          onClick={logout}
          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
