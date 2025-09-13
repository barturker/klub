import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Try to fetch all communities without any filters
    const { data: communities, error } = await supabase
      .from('communities')
      .select('*');
    
    if (error) {
      console.error('Error fetching communities:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: 500 });
    }
    
    // Also try with RLS bypassed (if user has permissions)
    const { data: { user } } = await supabase.auth.getUser();
    
    return NextResponse.json({
      count: communities?.length || 0,
      communities: communities || [],
      user: user?.email || 'Not authenticated'
    });
  } catch (error) {
    console.error('Test communities error:', error);
    return NextResponse.json(
      { error: 'Failed to test communities fetch' },
      { status: 500 }
    );
  }
}