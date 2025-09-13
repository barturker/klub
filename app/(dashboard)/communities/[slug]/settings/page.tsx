import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CommunitySettingsForm } from '@/components/community/CommunitySettingsForm';

export const metadata: Metadata = {
  title: 'Community Settings',
  description: 'Manage your community settings and branding',
};

interface CommunitySettingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CommunitySettingsPage({
  params,
}: CommunitySettingsPageProps) {
  const supabase = await createClient();
  const { slug } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get community details
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !community) {
    notFound();
  }

  // Check if user is authorized to edit settings
  const isOrganizer = community.organizer_id === user.id;
  
  // Check if user is admin
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .single();

  const isAdmin = membership?.role === 'admin';
  const canEditSettings = isOrganizer || isAdmin;

  if (!canEditSettings) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Community Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your community appearance and settings
        </p>
      </div>

      <CommunitySettingsForm community={community} />
    </div>
  );
}