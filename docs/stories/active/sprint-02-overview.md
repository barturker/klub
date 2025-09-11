# Sprint 2 Overview

## Sprint Goal

Complete the foundation infrastructure and implement core community features to enable basic community creation and member management.

## Sprint Context

**Previous Sprint Achievements:**
- ✅ Next.js 14 project setup with TypeScript & Tailwind
- ✅ Supabase authentication fully implemented
- ✅ Database schema with RLS policies configured

**Current Sprint Focus:**
Building the core community platform features that enable organizers to create and manage communities with proper member onboarding.

## Sprint Timeline

- **Duration:** 3 Days (Days 4-6)
- **Start Date:** January 2025 (Day 4)
- **Total Story Points:** 13 points
- **Team Velocity Target:** 4-5 points/day
- **Daily Standup:** 9:00 AM
- **Sprint Review:** Day 6, 4:00 PM

## Sprint Backlog

| Story ID  | Title                           | Points | Priority    | Epic | Dependencies | Status |
| --------- | ------------------------------- | ------ | ----------- | ---- | ------------ | ------ |
| STORY-004 | Basic Community Creation        | 3      | P0-Critical | 1    | Auth System  | Ready  |
| STORY-005 | Community Branding & Settings   | 4      | P1-High     | 2    | STORY-004    | Ready  |
| STORY-006 | Member Profile System           | 3      | P1-High     | 2    | Auth System  | Ready  |
| STORY-007 | Member Invitation System        | 3      | P1-High     | 2    | STORY-004    | Ready  |

## Success Criteria

- [ ] Users can create and configure communities
- [ ] Community branding (logo, colors) functional
- [ ] Member profiles with avatars working
- [ ] Invitation system generates unique links
- [ ] All features mobile-responsive
- [ ] Database relationships properly configured

## Daily Schedule

### Day 4: Community Foundation (4-5 hours)

**Story:** STORY-004 - Basic Community Creation

- Morning: Create community database schema
- Afternoon: Build creation form and API routes
- Testing: Verify slug generation and RLS policies
- Deliverable: Working community creation flow

### Day 5: Community Configuration (5-6 hours)

**Stories:** STORY-005 & STORY-006

- Morning: Community settings page with branding
- Afternoon: Member profile system implementation
- Testing: File uploads and profile editing
- Deliverable: Customizable communities and profiles

### Day 6: Growth Features (4-5 hours)

**Story:** STORY-007 - Member Invitation System

- Morning: Invitation link generation
- Afternoon: Email invitations and tracking
- Testing: Full invitation flow
- Deliverable: Complete member onboarding

## Technical Implementation Architecture

### Database Schema Requirements

```sql
-- STORY-004: Communities table
communities (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  organizer_id uuid REFERENCES auth.users,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- STORY-006: Extended profiles
profiles (
  ADD avatar_url text,
  ADD bio text,
  ADD privacy_level enum('public', 'members', 'private'),
  ADD metadata jsonb DEFAULT '{}'
)

-- STORY-007: Invitations table
invitations (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities,
  token text UNIQUE NOT NULL,
  email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users
)
```

### API Endpoints Required

| Endpoint | Method | Story | Purpose |
| -------- | ------ | ----- | ------- |
| /api/communities | POST | 004 | Create new community |
| /api/communities/[slug] | GET | 004 | Get community details |
| /api/communities/[id]/settings | PATCH | 005 | Update community settings |
| /api/communities/[id]/logo | POST | 005 | Upload community logo |
| /api/profile | GET/PATCH | 006 | Get/update user profile |
| /api/profile/avatar | POST | 006 | Upload avatar |
| /api/communities/[id]/invitations | POST | 007 | Create invitation |
| /api/invitations/[token] | GET | 007 | Validate invitation |

### Component Structure

```
/components
  /community
    CommunityCreateForm.tsx     # STORY-004
    CommunitySettingsForm.tsx   # STORY-005
    CommunityLogoUpload.tsx     # STORY-005
  /profile
    ProfileForm.tsx              # STORY-006
    AvatarUpload.tsx            # STORY-006
    ProfilePrivacySettings.tsx  # STORY-006
  /invitations
    InvitationGenerator.tsx     # STORY-007
    InvitationList.tsx         # STORY-007
    InvitationAccept.tsx       # STORY-007
```

### Technical Implementation Notes

#### Community Creation (STORY-004)
- Use `slugify` library for URL-safe slug generation
- Implement retry logic for slug collisions
- Add database transaction for atomicity
- Server-side validation with Zod schemas
- Rate limit: 10 communities per user

#### Community Branding (STORY-005)
- Max logo size: 5MB, formats: jpg, png, webp
- Use `sharp` for server-side image optimization (resize to 500x500)
- Store original and optimized versions
- Theme colors: Use CSS variables for dynamic theming
- Cache invalidation on settings update

#### Member Profiles (STORY-006)
- Avatar crop: Client-side with `react-image-crop`
- Avatar storage: 200x200 optimized version
- Privacy levels cascade to all profile fields
- Activity tracking via database triggers
- Profile completion percentage calculation

#### Invitation System (STORY-007)
- Token generation: `nanoid(21)` for URL-safe tokens
- Default expiry: 7 days (configurable)
- Email queue with Resend SDK
- Track: sent, opened, clicked, accepted
- Bulk invite limit: 100 per batch

## Definition of Done

- [ ] All code reviewed and merged
- [ ] Unit tests written (target 80% coverage)
- [ ] Integration tests for critical paths
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA testing completed
- [ ] No P0 or P1 bugs

## Risks & Mitigation

| Risk                          | Impact | Mitigation                           |
| ----------------------------- | ------ | ------------------------------------ |
| File upload complexity        | High   | Use Supabase Storage built-in APIs  |
| Email delivery issues         | Medium | Implement queue with retry logic    |
| Slug collision on high load   | Low    | Use database unique constraint      |
| Image processing performance  | Medium | Process images in background job    |

## Dependencies

- Supabase Storage bucket configured ✅
- Email service (Resend) API key ready ✅
- Image processing library (sharp) installed ✅
- React Email templates created ⏳

## Testing Checklist

### Community Creation
- [ ] Create community with valid data
- [ ] Duplicate slug handling
- [ ] Authorization checks
- [ ] Rate limiting works

### Community Branding
- [ ] Logo upload and display
- [ ] Theme color application
- [ ] Settings persistence
- [ ] Mobile responsive

### Member Profiles
- [ ] Profile creation on signup
- [ ] Avatar upload and crop
- [ ] Privacy settings respected
- [ ] Activity tracking accurate

### Invitation System
- [ ] Link generation unique
- [ ] Email sending successful
- [ ] Expiration enforced
- [ ] Analytics tracked

## Next Sprint Preview (Days 7-9)

- Role-based access control
- Member directory and search
- Basic event creation
- Community dashboard

---

**Sprint Status:** Ready to Start
**Last Updated:** January 2025