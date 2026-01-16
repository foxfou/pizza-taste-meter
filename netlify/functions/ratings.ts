import { neon } from "@netlify/neon";

interface Rating {
  id: string;
  survey_id: string;
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
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
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

    if (request.method === "POST") {
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

      const [newRating] = await sql`
        INSERT INTO ratings (survey_id, score, timestamp)
        VALUES (${surveyId}::uuid, ${score}, ${timestamp})
        RETURNING id, survey_id, score, timestamp
      ` as Rating[];

      return new Response(JSON.stringify(newRating), { status: 201, headers });
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
  path: "/api/ratings",
};
