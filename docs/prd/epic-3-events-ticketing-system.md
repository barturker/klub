# Epic 3: Events & Ticketing System

**Goal:** Build a complete event management system with ticket sales, Stripe payment processing, and QR code check-in functionality while ensuring full App Store compliance for payment flows. This epic delivers the primary monetization feature for communities.

## Story 3.1: Event Creation Workflow

As an **organizer**,
I want **to create events with all necessary details**,
so that **members can discover and attend my events**.

**Acceptance Criteria:**

1. Multi-step event creation form with save draft capability
2. Event fields: title, description, date/time, location, capacity
3. Event type selection (physical/virtual/hybrid)
4. Rich text editor for descriptions with image support
5. Recurring event patterns (daily/weekly/monthly)
6. Event preview before publishing
7. Event URL with SEO-friendly slug
8. Validation ensures physical events marked correctly for App Store

## Story 3.2: Ticket Pricing & Tiers

As an **organizer**,
I want **to set different ticket prices and types**,
so that **I can maximize revenue and offer options**.

**Acceptance Criteria:**

1. Multiple ticket tiers (Early Bird, General, VIP)
2. Tier limits and availability windows
3. Free and paid ticket options
4. Discount codes with percentage or fixed amount
5. Group pricing for bulk purchases
6. Price display with fees transparently shown
7. Ticket transfer and refund policy settings
8. Currency selection based on community location

## Story 3.3: Stripe Payment Integration

As a **member**,
I want **to securely purchase event tickets**,
so that **I can attend events without payment concerns**.

**Acceptance Criteria:**

1. Stripe Connect onboarding for organizers
2. Payment form with card, Apple Pay, Google Pay
3. 3D Secure authentication when required
4. Payment confirmation with receipt email
5. Automatic fee calculation (klub 3% + Stripe fees)
6. Instant payout option for organizers
7. PCI compliance maintained throughout
8. Payment retry for failed transactions

## Story 3.4: Order Management & Refunds

As an **organizer**,
I want **to manage ticket orders and process refunds**,
so that **I can handle customer service issues**.

**Acceptance Criteria:**

1. Order dashboard with filter and search
2. Order details: purchaser, tickets, payment status
3. Refund processing with partial refund option
4. Refund policy enforcement (deadline, fees)
5. Order modification (upgrade, transfer)
6. Automated refund for cancelled events
7. Order history export for accounting
8. Email notifications for all order changes

## Story 3.5: Event Discovery & Calendar

As a **member**,
I want **to discover upcoming events and manage my schedule**,
so that **I don't miss events I'm interested in**.

**Acceptance Criteria:**

1. Event calendar view (month/week/list)
2. Filter by date, category, price range
3. Event cards with key info and ticket availability
4. Add to personal calendar (iCal/Google)
5. Upcoming events on community home page
6. Past events archive with recordings (if available)
7. Event recommendations based on attendance history
8. Mobile-optimized event browsing

## Story 3.6: QR Code Check-in System

As an **organizer**,
I want **to check in attendees quickly at events**,
so that **entry management is smooth and professional**.

**Acceptance Criteria:**

1. QR code generated for each ticket purchase
2. Scanner interface in mobile app
3. Offline check-in capability with sync
4. Check-in status (not arrived, checked in, turned away)
5. Real-time attendance tracking
6. Guest list manual check-in option
7. Check-in staff role with limited permissions
8. Export attendance report post-event
