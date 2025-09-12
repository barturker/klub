import { NextRequest } from 'next/server';
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';
import { checkRateLimit, incrementRateLimit } from '@/lib/middleware/rate-limit';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/utils/slug-generator');
jest.mock('@/lib/middleware/rate-limit');

describe('POST /api/communities', () => {
  let mockSupabase: {
    auth: {
      getUser: jest.Mock;
    };
    from: jest.Mock;
    insert: jest.Mock;
    select: jest.Mock;
    single: jest.Mock;
  };
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (generateUniqueSlug as jest.Mock).mockResolvedValue('test-community');
    (checkRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      remainingAttempts: 10,
    });
    (incrementRateLimit as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should return 429 if rate limit is exceeded', async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        currentCount: 10,
        resetAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        remainingAttempts: 0,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.remainingAttempts).toBe(0);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('should include rate limit headers in successful response', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'community-123',
          slug: 'test-community',
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should return 400 for missing name field', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for empty name', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for name exceeding max length', async () => {
      const longName = 'a'.repeat(101);
      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: longName,
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for description exceeding max length', async () => {
      const longDescription = 'a'.repeat(501);
      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: longDescription,
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should accept valid input without description', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'community-123',
          slug: 'test-community',
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('community-123');
    });

    it('should return 400 for invalid JSON', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Community Creation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should successfully create a community with valid data', async () => {
      const mockCommunity = {
        id: 'community-123',
        slug: 'test-community',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCommunity,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'A test community description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCommunity);
      expect(generateUniqueSlug).toHaveBeenCalledWith('Test Community');
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Test Community',
        description: 'A test community description',
        slug: 'test-community',
        organizer_id: 'user-123',
      });
      expect(incrementRateLimit).toHaveBeenCalledWith('user-123', 'create_community', 24);
    });

    it('should handle null description properly', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'community-123',
          slug: 'test-community',
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
        }),
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Test Community',
        description: null,
        slug: 'test-community',
        organizer_id: 'user-123',
      });
    });

    it('should return 500 if database insert fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create community');
    });

    it('should handle slug generation errors', async () => {
      (generateUniqueSlug as jest.Mock).mockRejectedValue(new Error('Slug generation failed'));

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
          description: 'Test Description',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      mockRequest = new NextRequest('http://localhost:3000/api/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Community',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});