# 🚀 klub MVP - 2 Week Implementation Plan

## ⚡ ULTRA-SIMPLIFIED SCOPE

### Week 1: Core Platform (Days 1-7)

Build the absolute minimum to demonstrate value.

### Week 2: Revenue Features (Days 8-14)

Add payment processing to validate business model.

---

## 📅 DAY-BY-DAY BREAKDOWN

### Day 1: Project Setup (3-4 hours)

```bash
# 1. Create Next.js app
npx create-next-app@latest klub --typescript --tailwind --app --src-dir
cd klub

# 2. Install essential packages
npm install @supabase/supabase-js @supabase/ssr
npm install @stripe/stripe-js stripe
npm install react-hook-form zod @hookform/resolvers
npm install sonner # for toasts

# 3. Setup Supabase project (Free)
# - Go to supabase.com
# - Create new project
# - Copy anon key and URL to .env.local

# 4. Deploy to Vercel (Free)
# - Push to GitHub
# - Import to Vercel
# - Add env variables
```

### Day 2: Authentication (4-5 hours)

**Just 3 files needed:**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
}
```

```typescript
// app/auth/page.tsx
'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase/client'

export default function AuthPage() {
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['google']}
      redirectTo={`${window.location.origin}/dashboard`}
    />
  )
}
```

### Day 3: Database Schema (3-4 hours)

**Run in Supabase SQL Editor:**

```sql
-- Minimum viable schema
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  price INTEGER DEFAULT 0, -- in cents
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  stripe_payment_intent TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Public read" ON communities FOR SELECT USING (true);
CREATE POLICY "Public read" ON events FOR SELECT USING (true);
CREATE POLICY "Users read own tickets" ON tickets FOR SELECT USING (auth.uid() = user_id);
```

### Day 4-5: Community & Events UI (8-10 hours)

**Key Pages:**

```typescript
// app/page.tsx - Landing page
export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">
        Build Your Community
      </h1>
      <p className="text-xl mb-8">
        Create events, sell tickets, grow your tribe
      </p>
      <Link href="/auth" className="btn-primary">
        Get Started Free
      </Link>
    </div>
  )
}
```

```typescript
// app/communities/new/page.tsx
export default function NewCommunity() {
  async function createCommunity(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: user } = await supabase.auth.getUser()

    await supabase.from('communities').insert({
      name: formData.get('name'),
      description: formData.get('description'),
      slug: formData.get('name').toLowerCase().replace(/\s+/g, '-'),
      organizer_id: user.id
    })

    redirect('/dashboard')
  }

  return (
    <form action={createCommunity}>
      <input name="name" placeholder="Community Name" required />
      <textarea name="description" placeholder="Description" />
      <button type="submit">Create Community</button>
    </form>
  )
}
```

```typescript
// app/c/[slug]/page.tsx - Community page
export default async function CommunityPage({ params }) {
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('*, events(*)')
    .eq('slug', params.slug)
    .single()

  return (
    <div>
      <h1>{community.name}</h1>
      <p>{community.description}</p>

      <h2>Upcoming Events</h2>
      {community.events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

### Day 6-7: Event Creation (6-8 hours)

```typescript
// app/events/new/page.tsx
export default function NewEvent() {
  async function createEvent(formData: FormData) {
    'use server'
    const supabase = await createClient()

    await supabase.from('events').insert({
      title: formData.get('title'),
      description: formData.get('description'),
      start_at: formData.get('start_at'),
      venue_name: formData.get('venue_name'),
      venue_address: formData.get('venue_address'),
      price: parseInt(formData.get('price')) * 100, // Convert to cents
      capacity: parseInt(formData.get('capacity')),
      community_id: formData.get('community_id')
    })

    redirect('/dashboard')
  }

  return (
    <form action={createEvent}>
      <input name="title" placeholder="Event Title" required />
      <textarea name="description" placeholder="Description" />
      <input name="start_at" type="datetime-local" required />
      <input name="venue_name" placeholder="Venue Name" />
      <input name="venue_address" placeholder="Address" />
      <input name="price" type="number" placeholder="Ticket Price" />
      <input name="capacity" type="number" placeholder="Capacity" />
      <button type="submit">Create Event</button>
    </form>
  )
}
```

### Day 8-9: Stripe Integration (8-10 hours)

```typescript
// app/api/checkout/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { eventId, eventTitle, amount } = await req.json();
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: eventTitle },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?event=${eventId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/events/${eventId}`,
    metadata: { eventId, userId: user.id },
  });

  return Response.json({ url: session.url });
}
```

```typescript
// app/api/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const supabase = await createClient();

    await supabase.from('tickets').insert({
      event_id: session.metadata.eventId,
      user_id: session.metadata.userId,
      stripe_payment_intent: session.payment_intent,
      amount: session.amount_total,
      status: 'completed',
    });
  }

  return Response.json({ received: true });
}
```

### Day 10: Event Display & Purchase (5-6 hours)

```typescript
// app/events/[id]/page.tsx
export default async function EventPage({ params }) {
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  async function purchaseTicket() {
    'use server'
    const response = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        eventId: event.id,
        eventTitle: event.title,
        amount: event.price
      })
    })
    const { url } = await response.json()
    redirect(url)
  }

  return (
    <div>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p>📍 {event.venue_name}</p>
      <p>📅 {new Date(event.start_at).toLocaleDateString()}</p>
      <p>💵 ${event.price / 100}</p>

      <form action={purchaseTicket}>
        <button type="submit">Buy Ticket</button>
      </form>
    </div>
  )
}
```

### Day 11: Dashboard (4-5 hours)

```typescript
// app/dashboard/page.tsx
export default async function Dashboard() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  const { data: communities } = await supabase
    .from('communities')
    .select('*')
    .eq('organizer_id', user.id)

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, events(*)')
    .eq('user_id', user.id)

  return (
    <div>
      <h1>Dashboard</h1>

      <section>
        <h2>My Communities</h2>
        {communities?.map(c => (
          <Link href={`/c/${c.slug}`}>{c.name}</Link>
        ))}
        <Link href="/communities/new">+ Create Community</Link>
      </section>

      <section>
        <h2>My Tickets</h2>
        {tickets?.map(t => (
          <div>
            {t.events.title} - {t.status}
          </div>
        ))}
      </section>
    </div>
  )
}
```

### Day 12-13: Polish & Testing (8-10 hours)

- Add loading states
- Error handling
- Form validation
- Mobile responsive design
- SEO meta tags
- Basic analytics (PostHog)

### Day 14: Launch Prep (4-5 hours)

- Final testing
- Deploy to production
- Configure custom domain
- Create demo community
- Prepare launch posts

---

## 🎯 MVP FEATURES CHECKLIST

### ✅ Week 1 Deliverables

- [ ] User authentication
- [ ] Create community
- [ ] Create events
- [ ] List communities/events
- [ ] Basic dashboard

### ✅ Week 2 Deliverables

- [ ] Stripe checkout
- [ ] Ticket purchase
- [ ] Payment webhooks
- [ ] Order confirmation
- [ ] Basic email notifications

### ❌ NOT in MVP (Add Later)

- Mobile app
- Advanced analytics
- Discussion forums
- Member management
- Recurring memberships
- Email marketing
- Push notifications
- Search functionality
- Admin panel
- Refunds

---

## 💰 COST BREAKDOWN

### Development Phase (2 weeks)

- **Total Cost: $0**
  - Supabase: Free tier
  - Vercel: Free tier
  - Stripe: No monthly fee
  - GitHub: Free

### First 3 Months

- **Total Cost: $0-10/month**
  - Only pay Stripe transaction fees (2.9% + $0.30)
  - Optional: GitHub Copilot ($10/month)

### Scaling (1000+ users)

- **Total Cost: ~$50/month**
  - Supabase Pro: $25
  - Vercel Pro: $20
  - Rest still free

---

## 🚀 QUICK START COMMANDS

```bash
# Day 1: Setup
git clone your-repo
cd klub
npm install
npm run dev

# Environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Deploy
git push origin main
# Auto-deploys to Vercel
```

---

## 📊 SUCCESS METRICS

### Week 1 Goals

- [ ] Working authentication
- [ ] 1 test community created
- [ ] 1 test event created

### Week 2 Goals

- [ ] First test payment processed
- [ ] 10 beta users signed up
- [ ] 5 test tickets sold

### Month 1 Goals

- [ ] 10 active communities
- [ ] 50 events created
- [ ] $1,000 in transactions

---

## 🎨 MINIMAL UI (Use Tailwind)

```css
/* globals.css - That's it! */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700;
  }
  .card {
    @apply rounded-lg bg-white p-6 shadow;
  }
}
```

---

## 🔥 LAUNCH STRATEGY

### Soft Launch (Day 14)

1. Share with 10 friends
2. Get feedback
3. Fix critical bugs

### Beta Launch (Week 3)

1. Post on Twitter/LinkedIn
2. Share in relevant communities
3. Collect 100 beta users

### Public Launch (Month 2)

1. ProductHunt launch
2. Content marketing
3. Paid ads ($500 budget)

---

## ⚡ THIS IS IT!

**No more planning. Start coding NOW!**

With this plan, you'll have a working MVP in 2 weeks that:

- Costs $0 to run
- Can process real payments
- Scales to 1000+ users
- Validates your business model

**Day 1 starts NOW! 🚀**
