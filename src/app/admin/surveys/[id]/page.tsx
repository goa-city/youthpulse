'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { supabaseClient } from '@/lib/supabase/client';

type Survey = {
  id: string;
  title: string;
  year: number;
  region: string;
};

type BlockType =
  | 'section_title'
  | 'section_intro'
  | 'text'
  | 'textarea'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'yes_no'
  | 'scale';

type Question = {
  id: string;
  question_code: string;
  question_text: string;
  helper_text: string | null;
  type: BlockType;
  required: boolean;
  options: string[] | null;
  order_index: number;
};

type BlockFormValues = {
  question_text: string;
  helper_text: string;
  type: BlockType;
  required: boolean;
  options: string;
};

const BLOCK_TYPE_OPTIONS: BlockType[] = [
  'section_title',
  'section_intro',
  'text',
  'textarea',
  'number',
  'radio',
  'checkbox',
  'yes_no',
  'scale',
];

export default function SurveyQuestionBuilderPage() {
  const params = useParams<{ id: string }>();
  const surveyId = params?.id;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    watch: watchAdd,
    reset: resetAdd,
    formState: { isSubmitting: isAdding },
  } = useForm<BlockFormValues>({
    defaultValues: {
      question_text: '',
      helper_text: '',
      type: 'text',
      required: false,
      options: '',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    watch: watchEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { isSubmitting: isEditing },
  } = useForm<BlockFormValues>({
    defaultValues: {
      question_text: '',
      helper_text: '',
      type: 'text',
      required: false,
      options: '',
    },
  });

  const selectedAddType = watchAdd('type');
  const selectedEditType = watchEdit('type');

  const showAddOptionsField = useMemo(
    () => selectedAddType === 'radio' || selectedAddType === 'checkbox',
    [selectedAddType]
  );
  const showEditOptionsField = useMemo(
    () => selectedEditType === 'radio' || selectedEditType === 'checkbox',
    [selectedEditType]
  );

  const fetchData = async () => {
    if (!surveyId) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const [{ data: surveyData, error: surveyError }, { data: questionData, error: questionError }] =
      await Promise.all([
        supabaseClient.from('surveys').select('id, title, year, region').eq('id', surveyId).single(),
        supabaseClient
          .from('questions')
          .select('id, question_code, question_text, helper_text, type, required, options, order_index')
          .eq('survey_id', surveyId)
          .order('order_index', { ascending: true }),
      ]);

    if (surveyError) {
      setErrorMessage(surveyError.message);
      setSurvey(null);
      setQuestions([]);
      setLoading(false);
      return;
    }

    if (questionError) {
      setErrorMessage(questionError.message);
      setSurvey((surveyData ?? null) as Survey | null);
      setQuestions([]);
      setLoading(false);
      return;
    }

    setSurvey((surveyData ?? null) as Survey | null);
    setQuestions((questionData ?? []) as Question[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [surveyId]);

  const onAddSubmit = async (values: BlockFormValues) => {
    if (!surveyId) {
      return;
    }

    setErrorMessage(null);

    const maxOrderIndex = questions.reduce((max, question) => {
      return question.order_index > max ? question.order_index : max;
    }, 0);

    const parsedOptions = showAddOptionsField
      ? values.options
          .split(',')
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : [];

    const { error } = await supabaseClient.from('questions').insert({
      survey_id: surveyId,
      question_code: `q_${Date.now()}`,
      question_text: values.question_text,
      helper_text: values.helper_text || null,
      type: values.type,
      required: values.required,
      options: showAddOptionsField ? parsedOptions : null,
      order_index: maxOrderIndex + 1,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    resetAdd({
      question_text: '',
      helper_text: '',
      type: 'text',
      required: false,
      options: '',
    });
    setShowAddForm(false);
    await fetchData();
  };

  const startEdit = (question: Question) => {
    setEditQuestionId(question.id);
    setErrorMessage(null);
    setEditValue('question_text', question.question_text);
    setEditValue('helper_text', question.helper_text ?? '');
    setEditValue('type', question.type);
    setEditValue('required', question.required);
    setEditValue('options', Array.isArray(question.options) ? question.options.join(', ') : '');
  };

  const cancelEdit = () => {
    setEditQuestionId(null);
    resetEdit({
      question_text: '',
      helper_text: '',
      type: 'text',
      required: false,
      options: '',
    });
  };

  const onEditSubmit = async (values: BlockFormValues) => {
    if (!editQuestionId) {
      return;
    }

    setEditLoadingId(editQuestionId);
    setErrorMessage(null);

    const parsedOptions = showEditOptionsField
      ? values.options
          .split(',')
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : [];

    const { error } = await supabaseClient
      .from('questions')
      .update({
        question_text: values.question_text,
        helper_text: values.helper_text || null,
        type: values.type,
        required: values.required,
        options: showEditOptionsField ? parsedOptions : null,
      })
      .eq('id', editQuestionId);

    if (error) {
      setErrorMessage(error.message);
      setEditLoadingId(null);
      return;
    }

    setEditLoadingId(null);
    cancelEdit();
    await fetchData();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setDeleteLoadingId(questionId);
    setErrorMessage(null);

    const { error } = await supabaseClient.from('questions').delete().eq('id', questionId);

    if (error) {
      setErrorMessage(error.message);
      setDeleteLoadingId(null);
      return;
    }

    await fetchData();
    setDeleteLoadingId(null);
  };

  const handleMove = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex((question) => question.id === questionId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    const currentQuestion = questions[currentIndex];
    const targetQuestion = questions[targetIndex];

    setReorderLoadingId(questionId);
    setErrorMessage(null);

    const { error: firstUpdateError } = await supabaseClient
      .from('questions')
      .update({ order_index: targetQuestion.order_index })
      .eq('id', currentQuestion.id);

    if (firstUpdateError) {
      setErrorMessage(firstUpdateError.message);
      setReorderLoadingId(null);
      return;
    }

    const { error: secondUpdateError } = await supabaseClient
      .from('questions')
      .update({ order_index: currentQuestion.order_index })
      .eq('id', targetQuestion.id);

    if (secondUpdateError) {
      setErrorMessage(secondUpdateError.message);
      setReorderLoadingId(null);
      return;
    }

    await fetchData();
    setReorderLoadingId(null);
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Question Builder</h1>
          {survey ? (
            <p className="mt-1 text-sm text-gray-600">
              {survey.title} ({survey.year}) - {survey.region}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add Block
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-600">Loading...</p> : null}
      {errorMessage ? <p className="mb-3 text-sm text-red-600">{errorMessage}</p> : null}

      {showAddForm ? (
        <form
          onSubmit={handleSubmitAdd(onAddSubmit)}
          className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="space-y-1">
            <label htmlFor="add_type" className="block text-sm text-gray-700">
              Block Type
            </label>
            <select
              id="add_type"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              {...registerAdd('type', { required: true })}
            >
              {BLOCK_TYPE_OPTIONS.map((blockType) => (
                <option key={blockType} value={blockType}>
                  {blockType}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="add_question_text" className="block text-sm text-gray-700">
              {selectedAddType === 'section_title'
                ? 'Title Text'
                : selectedAddType === 'section_intro'
                  ? 'Intro Text'
                  : 'Question Text'}
            </label>
            <textarea
              id="add_question_text"
              rows={selectedAddType === 'section_intro' ? 5 : 4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              {...registerAdd('question_text', { required: true })}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="add_helper_text" className="block text-sm text-gray-700">
              Helper Text
            </label>
            <textarea
              id="add_helper_text"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              {...registerAdd('helper_text')}
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="add_required" type="checkbox" {...registerAdd('required')} />
            <label htmlFor="add_required" className="text-sm text-gray-700">
              Required
            </label>
          </div>

          {showAddOptionsField ? (
            <div className="space-y-1">
              <label htmlFor="add_options" className="block text-sm text-gray-700">
                Options (comma separated)
              </label>
              <textarea
                id="add_options"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                {...registerAdd('options', { required: true })}
              />
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isAdding}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAdding ? 'Saving...' : 'Save Block'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                resetAdd();
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!loading ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-200">
            {questions.map((question, index) => {
              const isEditingBlock = editQuestionId === question.id;
              const isMoving = reorderLoadingId === question.id;
              const isDeleting = deleteLoadingId === question.id;
              const disableMoveUp = index === 0 || isMoving;
              const disableMoveDown = index === questions.length - 1 || isMoving;

              return (
                <li key={question.id} className="p-4">
                  {isEditingBlock ? (
                    <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
                      <div className="space-y-1">
                        <label htmlFor="edit_type" className="block text-sm text-gray-700">
                          Block Type
                        </label>
                        <select
                          id="edit_type"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                          {...registerEdit('type', { required: true })}
                        >
                          {BLOCK_TYPE_OPTIONS.map((blockType) => (
                            <option key={blockType} value={blockType}>
                              {blockType}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit_question_text" className="block text-sm text-gray-700">
                          {selectedEditType === 'section_title'
                            ? 'Title Text'
                            : selectedEditType === 'section_intro'
                              ? 'Intro Text'
                              : 'Question Text'}
                        </label>
                        <textarea
                          id="edit_question_text"
                          rows={selectedEditType === 'section_intro' ? 5 : 4}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                          {...registerEdit('question_text', { required: true })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit_helper_text" className="block text-sm text-gray-700">
                          Helper Text
                        </label>
                        <textarea
                          id="edit_helper_text"
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                          {...registerEdit('helper_text')}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input id="edit_required" type="checkbox" {...registerEdit('required')} />
                        <label htmlFor="edit_required" className="text-sm text-gray-700">
                          Required
                        </label>
                      </div>

                      {showEditOptionsField ? (
                        <div className="space-y-1">
                          <label htmlFor="edit_options" className="block text-sm text-gray-700">
                            Options (comma separated)
                          </label>
                          <textarea
                            id="edit_options"
                            rows={3}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                            {...registerEdit('options', { required: true })}
                          />
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={isEditing || editLoadingId === question.id}
                          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {question.type === 'section_title' ? (
                          <h2 className="text-xl font-bold text-gray-900">{question.question_text}</h2>
                        ) : null}

                        {question.type === 'section_intro' ? (
                          <p className="text-sm text-gray-600">{question.question_text}</p>
                        ) : null}

                        {question.type !== 'section_title' && question.type !== 'section_intro' ? (
                          <>
                            <p className="text-sm text-gray-800">{question.question_text}</p>
                            <p className="mt-1 text-xs text-gray-600">
                              Type: {question.type} | Required: {question.required ? 'Yes' : 'No'}
                            </p>
                          </>
                        ) : null}

                        {question.helper_text ? (
                          <p className="mt-1 text-xs text-gray-500">{question.helper_text}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleMove(question.id, 'up');
                          }}
                          disabled={disableMoveUp}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Move Up
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleMove(question.id, 'down');
                          }}
                          disabled={disableMoveDown}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Move Down
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(question)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteQuestion(question.id);
                          }}
                          disabled={isDeleting}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {questions.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">No questions yet.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
