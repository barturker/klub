# Claude AI Development Rules

## Development Server Management

### CRITICAL RULE: Always Use Port 3000

When starting the development server, you MUST:

1. **Kill all existing Node/Next.js processes on port 3000** before starting a new dev server
2. **Always use port 3000** - never let Next.js auto-select ports (3001, 3002, etc.)
3. **Use this command sequence:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or use npx to kill the port
npx kill-port 3000

# Then start the dev server
npm run dev
```

### Why This Rule Exists

- Prevents multiple dev server instances running simultaneously
- Ensures consistent port usage for authentication callbacks
- Avoids Supabase redirect URL mismatches
- Prevents memory leaks from orphaned processes

### Implementation

Before running `npm run dev`, ALWAYS:
1. Check if port 3000 is in use
2. Kill any process using port 3000
3. Start fresh on port 3000

## Authentication Configuration

### Redirect URLs
The application uses dynamic redirect URLs: `${location.protocol}//${location.host}/auth/callback`

However, in Supabase dashboard, these URLs must be whitelisted:
- `http://localhost:3000/auth/callback`

## Project Structure

### Key Directories
- `/app` - Next.js App Router pages
- `/components` - React components
- `/lib` - Utilities and configurations
- `/hooks` - Custom React hooks
- `/supabase` - Database migrations and config
- `/docs` - Documentation and stories

### Database
- All database changes MUST be done through migrations
- Migration files: `/supabase/migrations/`
- Profile table and triggers are in `00001_initial_schema.sql`

## Testing Commands

```bash
# Lint check
npm run lint

# Type check  
npm run typecheck

# Run tests (when available)
npm test
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Git Workflow

- Never commit `.env.local`
- Always test locally before marking stories as complete
- Update story files with implementation details