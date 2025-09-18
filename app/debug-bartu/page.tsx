'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugBartu() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkBartu() {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Get owned communities
      const { data: owned } = await supabase
        .from('communities')
        .select('*')
        .eq('organizer_id', user?.id);

      // Get memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select(`
          *,
          communities (
            id,
            name,
            slug,
            organizer_id
          )
        `)
        .eq('user_id', user?.id);

      // Check Zımbads
      const { data: zimbads } = await supabase
        .from('communities')
        .select('*')
        .or('slug.eq.zimbads,name.ilike.%Zımbads%');

      setData({
        user,
        profile,
        ownedCommunities: owned || [],
        memberships: memberships || [],
        zimbads: zimbads || []
      });
      setLoading(false);
    }

    checkBartu();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-6">Debug: Bartu's Status</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data.profile, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Owned Communities ({data.ownedCommunities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ownedCommunities.map((c: any) => (
            <div key={c.id} className="border-b py-2">
              <strong>{c.name}</strong> ({c.slug})
              <br />
              Privacy: {c.privacy_level || 'public'}
              <br />
              ID: {c.id}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Community Memberships ({data.memberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.memberships.map((m: any) => (
            <div key={m.id} className="border-b py-2">
              <strong>{m.communities?.name}</strong> - Role: {m.role}
              <br />
              Is Owner: {m.communities?.organizer_id === data.user?.id ? 'YES ✅' : 'NO ❌'}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zımbads Community</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data.zimbads, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}