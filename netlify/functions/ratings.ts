import { neon } from "@netlify/neon";
import { extractUser, requireAuth } from "./lib/auth";

interface Rating {
  id: string;
  survey_id: string;
  score: number;
  timestamp: number;
  user_id: string | null;
}

interface MyRating {
  id: string;
  score: number;
  timestamp: number;
}

const MAX_RATINGS = 100;

export default async (request: Request) => {
  const sql = neon();
  const url = new URL(request.url);

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // GET /api/ratings/my?surveyId=xxx - get my rating for a survey
    if (request.method === "GET" && url.pathname.endsWith("/my")) {
      const surveyId = url.searchParams.get("surveyId");

      if (!surveyId) {
        return new Response(
          JSON.stringify({ error: "surveyId query parameter is required" }),
          { status: 400, headers }
        );
      }

      const auth = await extractUser(request);

      if (!auth.user || !auth.dbUser) {
        return new Response(
          JSON.stringify({ rating: null }),
          { status: 200, headers }
        );
      }

      const [myRating] = await sql`
        SELECT id, score, timestamp
        FROM ratings
        WHERE survey_id = ${surveyId}::uuid AND user_id = ${auth.dbUser.id}::uuid
      ` as MyRating[];

      return new Response(
        JSON.stringify({ rating: myRating || null }),
        { status: 200, headers }
      );
    }

    // GET /api/ratings?surveyId=xxx - get all ratings for a survey (public)
    if (request.method === "GET") {
      const surveyId = url.searchParams.get("surveyId");

      if (!surveyId) {
        return new Response(
          JSON.stringify({ error: "surveyId query parameter is required" }),
          { status: 400, headers }
        );
      }

      const ratings = await sql`
        SELECT id, survey_id, score, timestamp
        FROM ratings
        WHERE survey_id = ${surveyId}::uuid
        ORDER BY timestamp DESC
        LIMIT ${MAX_RATINGS}
      ` as Rating[];

      return new Response(JSON.stringify(ratings), { status: 200, headers });
    }

    // POST /api/ratings - create or update rating (authenticated users only)
    if (request.method === "POST") {
      const { auth, errorResponse } = await requireAuth(request);
      if (errorResponse) return errorResponse;

      const body = await request.json();
      const score = Number(body.score);
      const surveyId = body.surveyId;

      if (!surveyId) {
        return new Response(
          JSON.stringify({ error: "surveyId is required" }),
          { status: 400, headers }
        );
      }

      if (isNaN(score) || score < 1 || score > 10) {
        return new Response(
          JSON.stringify({ error: "Score must be between 1 and 10" }),
          { status: 400, headers }
        );
      }

      const timestamp = Date.now();
      const userId = auth.dbUser!.id;

      // UPSERT: insert or update if user already rated this survey
      const [rating] = await sql`
        INSERT INTO ratings (survey_id, score, timestamp, user_id)
        VALUES (${surveyId}::uuid, ${score}, ${timestamp}, ${userId}::uuid)
        ON CONFLICT (user_id, survey_id) WHERE user_id IS NOT NULL
        DO UPDATE SET score = ${score}, timestamp = ${timestamp}
        RETURNING id, survey_id, score, timestamp, user_id
      ` as Rating[];

      return new Response(JSON.stringify(rating), { status: 201, headers });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: ["/api/ratings", "/api/ratings/my"],
};
