'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase/client';

type Survey = {
  id: string;
  title: string;
  description: string | null;
  year: number;
  region: string;
  status: string;
};

type SurveyQuestion = {
  question_code: string;
  category: string | null;
  type: string;
  question_text: string;
  options: unknown;
  required: boolean;
  order_index: number;
  logic_rules: unknown;
  is_active: boolean;
};

export default function AdminSurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const getSurveys = async () => {
    return supabaseClient
      .from('surveys')
      .select('id, title, description, year, region, status')
      .order('year', { ascending: false });
  };

  const fetchSurveys = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await getSurveys();

    if (error) {
      setErrorMessage(error.message);
      setSurveys([]);
      setLoading(false);
      return;
    }

    setSurveys((data ?? []) as Survey[]);
    setLoading(false);
  };

  useEffect(() => {
    const loadInitialSurveys = async () => {
      const { data, error } = await getSurveys();

      if (error) {
        setErrorMessage(error.message);
        setSurveys([]);
        setLoading(false);
        return;
      }

      setSurveys((data ?? []) as Survey[]);
      setLoading(false);
    };

    void loadInitialSurveys();
  }, []);

  const handleActivate = async (surveyId: string) => {
    setActionLoadingId(surveyId);
    setErrorMessage(null);

    const { error: closeAllError } = await supabaseClient
      .from('surveys')
      .update({ status: 'closed' })
      .neq('id', surveyId);

    if (closeAllError) {
      setErrorMessage(closeAllError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: activateError } = await supabaseClient
      .from('surveys')
      .update({ status: 'active' })
      .eq('id', surveyId);

    if (activateError) {
      setErrorMessage(activateError.message);
      setActionLoadingId(null);
      return;
    }

    await fetchSurveys();
    setActionLoadingId(null);
  };

  const handleClose = async (surveyId: string) => {
    setActionLoadingId(surveyId);
    setErrorMessage(null);

    const { error } = await supabaseClient
      .from('surveys')
      .update({ status: 'closed' })
      .eq('id', surveyId);

    if (error) {
      setErrorMessage(error.message);
      setActionLoadingId(null);
      return;
    }

    await fetchSurveys();
    setActionLoadingId(null);
  };

  const handleClone = async (survey: Survey) => {
    setActionLoadingId(survey.id);
    setErrorMessage(null);

    const { data: newSurvey, error: createSurveyError } = await supabaseClient
      .from('surveys')
      .insert({
        title: survey.title,
        description: survey.description,
        year: new Date().getFullYear(),
        region: survey.region,
        status: 'draft',
      })
      .select('id')
      .single();

    if (createSurveyError || !newSurvey) {
      setErrorMessage(createSurveyError?.message ?? 'Failed to clone survey');
      setActionLoadingId(null);
      return;
    }

    const { data: questions, error: questionsError } = await supabaseClient
      .from('survey_questions')
      .select(
        'question_code, category, type, question_text, options, required, order_index, logic_rules, is_active'
      )
      .eq('survey_id', survey.id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      setErrorMessage(questionsError.message);
      setActionLoadingId(null);
      return;
    }

    const questionRows = ((questions ?? []) as SurveyQuestion[]).map((question) => ({
      survey_id: newSurvey.id,
      question_code: question.question_code,
      category: question.category,
      type: question.type,
      question_text: question.question_text,
      options: question.options,
      required: question.required,
      order_index: question.order_index,
      logic_rules: question.logic_rules,
      is_active: question.is_active,
    }));

    if (questionRows.length > 0) {
      const { error: insertQuestionsError } = await supabaseClient
        .from('survey_questions')
        .insert(questionRows);

      if (insertQuestionsError) {
        setErrorMessage(insertQuestionsError.message);
        setActionLoadingId(null);
        return;
      }
    }

    await fetchSurveys();
    setActionLoadingId(null);
  };

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Surveys</h1>
        <Link
          href="/admin/surveys/create"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create Survey
        </Link>
      </div>

      {loading ? <p className="text-sm text-gray-600">Loading surveys...</p> : null}
      {errorMessage ? <p className="mb-3 text-sm text-red-600">{errorMessage}</p> : null}

      {!loading && !errorMessage ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {surveys.map((survey) => {
                const isActive = survey.status === 'active';
                const isActionLoading = actionLoadingId === survey.id;

                return (
                  <tr
                    key={survey.id}
                    onClick={() => router.push(`/admin/surveys/${survey.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{survey.title}</td>
                    <td className="px-4 py-3">{survey.year}</td>
                    <td className="px-4 py-3">{survey.region}</td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        survey.status
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleActivate(survey.id);
                          }}
                          disabled={isActionLoading || isActive}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleClose(survey.id);
                          }}
                          disabled={isActionLoading}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleClone(survey);
                          }}
                          disabled={isActionLoading}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Clone
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {surveys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No surveys found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
