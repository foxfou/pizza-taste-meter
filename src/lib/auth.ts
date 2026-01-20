import netlifyIdentity from "netlify-identity-widget";
import type { User } from "netlify-identity-widget";

export interface NetlifyUser extends User {}

let initialized = false;

export function initAuth(): void {
  if (initialized) return;
  initialized = true;

  netlifyIdentity.init({
    locale: "ru",
  });
}

export function login(): void {
  netlifyIdentity.open("login");
}

export function signup(): void {
  netlifyIdentity.open("signup");
}

export function logout(): void {
  netlifyIdentity.logout();
}

export function getCurrentUser(): NetlifyUser | null {
  return netlifyIdentity.currentUser();
}

export function getAccessToken(): string | null {
  const user = getCurrentUser();
  return user?.token?.access_token ?? null;
}

export function onAuthChange(callback: (user: NetlifyUser | null) => void): () => void {
  const handleLogin = (user: User) => callback(user);
  const handleLogout = () => callback(null);
  const handleInit = (user: User | null) => callback(user);

  netlifyIdentity.on("login", handleLogin);
  netlifyIdentity.on("logout", handleLogout);
  netlifyIdentity.on("init", handleInit);

  return () => {
    netlifyIdentity.off("login", handleLogin);
    netlifyIdentity.off("logout", handleLogout);
    netlifyIdentity.off("init", handleInit);
  };
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function refreshToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    await netlifyIdentity.refresh();
    return getAccessToken();
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}
