# Klub - Modern Community Management Platform

A modern, scalable community management platform built with Next.js 15.5 and Supabase, designed for clubs, organizations, and communities to manage members, events, and engagement.

## 🎯 Project Status

**Current Phase:** Clean Slate Implementation  
**Stack:** Next.js 15.5 + Turbopack + Supabase  
**Status:** ✅ Project initialized, ready for development

## 🚀 Tech Stack (100% Free MVP)

### Core Stack
- **Frontend Framework:** Next.js 15.5 with App Router + Turbopack ✅
- **UI Components:** Tailwind CSS (shadcn/ui components)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel (free tier - 100GB bandwidth/month)
- **Type Safety:** TypeScript 5.6+
- **Payments:** Stripe (pay per transaction only)

### Cost: $0/month for MVP

## 📋 MVP Features (14-Day Sprint)

### Week 1: Core Platform
- [ ] User authentication (Supabase Auth)
- [ ] Community creation
- [ ] Event creation
- [ ] Event listing

### Week 2: Revenue Features  
- [ ] Stripe payment integration
- [ ] Ticket purchasing
- [ ] User dashboard
- [ ] My tickets view

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm ✅
- Supabase account (free at supabase.com)
- Stripe account (optional for payments)

### Quick Setup

1. **Clone & Install**
```bash
git clone https://github.com/yourusername/klub.git
cd klub
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

3. **Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create new project (free)
- Copy your project URL and anon key to `.env.local`

4. **Run Development Server**
```bash
npm run dev --turbo
# Open http://localhost:3000
```

## 📁 Project Structure

```
klub/
├── app/                 # Next.js 15.5 App Router
│   ├── (auth)/         # Authentication routes
│   ├── (dashboard)/    # Protected routes
│   ├── api/           # API routes
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/         # React components
│   ├── ui/           # UI components
│   └── shared/       # Shared components
├── lib/               # Utilities
│   ├── supabase/     # Supabase clients
│   ├── stripe/       # Stripe configuration
│   └── utils.ts      # Helper functions
├── public/            # Static assets
├── docs/             # Documentation
└── supabase/         # Database migrations (to be created)
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🚢 Deployment

### Vercel (Recommended - Free)
1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables from `.env.local`
4. Deploy (automatic on push to main)

## 📚 Key Documentation

- [Simplified MVP Plan](./docs/simplified-mvp-plan.md) - 14-day implementation guide
- [Database Schema](./docs/architecture/supabase-database-schema.md) - Supabase schema
- [Tech Stack](./docs/architecture/modern-free-tech-stack.md) - Technology decisions
- [Project Structure](./docs/architecture/nextjs-source-tree.md) - File organization

## 💡 Key Decisions

- **Next.js 15.5 + Turbopack:** Latest performance optimizations
- **Supabase over AWS:** Free tier, built-in auth, realtime
- **Vercel over AWS:** Zero-config deploys, generous free tier
- **PWA before Native:** Faster to market, one codebase
- **Tailwind CSS:** Modern styling, great DX

## 🎯 Next Steps

1. ✅ Project initialized with Next.js 15.5 + Turbopack
2. ⏳ Set up Supabase project and add credentials
3. ⏳ Create database schema
4. ⏳ Implement authentication
5. ⏳ Build core features

---

**Stack:** Next.js 15.5 + Turbopack + Supabase + Vercel  
**Cost:** $0/month  
**Time to MVP:** 14 days
