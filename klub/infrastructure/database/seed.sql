-- klub Development Seed Data
-- This file creates sample data for development and testing

\c klub_db;

-- Create test users
INSERT INTO users (id, email, name, bio, password_hash) VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'john@example.com', 'John Organizer', 'Professional event organizer', crypt('password123', gen_salt('bf'))),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'jane@example.com', 'Jane Member', 'Active community member', crypt('password123', gen_salt('bf'))),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'bob@example.com', 'Bob Moderator', 'Community moderator', crypt('password123', gen_salt('bf'))),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'alice@example.com', 'Alice Premium', 'Premium member', crypt('password123', gen_salt('bf'))),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'charlie@example.com', 'Charlie Creator', 'Content creator and educator', crypt('password123', gen_salt('bf')));

-- Create test communities
INSERT INTO communities (id, name, slug, description, category, privacy_type) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Tech Innovators', 'tech-innovators', 'A community for technology enthusiasts and innovators', 'Technology', 'public'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Fitness Warriors', 'fitness-warriors', 'Get fit together with daily challenges and support', 'Health & Fitness', 'public'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Art Collective', 'art-collective', 'Share and discover amazing artwork', 'Arts', 'invite_only'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'Startup Founders', 'startup-founders', 'Connect with fellow entrepreneurs', 'Business', 'private');

-- Add members to communities
INSERT INTO community_members (community_id, user_id, role) VALUES
    -- Tech Innovators
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'owner'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'member'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'moderator'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'member'),
    -- Fitness Warriors
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'owner'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'member'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'member');

-- Create test events
INSERT INTO events (id, community_id, organizer_id, title, slug, description, event_type, start_date, end_date, location_type, venue_name, capacity, status) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'AI Workshop: Building with GPT-4',
     'ai-workshop-gpt4',
     'Learn how to build applications with the latest AI models',
     'physical',
     CURRENT_TIMESTAMP + INTERVAL '7 days',
     CURRENT_TIMESTAMP + INTERVAL '7 days 3 hours',
     'venue',
     'Tech Hub Downtown',
     50,
     'published'),
     
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
     'Monthly Networking Meetup',
     'monthly-networking',
     'Connect with fellow tech professionals',
     'physical',
     CURRENT_TIMESTAMP + INTERVAL '14 days',
     CURRENT_TIMESTAMP + INTERVAL '14 days 2 hours',
     'venue',
     'Innovation Center',
     100,
     'published'),
     
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
     'Morning Yoga Session',
     'morning-yoga',
     'Start your day with energizing yoga',
     'physical',
     CURRENT_TIMESTAMP + INTERVAL '1 day',
     CURRENT_TIMESTAMP + INTERVAL '1 day 1 hour',
     'venue',
     'Zen Studio',
     20,
     'published');

-- Create ticket tiers
INSERT INTO ticket_tiers (id, event_id, name, description, price, quantity_available) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'Early Bird', 'Limited early bird pricing', 29.99, 20),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'General Admission', 'Standard ticket', 49.99, 30),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'Free Entry', 'Free networking event', 0.00, 100),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d14', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'Drop-in Class', 'Single class pass', 15.00, 20);

-- Create membership tiers
INSERT INTO membership_tiers (id, community_id, name, description, price, billing_period, benefits) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
     'Basic Member',
     'Access to community discussions',
     0.00,
     'monthly',
     '["Access to public discussions", "Event announcements"]'),
     
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e12',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
     'Pro Member',
     'Full access with exclusive benefits',
     19.99,
     'monthly',
     '["All Basic benefits", "Priority event registration", "Exclusive content", "Monthly workshops"]'),
     
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e13',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
     'Fitness Plus',
     'Unlimited classes and coaching',
     49.99,
     'monthly',
     '["Unlimited classes", "Personal coaching session", "Nutrition guides", "Workout plans"]');

-- Create sample posts
INSERT INTO posts (community_id, author_id, title, content, type) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Welcome to Tech Innovators!',
     'Excited to launch our community! We have amazing events planned for this month.',
     'text'),
     
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
     'Great resources for learning AI',
     'Just found these amazing tutorials on machine learning. Check them out!',
     'text'),
     
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
     '30-Day Fitness Challenge Starting!',
     'Who is ready to transform their fitness? Join our 30-day challenge!',
     'text');

-- Create some test notifications
INSERT INTO notifications (user_id, type, title, message, data) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
     'event_reminder',
     'Upcoming Event',
     'AI Workshop starts in 7 days',
     '{"event_id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11"}'),
     
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
     'new_post',
     'New post in Tech Innovators',
     'John posted: Welcome to Tech Innovators!',
     '{"post_id": "generated-post-id-1", "community_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11"}');

-- Create sample analytics events
INSERT INTO analytics_events (event_name, user_id, community_id, properties) VALUES
    ('page_view', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '{"page": "/community/tech-innovators"}'),
    ('event_viewed', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '{"event_id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11"}'),
    ('ticket_purchased', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', '{"event_id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11", "tier": "Early Bird"}');

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Sample data seeded successfully!';
    RAISE NOTICE 'Test users created (password for all: password123):';
    RAISE NOTICE '  - john@example.com (Organizer)';
    RAISE NOTICE '  - jane@example.com (Member)';
    RAISE NOTICE '  - bob@example.com (Moderator)';
    RAISE NOTICE '  - alice@example.com (Premium Member)';
    RAISE NOTICE '  - charlie@example.com (Creator)';
END $$;