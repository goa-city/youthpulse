'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase/client';

type LoginFormValues = {
  email: string;
  password: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push('/admin');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Admin Login</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('email', { required: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            {...register('password', { required: true })}
          />
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
