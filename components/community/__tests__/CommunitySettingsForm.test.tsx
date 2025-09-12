import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommunitySettingsForm } from '../CommunitySettingsForm';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockCommunity = {
  id: 'comm-123',
  slug: 'test-community',
  name: 'Test Community',
  description: 'A test community description',
  category: 'technology',
  location: 'San Francisco, CA',
  website_url: 'https://example.com',
  custom_domain: null,
  logo_url: null,
  cover_image_url: null,
  theme_color: '#3B82F6',
  privacy_level: 'public',
  features: {
    events: true,
    discussions: true,
    resources: true,
  },
  organizer_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 5,
  is_verified: false,
};

describe('CommunitySettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tabs correctly', () => {
    render(<CommunitySettingsForm community={mockCommunity} />);
    
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Branding')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('displays community data in form fields', () => {
    render(<CommunitySettingsForm community={mockCommunity} />);
    
    const nameInput = screen.getByDisplayValue('Test Community');
    expect(nameInput).toBeInTheDocument();
    
    const descriptionInput = screen.getByDisplayValue('A test community description');
    expect(descriptionInput).toBeInTheDocument();
  });

  it('validates form inputs', async () => {
    render(<CommunitySettingsForm community={mockCommunity} />);
    
    const nameInput = screen.getByDisplayValue('Test Community');
    fireEvent.change(nameInput, { target: { value: 'A' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, updated_fields: ['name'] }),
    });

    render(<CommunitySettingsForm community={mockCommunity} />);
    
    const nameInput = screen.getByDisplayValue('Test Community');
    fireEvent.change(nameInput, { target: { value: 'Updated Community Name' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/communities/${mockCommunity.id}/settings`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Updated Community Name'),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Settings updated successfully');
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<CommunitySettingsForm community={mockCommunity} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update settings');
    });
  });

  it('switches between tabs correctly', () => {
    render(<CommunitySettingsForm community={mockCommunity} />);
    
    // Click on Branding tab
    const brandingTab = screen.getByText('Branding');
    fireEvent.click(brandingTab);
    
    expect(screen.getByText('Branding & Appearance')).toBeInTheDocument();
    
    // Click on Privacy tab
    const privacyTab = screen.getByText('Privacy');
    fireEvent.click(privacyTab);
    
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
  });

  it('toggles features correctly', () => {
    render(<CommunitySettingsForm community={mockCommunity} />);
    
    // Navigate to Features tab
    const featuresTab = screen.getByText('Features');
    fireEvent.click(featuresTab);
    
    // Find and click the Events toggle
    const eventsToggle = screen.getByRole('button', { name: /Enabled/i });
    fireEvent.click(eventsToggle);
    
    expect(screen.getByRole('button', { name: /Disabled/i })).toBeInTheDocument();
  });
});