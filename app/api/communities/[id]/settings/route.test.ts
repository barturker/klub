import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('/api/communities/[id]/settings', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new NextRequest('http://localhost/api/communities/123/settings');
      const response = await GET(request, { params: { id: '123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when community not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'user-123' } } 
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/communities/123/settings');
      const response = await GET(request, { params: { id: '123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Community not found');
    });

    it('returns community settings with permissions', async () => {
      const mockUser = { id: 'user-123' };
      const mockCommunity = {
        id: 'comm-123',
        name: 'Test Community',
        organizer_id: 'user-123',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser } 
      });

      const communityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCommunity, error: null }),
      };

      const membershipQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(communityQuery)
        .mockReturnValueOnce(membershipQuery);

      const request = new NextRequest('http://localhost/api/communities/123/settings');
      const response = await GET(request, { params: { id: 'comm-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.settings).toEqual(mockCommunity);
      expect(data.permissions.isOrganizer).toBe(true);
      expect(data.permissions.canEdit).toBe(true);
    });
  });

  describe('PATCH', () => {
    it('returns 403 when user lacks permission', async () => {
      const mockUser = { id: 'user-456' };
      const mockCommunity = {
        id: 'comm-123',
        name: 'Test Community',
        organizer_id: 'user-123', // Different user
      };

      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser } 
      });

      const communityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCommunity, error: null }),
      };

      const membershipQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(communityQuery)
        .mockReturnValueOnce(membershipQuery);

      const request = new NextRequest('http://localhost/api/communities/123/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });
      
      const response = await PATCH(request, { params: { id: 'comm-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });

    it('validates input data', async () => {
      const mockUser = { id: 'user-123' };
      const mockCommunity = {
        id: 'comm-123',
        name: 'Test Community',
        organizer_id: 'user-123',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser } 
      });

      const communityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCommunity, error: null }),
      };

      const membershipQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(communityQuery)
        .mockReturnValueOnce(membershipQuery);

      const request = new NextRequest('http://localhost/api/communities/123/settings', {
        method: 'PATCH',
        body: JSON.stringify({ 
          name: 'A', // Too short
          theme_color: 'invalid', // Invalid hex color
        }),
      });
      
      const response = await PATCH(request, { params: { id: 'comm-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('successfully updates community settings', async () => {
      const mockUser = { id: 'user-123' };
      const mockCommunity = {
        id: 'comm-123',
        name: 'Test Community',
        description: 'Old description',
        organizer_id: 'user-123',
      };

      const updatedCommunity = {
        ...mockCommunity,
        name: 'Updated Community',
        description: 'New description',
      };

      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser } 
      });

      const communityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCommunity, error: null }),
      };

      const membershipQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedCommunity, error: null }),
      };

      const historyQuery = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(communityQuery)
        .mockReturnValueOnce(membershipQuery)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(historyQuery);

      const request = new NextRequest('http://localhost/api/communities/123/settings', {
        method: 'PATCH',
        body: JSON.stringify({ 
          name: 'Updated Community',
          description: 'New description',
        }),
      });
      
      const response = await PATCH(request, { params: { id: 'comm-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated_fields).toEqual(['name', 'description']);
      expect(data.data).toEqual(updatedCommunity);
    });
  });
});