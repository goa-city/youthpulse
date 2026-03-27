import Link from 'next/link';

import { getServerSupabaseClient } from '@/lib/supabase/server';

const quickLinks = [
  {
    href: '/admin/surveys',
    title: 'Survey Management',
    description: 'Create, activate, close, and clone surveys from the existing tools.',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Review survey submissions and export results from the reporting screen.',
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

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-stone-950 px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-300">Control Panel</p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Dashboard</h2>
        <p className="mt-3 max-w-2xl text-sm text-stone-300">
          Signed in{profile?.username ? ` as ${profile.username}` : ''} with role{' '}
          <span className="font-semibold text-white">{profile?.role ?? 'admin'}</span>.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-3xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-stone-300"
          >
            <h3 className="text-lg font-semibold text-stone-950">{link.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{link.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
