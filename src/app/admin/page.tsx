import Link from 'next/link';

import { getServerSupabaseClient } from '@/lib/supabase/server';

const quickLinks = [
  {
    href: '/admin/surveys',
    title: 'Surveys',
    description: 'Create, activate, close, and clone surveys.',
  },
  {
    href: '/admin/reports',
    title: 'Reports',
    description: 'Review submission reporting totals and jump into exports.',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Inspect charts, answer trends, and detailed response breakdowns.',
  },
];

export default async function AdminPage() {
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('role, username').eq('id', user.id).maybeSingle()
    : { data: null };

  const [
    { count: submissionsCount },
    { count: surveysCount },
    { data: activeSurvey },
    { data: latestResponse },
  ] = await Promise.all([
    supabase.from('responses').select('*', { count: 'exact', head: true }),
    supabase.from('surveys').select('*', { count: 'exact', head: true }),
    supabase.from('surveys').select('title, year').eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('responses').select('submitted_at').order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const statCards = [
    {
      label: 'Total submissions',
      value: String(submissionsCount ?? 0),
      detail: latestResponse?.submitted_at
        ? `Last submission ${new Date(latestResponse.submitted_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`
        : 'No submissions yet',
    },
    {
      label: 'Surveys created',
      value: String(surveysCount ?? 0),
      detail: activeSurvey ? `Active: ${activeSurvey.title}` : 'No active survey',
    },
    {
      label: 'Admin role',
      value: profile?.role ?? 'admin',
      detail: profile?.username ? `Signed in as ${profile.username}` : 'Signed in',
    },
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] bg-stone-950 px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-300">Control Panel</p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Dashboard</h2>
        <p className="mt-3 max-w-2xl text-sm text-stone-300">
          Track submission volume, move between admin tools quickly, and keep the current survey workflow in one
          place.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <article key={card.label} className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold text-stone-950">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[1.75rem] border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-stone-300"
          >
            <h3 className="text-lg font-semibold text-stone-950">{link.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{link.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
