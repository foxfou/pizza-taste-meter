import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { AuthButton } from "~/components/AuthButton";
import { useAuth } from "~/contexts/AuthContext";
import { authFetch } from "~/lib/auth";

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
  const response = await authFetch("/api/surveys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create survey");
  }
  return response.json();
}

async function updateSurvey(id: string, description: string): Promise<Survey> {
  const response = await authFetch(`/api/surveys/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update survey");
  }
  return response.json();
}

async function deleteSurvey(id: string): Promise<void> {
  const response = await authFetch(`/api/surveys/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete survey");
  }
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
  const { isAdmin } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal state
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEditSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSurvey || !editDescription.trim()) return;

    setIsUpdating(true);
    setError(null);
    try {
      const updated = await updateSurvey(editingSurvey.id, editDescription.trim());
      setSurveys((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setEditingSurvey(null);
      setEditDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update survey");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSurvey = async () => {
    if (!deletingSurvey) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteSurvey(deletingSurvey.id);
      setSurveys((prev) => prev.filter((s) => s.id !== deletingSurvey.id));
      setDeletingSurvey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete survey");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (survey: Survey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingSurvey(survey);
    setEditDescription(survey.description);
  };

  const openDeleteModal = (survey: Survey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingSurvey(survey);
  };

  return (
    <main className="min-h-dvh px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Auth Button - Top Right */}
        <div className="flex justify-end mb-4">
          <AuthButton />
        </div>

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

        {/* Create Survey Button - Only for Admin */}
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl text-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-6"
          >
            Создать опрос
          </button>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center text-orange-800/60 py-8">
            Загрузка...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && surveys.length === 0 && (
          <div className="text-center text-orange-800/60 py-8 bg-white/60 backdrop-blur rounded-2xl">
            {isAdmin
              ? "Пока нет опросов. Создайте первый!"
              : "Пока нет опросов."}
          </div>
        )}

        {/* Surveys List */}
        {!isLoading && surveys.length > 0 && (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="relative">
                <Link
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

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-orange-100">
                      <button
                        onClick={(e) => openEditModal(survey, e)}
                        className="flex-1 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={(e) => openDeleteModal(survey, e)}
                        className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </Link>
              </div>
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

        {/* Edit Survey Modal */}
        {editingSurvey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-orange-600 mb-4">
                Редактировать опрос
              </h2>
              <form onSubmit={handleEditSurvey}>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание (рецепт, заметка...)"
                  className="w-full p-4 border border-orange-200 rounded-2xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSurvey(null);
                      setEditDescription("");
                    }}
                    className="flex-1 py-3 border border-orange-300 text-orange-600 font-semibold rounded-2xl hover:bg-orange-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !editDescription.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-2xl disabled:opacity-50"
                  >
                    {isUpdating ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSurvey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                Удалить опрос?
              </h2>
              <p className="text-orange-800/80 mb-6">
                Вы уверены, что хотите удалить опрос "{deletingSurvey.description}"?
                Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingSurvey(null)}
                  className="flex-1 py-3 border border-orange-300 text-orange-600 font-semibold rounded-2xl hover:bg-orange-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteSurvey}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? "Удаление..." : "Удалить"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
