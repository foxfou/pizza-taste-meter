import { useState, useEffect } from "react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Slice Score - Rate Your Pizza" },
    { name: "description", content: "Rate the taste of your pizza from 1 to 10" },
  ];
}

interface Rating {
  id: string;
  score: number;
  timestamp: number;
}

const API_URL = "/api/ratings";

async function fetchRatings(): Promise<Rating[]> {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Failed to fetch ratings");
  return response.json();
}

async function postRating(score: number): Promise<Rating> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score }),
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

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function Home() {
  const [score, setScore] = useState(5);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRatings()
      .then(setRatings)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const newRating = await postRating(score);
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

  return (
    <main className="min-h-dvh px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="text-5xl mb-2">🍕</div>
          <h1 className="text-3xl font-bold text-orange-600 tracking-tight">
            Slice Score
          </h1>
          <p className="text-orange-800/60 mt-1">Оцени вкус пиццы</p>
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

        {/* Loading */}
        {isLoading && (
          <div className="text-center text-orange-800/60 py-8">
            Загрузка...
          </div>
        )}

        {/* Stats */}
        {!isLoading && ratings.length > 0 && (
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
        {!isLoading && ratings.length > 0 && (
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
