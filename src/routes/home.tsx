import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Slice Score - Опросы" },
    { name: "description", content: "Создавайте опросы и оценивайте вкус пиццы" },
  ];
}

interface Survey {
  id: string;
  description: string;
  created_at: string;
  rating_count: number;
  average_score: number | null;
}

async function fetchSurveys(): Promise<Survey[]> {
  const response = await fetch("/api/surveys");
  if (!response.ok) throw new Error("Failed to fetch surveys");
  return response.json();
}

async function createSurvey(description: string): Promise<Survey> {
  const response = await fetch("/api/surveys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) throw new Error("Failed to create survey");
  return response.json();
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getScoreEmoji(score: number | null): string {
  if (score === null) return "🍕";
  if (score <= 2) return "😞";
  if (score <= 4) return "😐";
  if (score <= 6) return "🙂";
  if (score <= 8) return "😋";
  return "🤤";
}

export default function Home() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSurveys()
      .then(setSurveys)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const survey = await createSurvey(newDescription.trim());
      setSurveys((prev) => [survey, ...prev]);
      setNewDescription("");
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-dvh px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="text-5xl mb-2">🍕</div>
          <h1 className="text-3xl font-bold text-orange-600 tracking-tight">
            Slice Score
          </h1>
          <p className="text-orange-800/60 mt-1">Опросы вкуса пиццы</p>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {/* Create Survey Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl text-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-6"
        >
          Создать опрос
        </button>

        {/* Loading */}
        {isLoading && (
          <div className="text-center text-orange-800/60 py-8">
            Загрузка...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && surveys.length === 0 && (
          <div className="text-center text-orange-800/60 py-8 bg-white/60 backdrop-blur rounded-2xl">
            Пока нет опросов. Создайте первый!
          </div>
        )}

        {/* Surveys List */}
        {!isLoading && surveys.length > 0 && (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <Link
                key={survey.id}
                to={`/survey/${survey.id}`}
                className="block bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getScoreEmoji(survey.average_score)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-orange-800 font-medium truncate">
                      {survey.description}
                    </p>
                    <p className="text-orange-800/40 text-xs mt-1">
                      {formatDate(survey.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {survey.average_score !== null ? (
                      <>
                        <div className="text-xl font-bold text-orange-600">
                          {survey.average_score.toFixed(1)}
                        </div>
                        <div className="text-orange-800/40 text-xs">
                          {survey.rating_count} оц.
                        </div>
                      </>
                    ) : (
                      <div className="text-orange-800/40 text-xs">
                        Нет оценок
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Survey Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-orange-600 mb-4">
                Новый опрос
              </h2>
              <form onSubmit={handleCreateSurvey}>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Описание (рецепт, заметка...)"
                  className="w-full p-4 border border-orange-200 rounded-2xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setNewDescription("");
                    }}
                    className="flex-1 py-3 border border-orange-300 text-orange-600 font-semibold rounded-2xl hover:bg-orange-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newDescription.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl disabled:opacity-50"
                  >
                    {isCreating ? "Создание..." : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
