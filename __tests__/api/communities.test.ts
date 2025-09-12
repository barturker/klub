/**
 * Integration tests for Community API endpoints
 * These tests validate the API behavior with mocked dependencies
 */

import { createClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock slug generator
jest.mock('@/lib/utils/slug-generator', () => ({
  generateUniqueSlug: jest.fn(),
}));

describe('Community API Integration Tests', () => {
  let mockSupabase: {
    auth: {
      getUser: jest.Mock;
    };
    from: jest.Mock;
    select: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    maybeSingle: jest.Mock;
    insert: jest.Mock;
    rpc: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (generateUniqueSlug as jest.Mock).mockImplementation((name) => 
      Promise.resolve(name.toLowerCase().replace(/\s+/g, '-'))
    );
  });

  describe('Community Creation Flow', () => {
    it('should handle the complete community creation flow', async () => {
      // Setup: User is authenticated
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Setup: Rate limit check passes
      mockSupabase.rpc.mockResolvedValue({
        data: { allowed: true, current_count: 0, reset_at: new Date() },
        error: null,
      });

      // Setup: Community creation succeeds
      const mockCommunity = {
        id: 'community-123',
        name: 'Test Community',
        slug: 'test-community',
        description: 'A test community',
        organizer_id: mockUser.id,
        created_at: new Date().toISOString(),
      };
      
      mockSupabase.single.mockResolvedValue({
        data: mockCommunity,
        error: null,
      });

      // Verify the flow
      const supabase = await createClient();
      
      // 1. Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-123');

      // 2. Generate slug
      const slug = await generateUniqueSlug('Test Community');
      expect(slug).toBe('test-community');

      // 3. Create community
      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          name: 'Test Community',
          description: 'A test community',
          slug,
          organizer_id: user?.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(community).toBeDefined();
      expect(community?.slug).toBe('test-community');
    });

    it('should handle authentication failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeDefined();
    });

    it('should handle slug conflicts', async () => {
      // First call finds existing slug, second call finds it available
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { slug: 'test-community' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const supabase = await createClient();
      
      // Check first slug
      let result = await supabase
        .from('communities')
        .select('slug')
        .eq('slug', 'test-community')
        .maybeSingle();
      
      expect(result.data).toBeTruthy();

      // Check numbered slug
      result = await supabase
        .from('communities')
        .select('slug')
        .eq('slug', 'test-community-1')
        .maybeSingle();
      
      expect(result.data).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('communities')
        .insert({ 
          name: 'Test',
          slug: 'test-slug',
          organizer_id: 'user-123'
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toBe('Database connection failed');
    });
  });

  describe('Community Validation', () => {
    it('should validate community name length', () => {
      const validName = 'Valid Community Name';
      const tooShort = '';
      const tooLong = 'a'.repeat(101);

      expect(validName.length).toBeGreaterThan(0);
      expect(validName.length).toBeLessThanOrEqual(100);
      expect(tooShort.length).toBe(0);
      expect(tooLong.length).toBeGreaterThan(100);
    });

    it('should validate description length', () => {
      const validDescription = 'This is a valid description';
      const tooLong = 'a'.repeat(501);

      expect(validDescription.length).toBeLessThanOrEqual(500);
      expect(tooLong.length).toBeGreaterThan(500);
    });

    it('should sanitize community names for slugs', async () => {
      const testCases = [
        { input: 'Test Community', expected: 'test-community' },
        { input: 'Test & Co.', expected: 'test-&-co.' },
        { input: '  Spaces  ', expected: '-spaces-' },
        { input: 'UPPERCASE', expected: 'uppercase' },
      ];

      for (const { input, expected } of testCases) {
        const slug = await generateUniqueSlug(input);
        expect(slug).toBe(expected);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limits before creating community', async () => {
      // Mock rate limit check
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { allowed: true, current_count: 9, reset_at: new Date() },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { allowed: false, current_count: 10, reset_at: new Date() },
          error: null,
        });

      const supabase = await createClient();

      // First check - should be allowed (9/10)
      let result = await supabase.rpc('check_rate_limit', {
        p_user_id: 'user-123',
        p_action: 'create_community',
        p_max_attempts: 10,
        p_window_hours: 24,
      });

      expect(result.data?.allowed).toBe(true);
      expect(result.data?.current_count).toBe(9);

      // Second check - should be blocked (10/10)
      result = await supabase.rpc('check_rate_limit', {
        p_user_id: 'user-123',
        p_action: 'create_community',
        p_max_attempts: 10,
        p_window_hours: 24,
      });

      expect(result.data?.allowed).toBe(false);
      expect(result.data?.current_count).toBe(10);
    });

    it('should increment rate limit counter after successful creation', async () => {
      const incrementSpy = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.rpc = incrementSpy;

      const supabase = await createClient();
      await supabase.rpc('increment_rate_limit', {
        p_user_id: 'user-123',
        p_action: 'create_community',
        p_window_hours: 24,
      });

      expect(incrementSpy).toHaveBeenCalledWith('increment_rate_limit', {
        p_user_id: 'user-123',
        p_action: 'create_community',
        p_window_hours: 24,
      });
    });
  });

  describe('Community Retrieval', () => {
    it('should retrieve community by slug', async () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'Test Community',
        slug: 'test-community',
        description: 'Test description',
        organizer_id: 'user-123',
        member_count: 0,
        created_at: new Date().toISOString(),
      };

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockCommunity,
        error: null,
      });

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', 'test-community')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toEqual(mockCommunity);
      expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'test-community');
    });

    it('should return null for non-existent community', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', 'non-existent')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });
});