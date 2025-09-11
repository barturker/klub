# ⚠️ CRITICAL - READ THIS FIRST

## 🚨 IMPORTANT: Tech Stack Has Changed!

**Date: January 11, 2025**

We have completely migrated from the old expensive stack to a modern free-tier stack. Some documentation files are outdated and being updated.

---

## ✅ CURRENT STACK (USE THIS)

### Core Technologies
- **Frontend/Backend:** Next.js 14 with App Router
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting:** Vercel (serverless)
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Language:** TypeScript

### Cost: $0/month for MVP

---

## ❌ OLD STACK (DO NOT USE)

These technologies appear in old docs but are NO LONGER USED:
- ~~AWS (RDS, Cognito, S3, Lambda)~~ → Supabase
- ~~NestJS~~ → Next.js API Routes
- ~~GraphQL~~ → REST API / tRPC
- ~~Docker/Kubernetes~~ → Vercel serverless
- ~~Terraform~~ → Not needed
- ~~Microservices~~ → Single Next.js app
- ~~Monorepo with Nx~~ → Simple Next.js project

---

## 📁 WHICH DOCUMENTS TO USE

### ✅ USE THESE (UPDATED):
1. **[simplified-mvp-plan.md](./simplified-mvp-plan.md)** - 14-day implementation plan
2. **[modern-free-tech-stack.md](./architecture/modern-free-tech-stack.md)** - Current tech stack
3. **[supabase-database-schema.md](./architecture/supabase-database-schema.md)** - Database design
4. **[nextjs-source-tree.md](./architecture/nextjs-source-tree.md)** - Project structure
5. **[final-tech-validation.md](./final-tech-validation.md)** - Final checklist

### ✅ ALL OUTDATED FILES DELETED!
All conflicting and outdated files have been removed. The remaining documentation is consistent and uses the modern stack.

---

## 🚀 QUICK START (CORRECT WAY)

```bash
# 1. Create Next.js app (NOT NestJS, NOT Nx monorepo)
npx create-next-app@latest klub --typescript --tailwind --app

# 2. Install dependencies
cd klub
npm install @supabase/supabase-js @supabase/ssr stripe

# 3. Setup Supabase (NOT AWS)
# Go to supabase.com and create free project

# 4. Deploy to Vercel (NOT AWS)
# Push to GitHub and import to Vercel

# That's it! No Docker, no Kubernetes, no Terraform needed
```

---

## 🎯 KEY DIFFERENCES

| Feature | OLD (Wrong) | NEW (Correct) |
|---------|------------|---------------|
| **Backend** | NestJS + GraphQL | Next.js API Routes |
| **Database** | AWS RDS | Supabase PostgreSQL |
| **Auth** | AWS Cognito | Supabase Auth |
| **Files** | AWS S3 | Supabase Storage |
| **Deploy** | AWS + Docker | Vercel (git push) |
| **Structure** | Monorepo | Single Next.js app |
| **Cost** | $500+/month | $0/month |

---

## ⚡ IF CONFUSED, REMEMBER:

1. **We use Supabase, not AWS**
2. **We use Next.js, not NestJS**
3. **We use Vercel, not Docker/K8s**
4. **We use REST/tRPC, not GraphQL**
5. **It's FREE, not expensive**

---

## 📞 QUESTIONS?

If you see conflicting information:
1. Check if it mentions AWS/NestJS/GraphQL → It's outdated
2. Check if it mentions Supabase/Next.js/Vercel → It's current
3. When in doubt, follow `simplified-mvp-plan.md`

---

## 🔄 UPDATE STATUS

We are actively updating all documentation. Until complete:
- **Trust:** simplified-mvp-plan.md
- **Trust:** modern-free-tech-stack.md
- **Ignore:** Any AWS/GraphQL/NestJS references

**Last Updated:** January 11, 2025

---

**REMEMBER: Simple Next.js + Supabase + Vercel = Success! 🚀**