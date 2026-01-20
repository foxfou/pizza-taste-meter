import { extractUser } from "./lib/auth";

export default async (request: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    const auth = await extractUser(request);

    if (!auth.user || !auth.dbUser) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: auth.dbUser.id,
          email: auth.dbUser.email,
          role: auth.dbUser.role,
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Error in /api/me:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/me",
};
