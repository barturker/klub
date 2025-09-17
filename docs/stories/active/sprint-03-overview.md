# Sprint 3 Overview

## Sprint Goal

Implement the core event management system with event creation, discovery, and basic ticketing infrastructure to enable communities to host and monetize events.

## Sprint Context

**Previous Sprint Achievements:**
- ✅ Basic Community Creation (Story 4)
- ✅ Community Branding & Settings (Story 5)
- ✅ Member Profile System (Story 6)
- ✅ Member Invitation System (Story 7)

**Current Sprint Focus:**
Building the foundational event management features that enable organizers to create, manage, and promote events within their communities.

## Sprint Timeline

- **Duration:** 4 Days (Days 7-10)
- **Start Date:** January 2025 (Day 7)
- **Total Story Points:** 16 points
- **Team Velocity Target:** 4 points/day
- **Daily Standup:** 9:00 AM
- **Sprint Review:** Day 10, 4:00 PM

## Sprint Backlog

| Story ID  | Title                           | Points | Priority    | Epic | Dependencies | Status |
| --------- | ------------------------------- | ------ | ----------- | ---- | ------------ | ------ |
| STORY-008 | Event Creation Workflow         | 4      | P0-Critical | 3    | STORY-004    | Ready  |
| STORY-009 | Ticket Pricing & Tiers          | 3      | P1-High     | 3    | STORY-008    | Ready  |
| STORY-010 | Stripe Payment Integration      | 5      | P0-Critical | 3    | STORY-009    | Ready  |
| STORY-011 | Order Management & Refunds      | 4      | P1-High     | 3    | STORY-010    | Ready  |

## Success Criteria

- [ ] Organizers can create and publish events
- [ ] Multi-step event creation form functional
- [ ] Event pages display all event details
- [ ] Ticket tiers and pricing configured
- [ ] Stripe integration ready (setup for Story 10)
- [ ] Order management system in place
- [ ] All features mobile-responsive
- [ ] Database relationships properly configured

## Daily Schedule

### Day 7: Event Foundation (5-6 hours)

**Story:** STORY-008 - Event Creation Workflow

- Morning: Create event database schema and migrations
- Afternoon: Build multi-step event creation form
- Testing: Verify event creation and validation
- Deliverable: Working event creation and display

### Day 8: Ticketing System (4-5 hours)

**Story:** STORY-009 - Ticket Pricing & Tiers

- Morning: Ticket tier database schema
- Afternoon: Ticket configuration UI
- Testing: Verify pricing calculations
- Deliverable: Complete ticket management

### Day 9: Payment Infrastructure (6-7 hours)

**Story:** STORY-010 - Stripe Payment Integration

- Morning: Stripe Connect onboarding
- Afternoon: Payment processing implementation
- Evening: Testing payment flows
- Deliverable: Working payment system

### Day 10: Order Management (5-6 hours)

**Story:** STORY-011 - Order Management & Refunds

- Morning: Order management dashboard
- Afternoon: Refund processing system
- Testing: Full order lifecycle
- Deliverable: Complete order management

## Technical Implementation Architecture

### Database Schema Requirements

```sql
-- STORY-008: Events table
events (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  type enum('physical', 'virtual', 'hybrid'),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  location jsonb,
  capacity integer,
  settings jsonb DEFAULT '{}',
  status enum('draft', 'published', 'cancelled'),
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(community_id, slug)
)

-- STORY-009: Ticket tiers
ticket_tiers (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  quantity integer,
  quantity_sold integer DEFAULT 0,
  sales_start timestamptz,
  sales_end timestamptz,
  max_per_order integer DEFAULT 10,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- STORY-010: Orders table
orders (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events,
  user_id uuid REFERENCES auth.users,
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL,
  status enum('pending', 'completed', 'cancelled', 'refunded'),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

-- STORY-011: Order items
order_items (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES orders,
  ticket_tier_id uuid REFERENCES ticket_tiers,
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL,
  created_at timestamptz DEFAULT now()
)
```

### API Endpoints Required

| Endpoint | Method | Story | Purpose |
| -------- | ------ | ----- | ------- |
| /api/events | POST | 008 | Create new event |
| /api/events/[slug] | GET | 008 | Get event details |
| /api/events/[id] | PATCH | 008 | Update event |
| /api/events/[id]/tiers | GET/POST | 009 | Manage ticket tiers |
| /api/events/[id]/checkout | POST | 010 | Initialize checkout |
| /api/stripe/webhook | POST | 010 | Handle Stripe webhooks |
| /api/orders | GET | 011 | List orders |
| /api/orders/[id]/refund | POST | 011 | Process refund |

### Component Structure

```
/components
  /events
    EventCreateWizard.tsx       # STORY-008
    EventForm.tsx              # STORY-008
    EventCard.tsx              # STORY-008
    EventDetails.tsx          # STORY-008
  /tickets
    TicketTierForm.tsx         # STORY-009
    TicketTierList.tsx        # STORY-009
    TicketPriceDisplay.tsx    # STORY-009
  /checkout
    CheckoutForm.tsx           # STORY-010
    PaymentStatus.tsx          # STORY-010
    StripeElements.tsx        # STORY-010
  /orders
    OrderList.tsx              # STORY-011
    OrderDetails.tsx           # STORY-011
    RefundModal.tsx           # STORY-011
```

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
| Stripe integration complexity | High   | Use Stripe's official SDK and docs  |
| Payment security concerns     | High   | Follow PCI compliance guidelines     |
| Event slug collisions        | Medium | Add community-scoped uniqueness      |
| Time zone handling           | Medium | Use UTC storage, local display      |

## Dependencies

- Stripe account configured ⏳
- Stripe Connect enabled ⏳
- Environment variables for Stripe ⏳
- Event email templates ⏳

## Next Sprint Preview (Days 11-13)

- Event Discovery & Calendar (Story 12)
- QR Code Check-in System (Story 13)
- Discussion Forums setup (Story 14)
- Basic moderation tools (Story 15)

---

**Sprint Status:** Ready to Start
**Last Updated:** January 2025