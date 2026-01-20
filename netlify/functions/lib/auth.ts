import { neon } from "@netlify/neon";

export interface NetlifyUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
  app_metadata?: {
    roles?: string[];
  };
}

export interface DbUser {
  id: string;
  netlify_id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthResult {
  user: NetlifyUser | null;
  dbUser: DbUser | null;
  error?: string;
}

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers,
  });
}

export function forbiddenResponse(message = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers,
  });
}

/**
 * Extract user from Netlify Identity JWT token
 * The token is passed in the Authorization header as "Bearer <token>"
 */
export async function extractUser(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, dbUser: null };
  }

  const token = authHeader.slice(7);

  try {
    // Decode JWT payload (base64url)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { user: null, dbUser: null, error: "Invalid token format" };
    }

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );

    // Check token expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { user: null, dbUser: null, error: "Token expired" };
    }

    const netlifyUser: NetlifyUser = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata,
      app_metadata: payload.app_metadata,
    };

    // Find or create user in database
    const sql = neon();

    let [dbUser] = await sql`
      SELECT id, netlify_id, email, role, created_at
      FROM users
      WHERE netlify_id = ${netlifyUser.id}
    ` as DbUser[];

    if (!dbUser) {
      // Create new user with default 'user' role
      [dbUser] = await sql`
        INSERT INTO users (netlify_id, email, role)
        VALUES (${netlifyUser.id}, ${netlifyUser.email}, 'user')
        RETURNING id, netlify_id, email, role, created_at
      ` as DbUser[];
    }

    return { user: netlifyUser, dbUser };
  } catch (error) {
    console.error("Error extracting user:", error);
    return { user: null, dbUser: null, error: "Failed to verify token" };
  }
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(
  request: Request
): Promise<{ auth: AuthResult; errorResponse?: Response }> {
  const auth = await extractUser(request);

  if (!auth.user || !auth.dbUser) {
    return {
      auth,
      errorResponse: unauthorizedResponse(auth.error || "Authentication required"),
    };
  }

  return { auth };
}

/**
 * Require admin role - returns error response if not admin
 */
export async function requireAdmin(
  request: Request
): Promise<{ auth: AuthResult; errorResponse?: Response }> {
  const { auth, errorResponse } = await requireAuth(request);

  if (errorResponse) {
    return { auth, errorResponse };
  }

  if (auth.dbUser?.role !== "admin") {
    return {
      auth,
      errorResponse: forbiddenResponse("Admin access required"),
    };
  }

  return { auth };
}
