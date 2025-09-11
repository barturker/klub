# Epic 4: Discussion Forums & Engagement

**Goal:** Implement community discussions with posts, comments, reactions, and moderation tools to drive daily member engagement. This epic transforms communities from event-focused to engagement-focused platforms.

## Story 4.1: Post Creation & Rich Media

As a **member**,
I want **to create posts with text and media**,
so that **I can share content with my community**.

**Acceptance Criteria:**

1. Post composer with rich text formatting
2. Image upload with multi-image support
3. Link preview with metadata extraction
4. Post categories/tags for organization
5. Save draft and schedule posting
6. Edit post within 15 minutes of creation
7. Character limit: 5000 for posts
8. Mobile-optimized posting experience

## Story 4.2: Comments & Nested Discussions

As a **member**,
I want **to comment on posts and reply to others**,
so that **I can engage in meaningful discussions**.

**Acceptance Criteria:**

1. Nested comments up to 3 levels deep
2. @mention functionality with notifications
3. Comment editing within 5 minutes
4. Comment reactions (like, love, laugh, etc.)
5. Collapse/expand thread functionality
6. Load more pagination for long threads
7. Sort options: newest, oldest, most liked
8. Real-time comment updates via WebSocket

## Story 4.3: Content Moderation Tools

As a **moderator**,
I want **to manage community content**,
so that **the community remains safe and on-topic**.

**Acceptance Criteria:**

1. Report button on all content with reason selection
2. Moderation queue with reported content
3. Actions: approve, remove, warn user
4. Pin important posts to top
5. Lock threads to prevent further comments
6. Bulk moderation actions
7. Auto-moderation for spam keywords
8. Moderation activity log

## Story 4.4: Notifications & Activity Feed

As a **member**,
I want **to stay updated on community activity**,
so that **I don't miss important discussions**.

**Acceptance Criteria:**

1. In-app notification center
2. Notification types: mentions, replies, likes, events
3. Push notification preferences per type
4. Email digest option (daily/weekly)
5. Mark as read/unread functionality
6. Notification grouping for similar items
7. Do not disturb scheduling
8. Clear all notifications option
