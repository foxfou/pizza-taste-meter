import { neon } from "@netlify/neon";
import { requireAdmin } from "./lib/auth";

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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // Parse survey ID from path
    const pathParts = url.pathname.split('/').filter(Boolean);
    const surveyId = pathParts.length === 3 ? pathParts[2] : null;
    const isValidId = surveyId && /^[a-f0-9-]+$/i.test(surveyId);

    // GET /api/surveys/:id - get single survey (public)
    if (isValidId && request.method === "GET") {
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

    // PUT /api/surveys/:id - update survey (admin only)
    if (isValidId && request.method === "PUT") {
      const { errorResponse } = await requireAdmin(request);
      if (errorResponse) return errorResponse;

      const body = await request.json();
      const description = body.description?.trim();

      if (!description) {
        return new Response(
          JSON.stringify({ error: "Description is required" }),
          { status: 400, headers }
        );
      }

      const [updated] = await sql`
        UPDATE surveys
        SET description = ${description}
        WHERE id = ${surveyId}::uuid
        RETURNING id, description, created_at
      `;

      if (!updated) {
        return new Response(
          JSON.stringify({ error: "Survey not found" }),
          { status: 404, headers }
        );
      }

      // Fetch with stats
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

      return new Response(JSON.stringify(survey), { status: 200, headers });
    }

    // DELETE /api/surveys/:id - delete survey (admin only)
    if (isValidId && request.method === "DELETE") {
      const { errorResponse } = await requireAdmin(request);
      if (errorResponse) return errorResponse;

      // Delete ratings first (due to foreign key)
      await sql`DELETE FROM ratings WHERE survey_id = ${surveyId}::uuid`;

      const [deleted] = await sql`
        DELETE FROM surveys
        WHERE id = ${surveyId}::uuid
        RETURNING id
      `;

      if (!deleted) {
        return new Response(
          JSON.stringify({ error: "Survey not found" }),
          { status: 404, headers }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    }

    // GET /api/surveys - list all surveys (public)
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

    // POST /api/surveys - create survey (admin only)
    if (request.method === "POST") {
      const { errorResponse } = await requireAdmin(request);
      if (errorResponse) return errorResponse;

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
