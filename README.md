# Klub - Modern Community Management Platform

A modern, scalable community management platform built with Next.js 15 and Supabase, designed for clubs, organizations, and communities to manage members, events, and engagement.

## 🎯 Project Status

**Current Phase:** Clean Architecture Setup  
**Stack Decision:** Next.js 15 + Supabase (FREE tier optimized)  
**Implementation:** Starting fresh with correct tech stack

## 🚀 Tech Stack (Free-Tier First)

### Core Stack
- **Frontend Framework:** Next.js 15 with App Router
- **UI Components:** shadcn/ui + Tailwind CSS  
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel (free tier - 100GB bandwidth/month)
- **Type Safety:** TypeScript 5.3+

### Phase 2 Additions (When Needed)
- **Mobile:** React Native + Expo
- **Payments:** Stripe Connect
- **Analytics:** PostHog (1M events/month free)
- **Email:** Resend (100 emails/day free)

## 📋 MVP Features (Sprint 1-3)

### ✅ Foundation (Sprint 1)
- [ ] Next.js 15 project setup with TypeScript
- [ ] Supabase integration (auth, database, storage)
- [ ] Basic authentication (email/password)
- [ ] User profiles
- [ ] Responsive design with Tailwind CSS

### 📝 Core Features (Sprint 2)
- [ ] Community creation
- [ ] Member management
- [ ] Event creation and RSVP
- [ ] Basic forums/discussions

### 🚀 Enhancement (Sprint 3)
- [ ] PWA support
- [ ] Social login (Google, GitHub)
- [ ] Email notifications
- [ ] Basic analytics dashboard

## 🛠️ Getting Started

### Prerequisites
```bash
# Required
- Node.js 18+ and npm
- Git
- Supabase account (free at supabase.com)

# Optional (for deployment)
- Vercel account (free at vercel.com)
- GitHub account
```

### Quick Setup

1. **Clone Repository**
```bash
git clone https://github.com/barturker/klub.git
cd klub
```

2. **Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create new project (free)
- Save your project URL and anon key

3. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. **Install Dependencies**
```bash
npm install
```

5. **Run Development Server**
```bash
npm run dev
# Open http://localhost:3000
```

## 📁 Project Structure

```
klub/
├── .bmad-core/          # BMAD workflow management
├── .claude/             # Claude AI commands
├── docs/                # Comprehensive documentation
│   ├── architecture/    # Technical decisions
│   ├── prd/            # Product requirements
│   ├── qa/             # Test plans
│   └── stories/        # User stories
├── app/                # Next.js 15 app (to be created)
│   ├── (auth)/        # Auth routes
│   ├── (dashboard)/   # Protected routes
│   ├── api/           # API routes
│   └── layout.tsx     # Root layout
├── components/         # React components (to be created)
├── lib/               # Utilities (to be created)
└── supabase/          # Database migrations (to be created)
```

## 🔄 Development Workflow

### Start Development
```bash
npm run dev           # Start Next.js dev server
npm run db:local      # Run Supabase locally (optional)
```

### Code Quality
```bash
npm run lint          # Lint code
npm run format        # Format with Prettier
npm run type-check    # TypeScript checking
```

### Testing
```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:e2e     # E2E tests
```

## 🚢 Deployment

### Vercel (Recommended - Free)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.local`
4. Deploy (automatic on push to main)

### Self-Hosted
```bash
npm run build
npm start
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture/)
- [Modern Free Tech Stack](./docs/architecture/modern-free-tech-stack.md)
- [Database Schema](./docs/architecture/supabase-database-schema.md)
- [Product Requirements](./docs/prd/)
- [User Stories](./docs/stories/)

## 🤝 Contributing

This is an active development project. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 💡 Key Decisions

- **Next.js over NestJS:** Simpler, unified frontend/backend
- **Supabase over AWS:** Free tier, built-in auth, realtime
- **Vercel over AWS:** Zero-config deploys, generous free tier
- **PWA before Native:** Faster to market, one codebase
- **shadcn/ui:** Modern components, full control, no vendor lock-in

---

**Status:** 🏗️ Under active development  
**Stack:** ✅ Decided and documented  
**Next Step:** Initialize Next.js 15 project with Supabase