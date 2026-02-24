'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        router.push('/admin/login');
        return;
      }

      if (!['super_admin', 'editor', 'viewer'].includes(data.role)) {
        router.push('/admin/login');
        return;
      }

      setRole(data.role);
    };

    checkUser();
  }, [router]);

  if (!role) return <div>Loading...</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Role: {role}</p>
    </div>
  );
}