import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CommunityCreateForm } from '@/components/community/CommunityCreateForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Create Community',
  description: 'Create a new community on Klub',
};

export default async function CreateCommunityPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Community</CardTitle>
          <CardDescription>
            Build your community and connect with like-minded people.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunityCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}