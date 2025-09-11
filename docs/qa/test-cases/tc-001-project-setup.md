# Test Cases: Project Setup (Story 001)

## TC-001-01: Fresh Project Installation

**Priority:** P0-Critical
**Type:** Smoke Test

### Preconditions
- Node.js 18+ installed
- Git installed
- Clean working directory

### Test Steps
1. Run `npx create-next-app@latest klub --typescript --tailwind --app --src-dir`
2. Navigate to project: `cd klub`
3. Run `npm install`
4. Create `.env.local` file with dummy values
5. Run `npm run dev`

### Expected Results
- ✅ Project created without errors
- ✅ All dependencies installed successfully
- ✅ Dev server starts on http://localhost:3000
- ✅ No console errors on homepage
- ✅ TypeScript compilation successful

### Actual Results
_To be filled during execution_

### Status: `Not Executed`

---

## TC-001-02: Dependency Installation

**Priority:** P0-Critical
**Type:** Functional Test

### Preconditions
- Project initialized

### Test Steps
1. Install Supabase: `npm install @supabase/supabase-js @supabase/ssr`
2. Install Stripe: `npm install @stripe/stripe-js stripe`
3. Install form libs: `npm install react-hook-form zod @hookform/resolvers`
4. Install UI lib: `npm install sonner`
5. Run `npm run build`

### Expected Results
- ✅ No dependency conflicts
- ✅ Package.json updated correctly
- ✅ Build completes without errors
- ✅ No peer dependency warnings

### Actual Results
_To be filled during execution_

### Status: `Not Executed`

---

## TC-001-03: Environment Configuration

**Priority:** P1-High
**Type:** Configuration Test

### Preconditions
- Dependencies installed
- Supabase project created

### Test Steps
1. Copy `.env.example` to `.env.local`
2. Add `NEXT_PUBLIC_SUPABASE_URL=<your-url>`
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>`
4. Verify `.gitignore` includes `.env.local`
5. Test environment variables load correctly

### Expected Results
- ✅ Environment variables accessible in app
- ✅ `.env.local` not tracked by git
- ✅ No secrets exposed in browser console
- ✅ Build uses correct environment values

### Actual Results
_To be filled during execution_

### Status: `Not Executed`

---

## TC-001-04: Vercel Deployment

**Priority:** P1-High
**Type:** Integration Test

### Preconditions
- GitHub repository created
- Vercel account active
- Code pushed to main branch

### Test Steps
1. Connect GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard
3. Trigger deployment
4. Access preview URL
5. Check deployment logs

### Expected Results
- ✅ Deployment successful
- ✅ Preview URL accessible
- ✅ Environment variables working
- ✅ No build errors
- ✅ Automatic deployments enabled

### Actual Results
_To be filled during execution_

### Status: `Not Executed`

---

## TC-001-05: Code Quality Checks

**Priority:** P2-Medium
**Type:** Quality Test

### Preconditions
- Project fully configured

### Test Steps
1. Run `npm run lint`
2. Run `npm run build`
3. Check TypeScript strict mode enabled
4. Verify path aliases work (@/ imports)
5. Test Prettier formatting

### Expected Results
- ✅ No linting errors
- ✅ TypeScript strict mode active
- ✅ Path aliases resolve correctly
- ✅ Code formatting consistent
- ✅ Build optimization working

### Actual Results
_To be filled during execution_

### Status: `Not Executed`