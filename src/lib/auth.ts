import GoTrue from "gotrue-js";

export interface GoTrueUser {
  id: string;
  email: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  app_metadata: {
    provider?: string;
    roles?: string[];
  };
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  token?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    expires_at: number;
  };
}

let auth: GoTrue | null = null;

function getAuth(): GoTrue {
  if (!auth) {
    const apiUrl = typeof window !== "undefined"
      ? `${window.location.origin}/.netlify/identity`
      : "/.netlify/identity";

    auth = new GoTrue({
      APIUrl: apiUrl,
      setCookie: true,
    });
  }
  return auth;
}

export function getCurrentUser(): GoTrueUser | null {
  const goTrue = getAuth();
  return goTrue.currentUser() as GoTrueUser | null;
}

export function getAccessToken(): string | null {
  const user = getCurrentUser();
  return user?.token?.access_token ?? null;
}

export async function login(email: string, password: string): Promise<GoTrueUser> {
  const goTrue = getAuth();
  const user = await goTrue.login(email, password, true);
  return user as GoTrueUser;
}

export async function signup(email: string, password: string): Promise<GoTrueUser> {
  const goTrue = getAuth();
  const user = await goTrue.signup(email, password);
  return user as GoTrueUser;
}

export async function logout(): Promise<void> {
  const user = getCurrentUser();
  if (user) {
    const goTrue = getAuth();
    await goTrue.currentUser()?.logout();
  }
}

export async function requestPasswordRecovery(email: string): Promise<void> {
  const goTrue = getAuth();
  await goTrue.requestPasswordRecovery(email);
}

export async function recoverWithToken(token: string): Promise<GoTrueUser> {
  const goTrue = getAuth();
  const user = await goTrue.recover(token, true);
  return user as GoTrueUser;
}

export async function updatePassword(newPassword: string): Promise<GoTrueUser> {
  const goTrue = getAuth();
  const currentUser = goTrue.currentUser();
  if (!currentUser) {
    throw new Error("No user logged in");
  }
  const updatedUser = await currentUser.update({ password: newPassword });
  return updatedUser as GoTrueUser;
}

export async function confirmEmail(token: string): Promise<GoTrueUser> {
  const goTrue = getAuth();
  const user = await goTrue.confirm(token, true);
  return user as GoTrueUser;
}

export function parseAuthHash(): { type: string; token: string } | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash) return null;

  // Форматы токенов:
  // #recovery_token=xxx
  // #confirmation_token=xxx
  // #invite_token=xxx

  const recoveryMatch = hash.match(/recovery_token=([^&]+)/);
  if (recoveryMatch) {
    return { type: "recovery", token: recoveryMatch[1] };
  }

  const confirmMatch = hash.match(/confirmation_token=([^&]+)/);
  if (confirmMatch) {
    return { type: "confirmation", token: confirmMatch[1] };
  }

  const inviteMatch = hash.match(/invite_token=([^&]+)/);
  if (inviteMatch) {
    return { type: "invite", token: inviteMatch[1] };
  }

  return null;
}

export function clearAuthHash(): void {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
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
    const goTrue = getAuth();
    const currentUser = goTrue.currentUser();
    if (currentUser) {
      await currentUser.jwt(true);
      return getAccessToken();
    }
    return null;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}
