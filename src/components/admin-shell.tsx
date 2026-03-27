'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/surveys', label: 'Surveys' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabaseClient.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-stone-200 bg-white lg:min-h-screen lg:w-72 lg:border-r lg:border-b-0">
          <div className="flex h-full flex-col px-6 py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">YouthPulse</p>
              <h1 className="mt-3 text-2xl font-semibold text-stone-950">Admin Area</h1>
              <p className="mt-2 text-sm text-stone-600">
                Manage surveys, review analytics, and access the existing admin tools.
              </p>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className="mt-6 rounded-xl border border-stone-300 px-4 py-3 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </aside>

        <div className="flex-1 p-4 sm:p-6 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
