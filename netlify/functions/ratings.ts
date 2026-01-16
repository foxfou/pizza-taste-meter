import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface Rating {
  id: string;
  score: number;
  timestamp: number;
}

const STORE_NAME = "pizza-ratings";
const RATINGS_KEY = "all-ratings";
const MAX_RATINGS = 100;

async function getRatings(context: Context): Promise<Rating[]> {
  const store = getStore({ name: STORE_NAME, siteID: context.site.id, token: process.env.NETLIFY_API_TOKEN });
  const data = await store.get(RATINGS_KEY, { type: "json" });
  return (data as Rating[]) || [];
}

async function saveRatings(context: Context, ratings: Rating[]): Promise<void> {
  const store = getStore({ name: STORE_NAME, siteID: context.site.id, token: process.env.NETLIFY_API_TOKEN });
  await store.setJSON(RATINGS_KEY, ratings);
}

export default async (request: Request, context: Context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (request.method === "GET") {
      const ratings = await getRatings(context);
      return new Response(JSON.stringify(ratings), { status: 200, headers });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const score = Number(body.score);

      if (isNaN(score) || score < 1 || score > 10) {
        return new Response(
          JSON.stringify({ error: "Score must be between 1 and 10" }),
          { status: 400, headers }
        );
      }

      const newRating: Rating = {
        id: crypto.randomUUID(),
        score,
        timestamp: Date.now(),
      };

      const ratings = await getRatings(context);
      ratings.unshift(newRating);
      await saveRatings(context, ratings.slice(0, MAX_RATINGS));

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
