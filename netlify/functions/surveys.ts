import { neon } from "@netlify/neon";

interface Survey {
  id: string;
  description: string;
  created_at: string;
  rating_count: number;
  average_score: number | null;
}

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
    // GET /api/surveys/:id - get single survey
    const pathParts = url.pathname.split('/').filter(Boolean);
    const surveyId = pathParts.length === 3 ? pathParts[2] : null;
    const pathMatch = surveyId && /^[a-f0-9-]+$/i.test(surveyId);
    if (pathMatch && request.method === "GET") {
      const [survey] = await sql`
        SELECT
          s.id,
          s.description,
          s.created_at,
          COUNT(r.id)::int as rating_count,
          AVG(r.score)::float as average_score
        FROM surveys s
        LEFT JOIN ratings r ON r.survey_id = s.id
        WHERE s.id = ${surveyId}::uuid
        GROUP BY s.id
      ` as Survey[];

      if (!survey) {
        return new Response(
          JSON.stringify({ error: "Survey not found" }),
          { status: 404, headers }
        );
      }

      return new Response(JSON.stringify(survey), { status: 200, headers });
    }

    // GET /api/surveys - list all surveys
    if (request.method === "GET") {
      const surveys = await sql`
        SELECT
          s.id,
          s.description,
          s.created_at,
          COUNT(r.id)::int as rating_count,
          AVG(r.score)::float as average_score
        FROM surveys s
        LEFT JOIN ratings r ON r.survey_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      ` as Survey[];

      return new Response(JSON.stringify(surveys), { status: 200, headers });
    }

    // POST /api/surveys - create survey
    if (request.method === "POST") {
      const body = await request.json();
      const description = body.description?.trim();

      if (!description) {
        return new Response(
          JSON.stringify({ error: "Description is required" }),
          { status: 400, headers }
        );
      }

      const [newSurvey] = await sql`
        INSERT INTO surveys (description)
        VALUES (${description})
        RETURNING id, description, created_at
      `;

      return new Response(
        JSON.stringify({ ...newSurvey, rating_count: 0, average_score: null }),
        { status: 201, headers }
      );
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
  path: ["/api/surveys", "/api/surveys/:id"],
};
