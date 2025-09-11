-- Seed data for development
-- Reset sonrası otomatik çalışır

-- Test kullanıcıları oluştur
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('d0d25c5a-1111-1111-1111-111111111111', 'test@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('d0d25c5a-2222-2222-2222-222222222222', 'admin@example.com', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Profiller
INSERT INTO profiles (id, username, full_name)
VALUES 
  ('d0d25c5a-1111-1111-1111-111111111111', 'testuser', 'Test User'),
  ('d0d25c5a-2222-2222-2222-222222222222', 'admin', 'Admin User')
ON CONFLICT (id) DO NOTHING;

-- Test community
INSERT INTO communities (id, name, slug, description, organizer_id)
VALUES 
  ('c0d25c5a-1111-1111-1111-111111111111', 'Test Community', 'test-community', 'Development test community', 'd0d25c5a-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Test event
INSERT INTO events (community_id, title, slug, description, start_at, price)
VALUES 
  ('c0d25c5a-1111-1111-1111-111111111111', 'Test Event', 'test-event', 'This is a test event', NOW() + INTERVAL '7 days', 1000)
ON CONFLICT DO NOTHING;