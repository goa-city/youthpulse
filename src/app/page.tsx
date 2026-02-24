'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { supabaseClient } from '@/lib/supabase/client';

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

type Survey = {
  id: string;
  title: string;
};

type Question = {
  id: string;
  category: string | null;
  question_text: string;
  helper_text: string | null;
  type: BlockType;
  options: string[] | null;
  order_index: number;
};

type AnswerValue = string | number | string[];
type Answers = Record<string, AnswerValue>;

export default function HomePage() {
  const isDev = process.env.NODE_ENV === 'development';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [hasActiveSurvey, setHasActiveSurvey] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (typeof window !== 'undefined' && localStorage.getItem('youthpulse_submitted')) {
        setIsCompleted(true);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: surveyData } = await supabaseClient
        .from('surveys')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!surveyData) {
        setHasActiveSurvey(false);
        setSurvey(null);
        setQuestions([]);
        setLoading(false);
        return;
      }

      setHasActiveSurvey(true);
      setSurvey({ id: surveyData.id, title: surveyData.title } as Survey);

      const { data: questionData } = await supabaseClient
        .from('questions')
        .select('id, category, question_text, helper_text, type, options, order_index')
        .eq('survey_id', surveyData.id)
        .order('order_index', { ascending: true });

      setQuestions((questionData ?? []) as Question[]);
      setCurrentIndex(0);
      setLoading(false);
    };

    void fetchSurvey();
  }, []);

  const totalBlocks = questions.length;
  const currentBlock = questions[currentIndex] ?? null;
  const progressPercent = useMemo(() => {
    if (totalBlocks === 0) {
      return 0;
    }

    return ((currentIndex + 1) / totalBlocks) * 100;
  }, [currentIndex, totalBlocks]);

  const setCurrentBlockAnswer = (value: AnswerValue) => {
    if (!currentBlock) {
      return;
    }

    setAnswers({
      ...answers,
      [currentBlock.id]: value,
    });
  };

  const toggleCheckbox = (questionId: string, option: string) => {
    const current = answers[questionId];
    const currentValues = Array.isArray(current) ? current : [];

    if (currentValues.includes(option)) {
      setCurrentBlockAnswer(currentValues.filter((item) => item !== option));
      return;
    }

    setCurrentBlockAnswer([...currentValues, option]);
  };

  const handleNext = () => {
    if (isCompleted) {
      return;
    }

    if (currentIndex < totalBlocks - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (isCompleted) {
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (answersToSubmit?: Answers) => {
    if (!survey?.id || isSubmitting || isCompleted) {
      return null;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const { data: responseData, error: responseError } = await supabaseClient
        .from('responses')
        .insert([
          {
            survey_id: survey.id,
            submitted_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (responseError) {
        console.error('Response insert error:', responseError);
        setSubmissionError('Failed to create response.');
        return null;
      }

      console.log('Response created:', responseData);
      const responseId = responseData.id;
      const finalAnswers = answersToSubmit ?? answers;

      const answerRows = Object.entries(finalAnswers).map(([questionId, value]) => {
        const question = questions.find((item) => item.id === questionId);
        const shouldUseJson = question?.type === 'checkbox' || question?.type === 'scale';

        return {
          response_id: responseId,
          question_id: questionId,
          answer_text: shouldUseJson ? null : String(value),
          answer_json: shouldUseJson ? value : null,
        };
      });

      if (answerRows.length > 0) {
        const { data: answersData, error: answersError } = await supabaseClient
          .from('answers')
          .insert(answerRows)
          .select();

        if (answersError) {
          console.error('Answers insert error:', answersError);
          console.error('Answers insert error detail:', JSON.stringify(answersError, null, 2));
          setSubmissionError('Failed to save answers.');
          return null;
        }

        console.log('Answer rows inserted:', answersData?.length);
      }

      console.log('Answers inserted:', answerRows.length);
      if (typeof window !== 'undefined') {
        localStorage.setItem('youthpulse_submitted', 'true');
      }
      setIsCompleted(true);
      return { responseId, answerRowsInserted: answerRows.length };
    } catch (error) {
      console.error('Failed to submit survey response', error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoTestSubmission = async () => {
    if (!isDev || !survey || isSubmitting || isCompleted) {
      return;
    }

    console.log('Running automated submission test...');

    const generatedAnswers: Answers = {};

    for (const question of questions) {
      if (question.type === 'section_title' || question.type === 'section_intro') {
        continue;
      }

      if (question.type === 'text' || question.type === 'textarea') {
        generatedAnswers[question.id] = 'Test answer';
        continue;
      }

      if (question.type === 'number') {
        generatedAnswers[question.id] = 1;
        continue;
      }

      if (question.type === 'radio') {
        generatedAnswers[question.id] = Array.isArray(question.options) && question.options.length > 0 ? question.options[0] : '';
        continue;
      }

      if (question.type === 'checkbox') {
        generatedAnswers[question.id] =
          Array.isArray(question.options) && question.options.length > 0 ? [question.options[0]] : [];
        continue;
      }

      if (question.type === 'scale') {
        generatedAnswers[question.id] = 3;
        continue;
      }

      if (question.type === 'yes_no') {
        generatedAnswers[question.id] = 'Yes';
      }
    }

    setAnswers(generatedAnswers);
    console.log('Generated answers:', generatedAnswers);

    const submissionResult = await handleSubmit(generatedAnswers);

    if (!submissionResult) {
      return;
    }

    console.log('TEST SUCCESS — Response created');
    console.log('Answer rows inserted:', submissionResult.answerRowsInserted);

    const { count } = await supabaseClient
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('response_id', submissionResult.responseId);

    console.log('Answers count for response:', count ?? 0);
  };

  const inputClassName =
    'w-full rounded-xl border border-neutral-300 bg-white px-5 py-4 text-base text-neutral-800 outline-none transition focus:ring-2 focus:ring-neutral-800';

  const renderBlockInput = () => {
    if (!currentBlock) {
      return null;
    }

    if (currentBlock.type === 'section_title') {
      return <h1 className="text-center text-4xl font-semibold leading-tight text-neutral-800">{currentBlock.question_text}</h1>;
    }

    if (currentBlock.type === 'section_intro') {
      return <p className="mx-auto max-w-2xl text-center text-base font-light text-neutral-500">{currentBlock.question_text}</p>;
    }

    if (currentBlock.type === 'text') {
      return (
        <input
          type="text"
          value={typeof answers[currentBlock.id] === 'string' ? (answers[currentBlock.id] as string) : ''}
          onChange={(event) => setCurrentBlockAnswer(event.target.value)}
          className={inputClassName}
        />
      );
    }

    if (currentBlock.type === 'textarea') {
      return (
        <textarea
          rows={6}
          value={typeof answers[currentBlock.id] === 'string' ? (answers[currentBlock.id] as string) : ''}
          onChange={(event) => setCurrentBlockAnswer(event.target.value)}
          className={inputClassName}
        />
      );
    }

    if (currentBlock.type === 'number') {
      return (
        <input
          type="number"
          value={typeof answers[currentBlock.id] === 'number' ? String(answers[currentBlock.id]) : ''}
          onChange={(event) => setCurrentBlockAnswer(Number(event.target.value))}
          className={inputClassName}
        />
      );
    }

    if (currentBlock.type === 'radio' || currentBlock.type === 'yes_no') {
      const options =
        currentBlock.type === 'yes_no' ? ['Yes', 'No'] : Array.isArray(currentBlock.options) ? currentBlock.options : [];

      return (
        <div className="space-y-3">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 bg-white px-5 py-4 text-base text-neutral-700 transition hover:border-neutral-400"
            >
              <input
                type="radio"
                name={currentBlock.id}
                checked={answers[currentBlock.id] === option}
                onChange={() => setCurrentBlockAnswer(option)}
                className="h-4 w-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (currentBlock.type === 'checkbox') {
      const selectedValues = Array.isArray(answers[currentBlock.id]) ? (answers[currentBlock.id] as string[]) : [];
      const options = Array.isArray(currentBlock.options) ? currentBlock.options : [];

      return (
        <div className="space-y-3">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 bg-white px-5 py-4 text-base text-neutral-700 transition hover:border-neutral-400"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => toggleCheckbox(currentBlock.id, option)}
                className="h-4 w-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (currentBlock.type === 'scale') {
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = answers[currentBlock.id] === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setCurrentBlockAnswer(value)}
                className={`h-14 w-14 rounded-xl border text-base font-medium transition ${
                  selected
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f1e9] to-[#f2f3f5] px-6">
        <p className="text-sm text-neutral-600">Loading survey...</p>
      </main>
    );
  }

  if (!hasActiveSurvey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f1e9] to-[#f2f3f5] px-6">
        <p className="text-center text-xl text-neutral-700">No active survey available.</p>
      </main>
    );
  }

  if (totalBlocks === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f1e9] to-[#f2f3f5] px-6">
        <p className="text-center text-xl text-neutral-700">No survey blocks found.</p>
      </main>
    );
  }

  if (isCompleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f1e9] to-[#f2f3f5] px-6">
        <p className="text-center text-2xl font-medium text-neutral-800">Thank you for your response.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f6f1e9] to-[#f2f3f5] py-20">
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="mb-14 h-[2px] w-full overflow-hidden rounded-full bg-neutral-300/70">
          <div
            className="h-full bg-neutral-900 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentBlock?.id ?? 'block'}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            {currentBlock?.category ? (
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{currentBlock.category}</p>
            ) : null}

            {currentBlock?.type !== 'section_title' && currentBlock?.type !== 'section_intro' ? (
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-neutral-800">{currentBlock?.question_text}</h1>
                {currentBlock?.helper_text ? (
                  <p className="mt-3 text-base font-light text-neutral-500">{currentBlock.helper_text}</p>
                ) : null}
              </div>
            ) : null}

            {renderBlockInput()}
          </motion.div>
        </AnimatePresence>

        <div className="mt-16 flex items-end justify-between">
          {submissionError ? <p className="mb-3 text-sm text-red-600">{submissionError}</p> : null}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            {currentIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="h-10 w-10 rounded-lg border border-neutral-300 bg-white text-lg text-neutral-700 transition hover:bg-neutral-100"
                aria-label="Back"
              >
                {'<'}
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
            <p className="text-sm text-neutral-600">
              {currentIndex + 1} / {totalBlocks}
            </p>
          </div>

          {currentIndex < totalBlocks - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
        {isDev ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void handleAutoTestSubmission();
              }}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
            >
              Auto Test Submission
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
