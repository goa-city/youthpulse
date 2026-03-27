import Link from 'next/link';

import { getServerSupabaseClient } from '@/lib/supabase/server';

const reportTools = [
  {
    title: 'Analytics Explorer',
    description: 'Open full charts, question breakdowns, and answer-level analysis for the active survey.',
    href: '/admin/analytics',
    action: 'Open analytics',
  },
  {
    title: 'Survey Library',
    description: 'Review existing surveys before exporting or comparing submission trends.',
    href: '/admin/surveys',
    action: 'View surveys',
  },
];

export default async function AdminReportsPage() {
  const supabase = await getServerSupabaseClient();

  const [{ count: submissionsCount }, { data: activeSurvey }, { data: latestResponse }] = await Promise.all([
    supabase.from('responses').select('*', { count: 'exact', head: true }),
    supabase.from('surveys').select('id, title, year').eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('responses').select('submitted_at').order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const lastSubmissionLabel = latestResponse?.submitted_at
    ? new Date(latestResponse.submitted_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'No submissions yet';

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] bg-stone-950 px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-300">Reports</p>
        <h2 className="mt-3 text-3xl font-semibold">Submission Reporting</h2>
        <p className="mt-3 max-w-2xl text-sm text-stone-300">
          Use this area to review current reporting totals before exporting full analytics.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Total submissions</p>
          <p className="mt-3 text-4xl font-semibold text-stone-950">{submissionsCount ?? 0}</p>
        </article>

        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Active survey</p>
          <p className="mt-3 text-lg font-semibold text-stone-950">
            {activeSurvey ? `${activeSurvey.title} (${activeSurvey.year ?? 'Current'})` : 'No active survey'}
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Latest submission</p>
          <p className="mt-3 text-lg font-semibold text-stone-950">{lastSubmissionLabel}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {reportTools.map((tool) => (
          <article key={tool.href} className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
            <h3 className="text-xl font-semibold text-stone-950">{tool.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{tool.description}</p>
            <Link
              href={tool.href}
              className="mt-5 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              {tool.action}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
