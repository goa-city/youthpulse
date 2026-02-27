'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';

import { supabaseClient } from '@/lib/supabase/client';

type Survey = {
  id: string;
  title: string;
  year: number | null;
};

type QuestionType =
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
  category: string | null;
  question_text: string;
  type: QuestionType;
  options: string[] | null;
  order_index: number;
};

type ResponseRow = {
  id: string;
  submitted_at: string;
};

type AnswerRow = {
  id: string;
  response_id: string;
  question_id: string;
  answer_text?: string | null;
  answer_json: unknown;
};

const CHART_COLORS = ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data: activeSurvey, error: surveyError } = await supabaseClient
        .from('surveys')
        .select('id, title, year')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (surveyError) {
        setErrorMessage(surveyError.message);
        setLoading(false);
        return;
      }

      if (!activeSurvey) {
        setSurvey(null);
        setQuestions([]);
        setResponses([]);
        setAnswers([]);
        setLoading(false);
        return;
      }

      setSurvey(activeSurvey as Survey);

      const { data: questionRows, error: questionError } = await supabaseClient
        .from('questions')
        .select('id, category, question_text, type, options, order_index')
        .eq('survey_id', activeSurvey.id)
        .order('order_index', { ascending: true });

      if (questionError) {
        setErrorMessage(questionError.message);
        setLoading(false);
        return;
      }

      const { data: responseRows, error: responseError } = await supabaseClient
        .from('responses')
        .select('id, submitted_at')
        .eq('survey_id', activeSurvey.id)
        .order('submitted_at', { ascending: false });

      if (responseError) {
        setErrorMessage(responseError.message);
        setLoading(false);
        return;
      }

      const responseIds = (responseRows ?? []).map((row) => row.id);

      let answerRows: AnswerRow[] = [];

      if (responseIds.length > 0) {
        const { data: fetchedAnswers, error: answerError } = await supabaseClient
          .from('answers')
          .select('id, response_id, question_id, answer_json')
          .in('response_id', responseIds);

        if (answerError) {
          setErrorMessage(answerError.message);
          setLoading(false);
          return;
        }

        answerRows = (fetchedAnswers ?? []) as AnswerRow[];
      }

      setQuestions((questionRows ?? []) as Question[]);
      setResponses((responseRows ?? []) as ResponseRow[]);
      setAnswers(answerRows);
      setLoading(false);
    };

    void fetchData();
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => question.type !== 'section_title' && question.type !== 'section_intro');
  }, [questions]);

  const questionsByCategory = useMemo(() => {
    return filteredQuestions.reduce<Record<string, Question[]>>((acc, question) => {
      const category = question.category?.trim() || 'Uncategorized';

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(question);
      return acc;
    }, {});
  }, [filteredQuestions]);

  const categoryOrder = useMemo(() => Object.keys(questionsByCategory), [questionsByCategory]);

  const lastSubmission = useMemo(() => {
    if (responses.length === 0) {
      return null;
    }

    return responses[0].submitted_at;
  }, [responses]);

  const answersByQuestion = useMemo(() => {
    return answers.reduce<Record<string, AnswerRow[]>>((acc, answer) => {
      if (!acc[answer.question_id]) {
        acc[answer.question_id] = [];
      }

      acc[answer.question_id].push(answer);
      return acc;
    }, {});
  }, [answers]);

  const responseMap = useMemo(() => {
    return responses.reduce<Record<string, ResponseRow>>((acc, response) => {
      acc[response.id] = response;
      return acc;
    }, {});
  }, [responses]);

  const formatPercent = (count: number, total: number) => {
    if (!total) {
      return '0%';
    }

    return `${((count / total) * 100).toFixed(1)}%`;
  };

  const chartOption = (labels: string[], values: number[], total: number) => ({
    color: CHART_COLORS,
    animationDuration: 800,
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValue: string; data: number }>) => {
        const item = params?.[0];
        if (!item) {
          return '';
        }

        return `${item.axisValue}<br/>Count: ${item.data}<br/>Percentage: ${formatPercent(item.data, total)}`;
      },
    },
    grid: { left: 56, right: 28, top: 36, bottom: 56 },
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: { alignWithLabel: true },
      axisLabel: { color: '#4B5563' },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#4B5563' },
      splitLine: { lineStyle: { color: '#E5E7EB' } },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 46,
        label: {
          show: true,
          position: 'top',
          color: '#374151',
          fontSize: 12,
          formatter: ({ value }: { value: number }) => `${value}`,
        },
      },
    ],
  });

  const getAnswerString = (value: unknown) => {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  };

  const getMostSelected = (labels: string[], values: number[]) => {
    if (!labels.length || !values.length) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    if (!total) {
      return null;
    }

    let maxIndex = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] > values[maxIndex]) {
        maxIndex = i;
      }
    }

    const selectedLabel = labels[maxIndex];
    const selectedCount = values[maxIndex];

    return `Most selected: ${selectedLabel} (${formatPercent(selectedCount, total)})`;
  };

  const wordInsights = useMemo(() => {
    const stopwords = new Set([
      'the',
      'and',
      'is',
      'a',
      'to',
      'of',
      'in',
      'it',
      'that',
      'for',
      'on',
      'with',
      'as',
      'at',
      'this',
      'be',
      'i',
      'my',
      'me',
      'we',
      'our',
      'you',
    ]);

    const openEndedQuestionIds = new Set(
      filteredQuestions
        .filter((question) => question.type === 'text' || question.type === 'textarea')
        .map((question) => question.id)
    );

    const frequency = new Map<string, number>();

    answers.forEach((answer) => {
      if (!openEndedQuestionIds.has(answer.question_id)) {
        return;
      }

      const rawText = answer.answer_text ?? getAnswerString(answer.answer_json);
      const words = rawText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !stopwords.has(word));

      words.forEach((word) => {
        frequency.set(word, (frequency.get(word) ?? 0) + 1);
      });
    });

    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      words: sorted.map((entry) => entry[0]).reverse(),
      counts: sorted.map((entry) => entry[1]).reverse(),
    };
  }, [answers, filteredQuestions]);

  const wordInsightsChartOption = useMemo(
    () => ({
      animationDuration: 800,
      grid: { left: 120, right: 32, top: 20, bottom: 24 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#4B5563' },
        splitLine: { lineStyle: { color: '#E5E7EB' } },
      },
      yAxis: {
        type: 'category',
        data: wordInsights.words,
        axisLabel: { color: '#374151' },
      },
      series: [
        {
          type: 'bar',
          data: wordInsights.counts,
          itemStyle: { color: '#374151' },
          barMaxWidth: 22,
        },
      ],
    }),
    [wordInsights]
  );

  const escapeCsvValue = (value: string) => {
    if (value === null || value === undefined) {
      return '';
    }

    const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const needsQuotes = /[",\n]/.test(normalized);
    const escaped = normalized.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExportCsv = async () => {
    if (!survey || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const { data: activeSurvey, error: surveyError } = await supabaseClient
        .from('surveys')
        .select('id, year')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (surveyError || !activeSurvey) {
        console.error('Export survey fetch error:', surveyError);
        return;
      }

      const { data: exportQuestions, error: questionsError } = await supabaseClient
        .from('questions')
        .select('id, question_text, type, order_index')
        .eq('survey_id', activeSurvey.id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Export questions fetch error:', questionsError);
        return;
      }

      const filteredExportQuestions = (exportQuestions ?? []).filter(
        (question) => question.type !== 'section_title' && question.type !== 'section_intro'
      );

      const { data: exportResponses, error: responsesError } = await supabaseClient
        .from('responses')
        .select('id, submitted_at')
        .eq('survey_id', activeSurvey.id)
        .order('submitted_at', { ascending: true });

      if (responsesError) {
        console.error('Export responses fetch error:', responsesError);
        return;
      }

      const responseIds = (exportResponses ?? []).map((response) => response.id);

      let exportAnswers: Array<{
        response_id: string;
        question_id: string;
        answer_text?: string | null;
        answer_json: unknown;
      }> = [];

      if (responseIds.length > 0) {
        const { data: fetchedAnswersWithText, error: answersWithTextError } = await supabaseClient
          .from('answers')
          .select('response_id, question_id, answer_text, answer_json')
          .in('response_id', responseIds);

        if (answersWithTextError) {
          const { data: fetchedAnswers, error: answersError } = await supabaseClient
            .from('answers')
            .select('response_id, question_id, answer_json')
            .in('response_id', responseIds);

          if (answersError) {
            console.error('Export answers fetch error:', answersError);
            return;
          }

          exportAnswers = fetchedAnswers ?? [];
        } else {
          exportAnswers = fetchedAnswersWithText ?? [];
        }
      }

      const answerMap = exportAnswers.reduce<Record<string, { answer_text?: string | null; answer_json: unknown }>>(
        (acc, answer) => {
          acc[`${answer.response_id}:${answer.question_id}`] = {
            answer_text: answer.answer_text ?? null,
            answer_json: answer.answer_json,
          };
          return acc;
        },
        {}
      );

      const headers = ['response_id', 'submitted_at', ...filteredExportQuestions.map((question) => question.question_text)];
      const csvRows: string[] = [headers.map(escapeCsvValue).join(',')];

      (exportResponses ?? []).forEach((response) => {
        const rowValues = [response.id, response.submitted_at];

        filteredExportQuestions.forEach((question) => {
          const value = answerMap[`${response.id}:${question.id}`];
          const answerValue =
            value && typeof value === 'object' && 'answer_text' in (value as Record<string, unknown>)
              ? (value as { answer_text?: string | null; answer_json: unknown })
              : ({ answer_text: null, answer_json: value } as { answer_text?: string | null; answer_json: unknown });

          if (answerValue.answer_text) {
            rowValues.push(answerValue.answer_text);
            return;
          }

          if (Array.isArray(answerValue.answer_json)) {
            rowValues.push(answerValue.answer_json.map(String).join(', '));
            return;
          }

          rowValues.push(
            answerValue.answer_json === null || answerValue.answer_json === undefined
              ? ''
              : String(answerValue.answer_json)
          );
        });

        csvRows.push(rowValues.map((value) => escapeCsvValue(String(value))).join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const exportYear = activeSurvey.year ?? new Date().getFullYear();

      link.href = url;
      link.download = `youthpulse_${exportYear}_full_dataset.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!survey || isExportingExcel) {
      return;
    }

    setIsExportingExcel(true);

    try {
      const { data: activeSurvey, error: surveyError } = await supabaseClient
        .from('surveys')
        .select('id, year')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (surveyError || !activeSurvey) {
        console.error('Excel export survey fetch error:', surveyError);
        return;
      }

      const { data: exportQuestions, error: questionsError } = await supabaseClient
        .from('questions')
        .select('id, question_text, type, order_index')
        .eq('survey_id', activeSurvey.id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Excel export questions fetch error:', questionsError);
        return;
      }

      const filteredExportQuestions = (exportQuestions ?? []).filter(
        (question) => question.type !== 'section_title' && question.type !== 'section_intro'
      );

      const { data: exportResponses, error: responsesError } = await supabaseClient
        .from('responses')
        .select('id, submitted_at')
        .eq('survey_id', activeSurvey.id)
        .order('submitted_at', { ascending: true });

      if (responsesError) {
        console.error('Excel export responses fetch error:', responsesError);
        return;
      }

      const responseIds = (exportResponses ?? []).map((response) => response.id);

      let exportAnswers: Array<{
        response_id: string;
        question_id: string;
        answer_text?: string | null;
        answer_json: unknown;
      }> = [];

      if (responseIds.length > 0) {
        const { data: fetchedAnswersWithText, error: answersWithTextError } = await supabaseClient
          .from('answers')
          .select('response_id, question_id, answer_text, answer_json')
          .in('response_id', responseIds);

        if (answersWithTextError) {
          const { data: fetchedAnswers, error: answersError } = await supabaseClient
            .from('answers')
            .select('response_id, question_id, answer_json')
            .in('response_id', responseIds);

          if (answersError) {
            console.error('Excel export answers fetch error:', answersError);
            return;
          }

          exportAnswers = fetchedAnswers ?? [];
        } else {
          exportAnswers = fetchedAnswersWithText ?? [];
        }
      }

      const answerMap = exportAnswers.reduce<Record<string, { answer_text?: string | null; answer_json: unknown }>>(
        (acc, answer) => {
          acc[`${answer.response_id}:${answer.question_id}`] = {
            answer_text: answer.answer_text ?? null,
            answer_json: answer.answer_json,
          };
          return acc;
        },
        {}
      );

      const fullDatasetRows = (exportResponses ?? []).map((response) => {
        const row: Record<string, string> = {
          response_id: response.id,
          submitted_at: response.submitted_at,
        };

        filteredExportQuestions.forEach((question) => {
          const answerValue = answerMap[`${response.id}:${question.id}`];

          if (answerValue?.answer_text) {
            row[question.question_text] = answerValue.answer_text;
            return;
          }

          if (Array.isArray(answerValue?.answer_json)) {
            row[question.question_text] = answerValue.answer_json.map(String).join(', ');
            return;
          }

          row[question.question_text] =
            answerValue?.answer_json === null || answerValue?.answer_json === undefined
              ? ''
              : String(answerValue.answer_json);
        });

        return row;
      });

      const exportAnswersByQuestion = exportAnswers.reduce<
        Record<string, Array<{ response_id: string; question_id: string; answer_text?: string | null; answer_json: unknown }>>
      >((acc, answer) => {
        if (!acc[answer.question_id]) {
          acc[answer.question_id] = [];
        }
        acc[answer.question_id].push(answer);
        return acc;
      }, {});

      const aggregatedSummaryRows: Array<{
        Question: string;
        Option: string;
        Count: number;
        Percentage: string;
      }> = [];

      filteredExportQuestions.forEach((question) => {
        if (question.type !== 'radio' && question.type !== 'checkbox' && question.type !== 'scale' && question.type !== 'yes_no') {
          return;
        }

        const questionAnswers = exportAnswersByQuestion[question.id] ?? [];
        const counts = new Map<string, number>();

        if (question.type === 'scale') {
          ['1', '2', '3', '4', '5'].forEach((label) => counts.set(label, 0));
          questionAnswers.forEach((answer) => {
            const key = String(answer.answer_json);
            if (counts.has(key)) {
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          });
        } else if (question.type === 'checkbox') {
          questionAnswers.forEach((answer) => {
            if (!Array.isArray(answer.answer_json)) {
              return;
            }
            answer.answer_json.forEach((value) => {
              const key = String(value);
              counts.set(key, (counts.get(key) ?? 0) + 1);
            });
          });
        } else {
          if (question.type === 'yes_no') {
            counts.set('Yes', 0);
            counts.set('No', 0);
          }
          questionAnswers.forEach((answer) => {
            const value = answer.answer_text ?? (answer.answer_json === null || answer.answer_json === undefined ? '' : String(answer.answer_json));
            if (!value) {
              return;
            }
            counts.set(value, (counts.get(value) ?? 0) + 1);
          });
        }

        const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

        Array.from(counts.entries()).forEach(([option, count]) => {
          aggregatedSummaryRows.push({
            Question: question.question_text,
            Option: option,
            Count: count,
            Percentage: total ? `${((count / total) * 100).toFixed(1)}%` : '0%',
          });
        });
      });

      const responseLookup = (exportResponses ?? []).reduce<Record<string, string>>((acc, response) => {
        acc[response.id] = response.submitted_at;
        return acc;
      }, {});

      const openResponseRows: Array<{
        Question: string;
        Response: string;
        'Submitted At': string;
      }> = [];

      filteredExportQuestions.forEach((question) => {
        if (question.type !== 'text' && question.type !== 'textarea') {
          return;
        }

        const questionAnswers = exportAnswersByQuestion[question.id] ?? [];
        questionAnswers.forEach((answer) => {
          const value = answer.answer_text ?? (answer.answer_json === null || answer.answer_json === undefined ? '' : String(answer.answer_json));
          openResponseRows.push({
            Question: question.question_text,
            Response: value,
            'Submitted At': responseLookup[answer.response_id] ?? '',
          });
        });
      });

      const workbook = XLSX.utils.book_new();
      const fullDatasetSheet = XLSX.utils.json_to_sheet(fullDatasetRows);
      const aggregatedSheet = XLSX.utils.json_to_sheet(aggregatedSummaryRows);
      const openResponsesSheet = XLSX.utils.json_to_sheet(openResponseRows);

      XLSX.utils.book_append_sheet(workbook, fullDatasetSheet, 'Full Dataset');
      XLSX.utils.book_append_sheet(workbook, aggregatedSheet, 'Aggregated Summary');
      XLSX.utils.book_append_sheet(workbook, openResponsesSheet, 'Open Responses');

      const exportYear = activeSurvey.year ?? new Date().getFullYear();
      XLSX.writeFile(workbook, `youthpulse_${exportYear}_report.xlsx`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-600">Loading analytics...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="p-6">
        <p className="text-sm text-red-600">{errorMessage}</p>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-3 text-sm text-gray-600">No active survey found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-8 p-6">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            void handleExportExcel();
          }}
          disabled={isExportingExcel}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleExportCsv();
          }}
          disabled={isExporting}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Export Full Dataset (CSV)'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">Survey Title</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{survey.title}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">Survey Year</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{survey.year ?? 'N/A'}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">Total Responses</p>
          <p className="mt-2 text-4xl font-semibold text-gray-900">{responses.length}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">Total Questions</p>
          <p className="mt-2 text-4xl font-semibold text-gray-900">{filteredQuestions.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-600">Last Submission</p>
        <p className="mt-2 text-base font-medium text-gray-900">
          {lastSubmission
            ? new Date(lastSubmission).toLocaleString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'No submissions yet'}
        </p>
      </div>

      {categoryOrder.map((category) => (
        <section key={category}>
          <h2 className="mb-6 mt-12 text-2xl font-semibold text-gray-900">{category}</h2>

          <div className="space-y-5">
            {questionsByCategory[category].map((question) => {
              const questionAnswers = answersByQuestion[question.id] ?? [];

              if (question.type === 'radio' || question.type === 'yes_no') {
                const initialLabels =
                  question.type === 'yes_no'
                    ? ['Yes', 'No']
                    : Array.isArray(question.options)
                      ? [...question.options]
                      : [];

                const counts = new Map<string, number>();
                initialLabels.forEach((label) => counts.set(label, 0));

                questionAnswers.forEach((answer) => {
                  const value = getAnswerString(answer.answer_json);
                  if (!value) {
                    return;
                  }

                  counts.set(value, (counts.get(value) ?? 0) + 1);
                });

                const labels = Array.from(counts.keys());
                const values = labels.map((label) => counts.get(label) ?? 0);
                const total = values.reduce((sum, value) => sum + value, 0);
                const mostSelected = getMostSelected(labels, values);

                return (
                  <section key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-gray-900">{question.question_text}</h3>
                    <div className="mt-4 h-80 w-full">
                      <ReactECharts option={chartOption(labels, values, total)} style={{ height: '100%', width: '100%' }} />
                    </div>
                    {mostSelected ? <p className="mt-2 text-sm text-neutral-600">{mostSelected}</p> : null}
                  </section>
                );
              }

              if (question.type === 'checkbox') {
                const counts = new Map<string, number>();
                (question.options ?? []).forEach((option) => counts.set(option, 0));

                questionAnswers.forEach((answer) => {
                  if (!Array.isArray(answer.answer_json)) {
                    return;
                  }

                  answer.answer_json.forEach((value) => {
                    const key = String(value);
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                  });
                });

                const labels = Array.from(counts.keys());
                const values = labels.map((label) => counts.get(label) ?? 0);
                const total = values.reduce((sum, value) => sum + value, 0);
                const mostSelected = getMostSelected(labels, values);

                return (
                  <section key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-gray-900">{question.question_text}</h3>
                    <div className="mt-4 h-80 w-full">
                      <ReactECharts option={chartOption(labels, values, total)} style={{ height: '100%', width: '100%' }} />
                    </div>
                    {mostSelected ? <p className="mt-2 text-sm text-neutral-600">{mostSelected}</p> : null}
                  </section>
                );
              }

              if (question.type === 'scale') {
                const counts = new Map<string, number>([
                  ['1', 0],
                  ['2', 0],
                  ['3', 0],
                  ['4', 0],
                  ['5', 0],
                ]);

                questionAnswers.forEach((answer) => {
                  const key = String(answer.answer_json);
                  if (counts.has(key)) {
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                  }
                });

                const labels = ['1', '2', '3', '4', '5'];
                const values = labels.map((label) => counts.get(label) ?? 0);
                const total = values.reduce((sum, value) => sum + value, 0);
                const mostSelected = getMostSelected(labels, values);

                return (
                  <section key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-gray-900">{question.question_text}</h3>
                    <div className="mt-4 h-80 w-full">
                      <ReactECharts option={chartOption(labels, values, total)} style={{ height: '100%', width: '100%' }} />
                    </div>
                    {mostSelected ? <p className="mt-2 text-sm text-neutral-600">{mostSelected}</p> : null}
                  </section>
                );
              }

              if (question.type === 'text' || question.type === 'textarea') {
                const latestAnswers = questionAnswers
                  .map((answer) => ({
                    answer,
                    submittedAt: responseMap[answer.response_id]?.submitted_at ?? '',
                  }))
                  .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                  .slice(0, 15);

                return (
                  <section key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-gray-900">{question.question_text}</h3>
                    <p className="mt-3 text-sm text-gray-600">Total responses: {questionAnswers.length}</p>
                    <div className="mt-4 space-y-3">
                      {latestAnswers.length === 0 ? (
                        <p className="text-sm text-gray-500">No text responses yet.</p>
                      ) : (
                        latestAnswers.map((entry) => (
                          <article key={entry.answer.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                            <p className="text-sm text-gray-800">{getAnswerString(entry.answer.answer_json)}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              {entry.submittedAt
                                ? new Date(entry.submittedAt).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : 'Unknown date'}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                );
              }

              return null;
            })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-6 mt-16 text-2xl font-semibold text-gray-900">Open-Ended Word Insights</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {wordInsights.words.length > 0 ? (
            <div className="h-[400px] w-full">
              <ReactECharts option={wordInsightsChartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No open-ended responses available.</p>
          )}
        </div>
      </section>
    </main>
  );
}
