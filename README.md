# klub - Community Platform

Build and monetize your community with events, tickets, and memberships.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Supabase account (free)
- Vercel account (free)
- Stripe account (free)

### Setup (10 minutes)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/klub.git
cd klub
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Setup Supabase
# - Go to https://supabase.com
# - Create new project (free)
# - Copy URL and anon key to .env.local
# - Run database migrations (see supabase/migrations)

# 4. Setup Stripe
# - Go to https://stripe.com
# - Get test API keys
# - Add to .env.local

# 5. Run development server
npm run dev

# 6. Open http://localhost:3000
```

### Deploy (5 minutes)

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Deploy to Vercel
# - Go to https://vercel.com
# - Import GitHub repository
# - Add environment variables
# - Deploy!

# Your app is now live at https://your-app.vercel.app
```

## 🛠 Tech Stack

### Core Technologies
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting:** Vercel (Serverless)
- **Payments:** Stripe Connect
- **Styling:** Tailwind CSS
- **Language:** TypeScript

### Additional Services (All Free Tier)
- **Email:** Resend (3K emails/month free)
- **Analytics:** PostHog (1M events/month free)
- **Error Tracking:** Sentry (5K errors/month free)
- **Search:** PostgreSQL full-text search (built-in)

### Cost: $0/month for MVP ✨

## 📁 Project Structure

```
klub/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Protected dashboard
│   ├── api/            # API routes
│   ├── c/[slug]/       # Community pages
│   └── e/[id]/         # Event pages
├── components/         # React components
├── lib/               # Utilities and configs
│   ├── supabase/      # Supabase client
│   └── stripe/        # Stripe integration
├── types/             # TypeScript types
└── public/            # Static assets
```

## 🎯 Features

### MVP Features (Week 1-2)
- ✅ User authentication (email/social)
- ✅ Create communities
- ✅ Create events
- ✅ Sell tickets (Stripe)
- ✅ Member dashboard
- ✅ Mobile responsive (PWA)

### Coming Soon
- [ ] Discussion forums
- [ ] Membership tiers
- [ ] Email campaigns
- [ ] Analytics dashboard
- [ ] Mobile app

## 📚 Documentation

### Essential Docs
- [2-Week MVP Plan](./docs/simplified-mvp-plan.md) - Step-by-step implementation
- [Tech Stack Details](./docs/architecture/modern-free-tech-stack.md) - Why these choices
- [Database Schema](./docs/architecture/supabase-database-schema.md) - Complete schema

### ⚠️ Important Note
Some documentation files reference old technologies (AWS, NestJS, GraphQL). See [CRITICAL-README.md](./docs/CRITICAL-README.md) for current stack.

## 🧑‍💻 Development

### Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed sample data
npm run db:types     # Generate TypeScript types

# Quality
npm run lint         # Lint code
npm run format       # Format with Prettier
npm run type-check   # Check TypeScript
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
RESEND_API_KEY=re_xxx
POSTHOG_API_KEY=phc_xxx
SENTRY_DSN=https://xxx
```

## 🚢 Deployment

### Production Checklist
- [ ] Environment variables set in Vercel
- [ ] Supabase production project created
- [ ] Stripe webhook configured
- [ ] Custom domain connected
- [ ] Analytics enabled
- [ ] Error tracking enabled

### Monitoring
- Vercel Analytics (built-in)
- Supabase Dashboard (built-in)
- PostHog for user analytics
- Sentry for error tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🆘 Support

- Documentation: [/docs](./docs)
- Issues: [GitHub Issues](https://github.com/yourusername/klub/issues)
- Discord: [Join our community](#)

## 🚀 Start Building!

```bash
npx create-next-app@latest klub --typescript --tailwind --app
```

**Remember:** Keep it simple. Ship fast. Use free tiers. 🎯

---

Built with ❤️ using Next.js, Supabase, and Vercel