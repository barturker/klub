import { createSlug, generateUniqueSlug } from './slug-generator';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('slug-generator', () => {
  describe('createSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(createSlug('Hello World')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      // Slugify converts & to 'and'
      expect(createSlug('Test & Co.')).toBe('test-and-co');
      expect(createSlug('100% Amazing!')).toBe('100percent-amazing');
    });

    it('should handle emojis and unicode', () => {
      expect(createSlug('🎉 Party Time 🎊')).toBe('party-time');
      expect(createSlug('Café société')).toBe('cafe-societe');
    });

    it('should trim whitespace', () => {
      expect(createSlug('  Trimmed Text  ')).toBe('trimmed-text');
    });

    it('should handle multiple spaces', () => {
      expect(createSlug('Multiple   Spaces   Here')).toBe('multiple-spaces-here');
    });

    it('should handle numbers', () => {
      expect(createSlug('Test 123')).toBe('test-123');
      expect(createSlug('404 Not Found')).toBe('404-not-found');
    });

    it('should handle empty string', () => {
      expect(createSlug('')).toBe('');
    });

    it('should handle only special characters', () => {
      // Slugify converts some special chars to words
      expect(createSlug('!@#$%^&*()')).toBe('dollarpercentand');
    });

    it('should handle mixed case with numbers', () => {
      expect(createSlug('MyAwesome2024Community')).toBe('myawesome2024community');
    });

    it('should handle hyphens in input', () => {
      expect(createSlug('already-has-hyphens')).toBe('already-has-hyphens');
      expect(createSlug('--multiple--hyphens--')).toBe('multiple-hyphens');
    });
  });

  describe('generateUniqueSlug', () => {
    let mockSupabase: {
      from: jest.Mock;
      select: jest.Mock;
      eq: jest.Mock;
      maybeSingle: jest.Mock;
    };

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
      };
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return base slug if unique', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('Test Community');
      
      expect(slug).toBe('test-community');
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockSupabase.select).toHaveBeenCalledWith('slug');
      expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'test-community');
    });

    it('should append number if slug exists', async () => {
      // First call returns existing slug, second returns null
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { slug: 'test-community' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const slug = await generateUniqueSlug('Test Community');
      
      expect(slug).toBe('test-community-1');
      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, 'slug', 'test-community');
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, 'slug', 'test-community-1');
    });

    it('should handle multiple existing slugs', async () => {
      // Simulate first 3 slugs exist
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { slug: 'test-community' }, error: null })
        .mockResolvedValueOnce({ data: { slug: 'test-community-1' }, error: null })
        .mockResolvedValueOnce({ data: { slug: 'test-community-2' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const slug = await generateUniqueSlug('Test Community');
      
      expect(slug).toBe('test-community-3');
      expect(mockSupabase.eq).toHaveBeenCalledTimes(4);
    });

    it('should handle special characters in name', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('Test @ Community #1!');
      
      expect(slug).toBe('test-community-1');
    });

    it('should handle empty string', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('');
      
      expect(slug).toBe('');
    });

    it('should handle very long names', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const longName = 'This is a very long community name that goes on and on and on and should be converted to a slug';
      const slug = await generateUniqueSlug(longName);
      
      expect(slug).toBe('this-is-a-very-long-community-name-that-goes-on-and-on-and-on-and-should-be-converted-to-a-slug');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const slug = await generateUniqueSlug('Test Community');
      
      // Should still return a slug even if there's an error
      expect(slug).toBe('test-community');
    });

    it('should handle names with only special characters', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('!@#$%^&*()');
      
      // Slugify converts some special chars to words
      expect(slug).toBe('dollarpercentand');
    });

    it('should preserve existing hyphens', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('pre-existing-hyphens');
      
      expect(slug).toBe('pre-existing-hyphens');
    });

    it('should handle unicode characters', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const slug = await generateUniqueSlug('Café München 2024');
      
      expect(slug).toBe('cafe-munchen-2024');
    });
  });
});