'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase/client';

type CreateSurveyFormValues = {
  title: string;
  description: string;
  year: number;
  region: string;
};

const generateSlug = (title: string, year: number) => {
  return `${title}-${year}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export default function CreateSurveyPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateSurveyFormValues>();

  const onSubmit = async (values: CreateSurveyFormValues) => {
    setErrorMessage(null);
    const slug = generateSlug(values.title, values.year);

    const { error } = await supabaseClient.from('surveys').insert({
      title: values.title,
      description: values.description,
      year: values.year,
      region: values.region,
      slug,
      status: 'draft',
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push('/admin/surveys');
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Create Survey</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm text-gray-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('title', { required: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={5}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('description', { required: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="year" className="block text-sm text-gray-700">
            Year
          </label>
          <input
            id="year"
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('year', { required: true, valueAsNumber: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="region" className="block text-sm text-gray-700">
            Region
          </label>
          <input
            id="region"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('region', { required: true })}
          />
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create Survey'}
        </button>
      </form>
    </main>
  );
}
