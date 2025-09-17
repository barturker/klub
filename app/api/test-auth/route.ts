import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    // Get auth settings (this might not work due to permissions)
    const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/settings';

    return NextResponse.json({
      status: 'connected',
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      profiles_test: { success: !testError, error: testError },
      auth_endpoint: authUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test auth',
      details: error
    }, { status: 500 });
  }
}

// Test signup directly
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('🔍 Test signup endpoint called');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password?.length);

    const supabase = await createClient();

    // Try signup with minimal options
    console.log('🚀 Attempting signup...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log('📦 Direct signup result:', {
      data: data ? {
        user: data.user?.id,
        email: data.user?.email,
        confirmed: data.user?.confirmed_at
      } : null,
      error: error ? {
        message: error.message,
        status: error.status,
        name: error.name
      } : null
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          status: error.status,
          name: error.name,
          code: (error as any).code
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user_id: data.user?.id,
      email: data.user?.email,
      confirmed: data.user?.confirmed_at
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error
    }, { status: 500 });
  }
}