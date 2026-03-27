'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase/client';

type LoginFormValues = {
  username: string;
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

    const lookupResponse = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: values.username }),
    });

    const lookupData = (await lookupResponse.json()) as { email?: string; error?: string };

    if (!lookupResponse.ok || !lookupData.email) {
      setErrorMessage(lookupData.error ?? 'Invalid username or password.');
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: lookupData.email,
      password: values.password,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const nextPath =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
    const destination = nextPath && nextPath.startsWith('/admin') ? nextPath : '/admin';

    router.replace(destination);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f5f5f4,_#e7e5e4_45%,_#d6d3d1)] p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-5 rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-xl shadow-stone-300/30 backdrop-blur"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">YouthPulse</p>
          <h1 className="text-2xl font-semibold text-stone-950">Admin Login</h1>
          <p className="text-sm text-stone-600">Sign in to access the survey and analytics tools.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="block text-sm text-stone-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-stone-500"
            {...register('username', { required: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm text-stone-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-stone-500"
            {...register('password', { required: true })}
          />
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
