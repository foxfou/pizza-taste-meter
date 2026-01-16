import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import type { Route } from "./+types/survey";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "Slice Score - Оценка" },
    { name: "description", content: "Оцените вкус пиццы" },
  ];
}

interface Survey {
  id: string;
  description: string;
  created_at: string;
  rating_count: number;
  average_score: number | null;
}

interface Rating {
  id: string;
  survey_id: string;
  score: number;
  timestamp: number;
}

async function fetchSurvey(id: string): Promise<Survey> {
  const response = await fetch(`/api/surveys/${id}`);
  if (!response.ok) throw new Error("Failed to fetch survey");
  return response.json();
}

async function fetchRatings(surveyId: string): Promise<Rating[]> {
  const response = await fetch(`/api/ratings?surveyId=${surveyId}`);
  if (!response.ok) throw new Error("Failed to fetch ratings");
  return response.json();
}

async function postRating(surveyId: string, score: number): Promise<Rating> {
  const response = await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surveyId, score }),
  });
  if (!response.ok) throw new Error("Failed to save rating");
  return response.json();
}

function getAverageScore(ratings: Rating[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return sum / ratings.length;
}

function getScoreEmoji(score: number): string {
  if (score <= 2) return "😞";
  if (score <= 4) return "😐";
  if (score <= 6) return "🙂";
  if (score <= 8) return "😋";
  return "🤤";
}

function formatDate(timestamp: number | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(timestamp)));
}

export default function SurveyPage() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [score, setScore] = useState(5);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([fetchSurvey(id), fetchRatings(id)])
      .then(([surveyData, ratingsData]) => {
        setSurvey(surveyData);
        setRatings(ratingsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRate = async () => {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    try {
      const newRating = await postRating(id, score);
      setRatings((prev) => [newRating, ...prev].slice(0, 100));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const averageScore = getAverageScore(ratings);

  if (isLoading) {
    return (
      <main className="min-h-dvh px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-orange-800/60">Загрузка...</div>
      </main>
    );
  }

  if (error && !survey) {
    return (
      <main className="min-h-dvh px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-2xl mb-6">
            {error}
          </div>
          <Link
            to="/"
            className="text-orange-600 hover:text-orange-700 flex items-center gap-2"
          >
            &larr; На главную
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          to="/"
          className="text-orange-600 hover:text-orange-700 flex items-center gap-2 mb-6"
        >
          &larr; На главную
        </Link>

        {/* Header */}
        <header className="text-center mb-10">
          <div className="text-5xl mb-2">🍕</div>
          <h1 className="text-3xl font-bold text-orange-600 tracking-tight">
            Slice Score
          </h1>
          {survey && (
            <p className="text-orange-800/80 mt-3 text-lg">{survey.description}</p>
          )}
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {/* Rating Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          {/* Score Display */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">{getScoreEmoji(score)}</div>
            <div className="text-5xl font-bold text-orange-500">{score}</div>
            <div className="text-orange-800/40 text-sm">из 10</div>
          </div>

          {/* Slider */}
          <div className="mb-6">
            <input
              type="range"
              min="1"
              max="10"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full h-2"
            />
            <div className="flex justify-between text-xs text-orange-800/40 mt-2">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Rate Button */}
          <button
            onClick={handleRate}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl text-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showSuccess ? "Оценка сохранена!" : isSaving ? "Сохранение..." : "Оценить"}
          </button>
        </div>

        {/* Stats */}
        {ratings.length > 0 && (
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-orange-800/40 text-xs">Средняя оценка</div>
                <div className="text-2xl font-bold text-orange-600">
                  {averageScore.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-orange-800/40 text-xs">Всего оценок</div>
                <div className="text-2xl font-bold text-orange-600">
                  {ratings.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {ratings.length > 0 && (
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4">
            <h2 className="text-sm font-medium text-orange-800/60 mb-3">
              История оценок
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ratings.slice(0, 10).map((rating) => (
                <div
                  key={rating.id}
                  className="flex items-center justify-between py-2 border-b border-orange-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getScoreEmoji(rating.score)}</span>
                    <span className="font-semibold text-orange-700">
                      {rating.score}/10
                    </span>
                  </div>
                  <span className="text-xs text-orange-800/40">
                    {formatDate(rating.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
