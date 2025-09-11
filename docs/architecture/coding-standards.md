# Coding Standards

## Overview
This document defines the coding standards and best practices for the Klub project. All contributors should follow these guidelines to maintain code quality, consistency, and readability.

## General Principles

### Core Values
1. **Readability** - Code is read more often than written
2. **Simplicity** - Prefer simple, clear solutions over clever ones
3. **Consistency** - Follow established patterns throughout the codebase
4. **Maintainability** - Write code that is easy to modify and extend
5. **Performance** - Optimize when necessary, but not prematurely

## TypeScript Standards

### Type Safety
```typescript
// ✅ Good - Explicit types
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad - Using 'any'
function processData(data: any) {
  // Avoid any type
}
```

### Strict Mode
- TypeScript strict mode is **enabled**
- No implicit `any` types
- Strict null checks
- Strict function types

### Type Definitions
- Define interfaces for all data structures
- Use type aliases for unions and complex types
- Export shared types from dedicated `.types.ts` files
- Prefer interfaces over type aliases for object shapes

### Enums and Constants
```typescript
// Use const assertions for literal types
const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed'
} as const;

type Status = typeof STATUS[keyof typeof STATUS];
```

## React & Next.js Standards

### Component Structure
```typescript
// ✅ Good - Functional component with proper typing
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      className={cn('button', `button--${variant}`)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### File Organization
```
components/
  Button/
    Button.tsx        # Component implementation
    Button.types.ts   # Type definitions
    Button.test.tsx   # Tests
    index.ts         # Barrel export
```

### Component Guidelines
- Use functional components with hooks
- One component per file
- Components should be pure when possible
- Use React.memo() for expensive components
- Implement proper error boundaries

### Hooks Rules
```typescript
// Custom hooks must start with 'use'
function useAuth() {
  // Hook implementation
}

// Hooks must be called at the top level
function Component() {
  const auth = useAuth(); // ✅ Good
  
  if (condition) {
    const data = useData(); // ❌ Bad - conditional hook
  }
}
```

### Server vs Client Components
```typescript
// Server Component (default)
// app/components/ServerComponent.tsx
export async function ServerComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component (explicit)
// app/components/ClientComponent.tsx
'use client';

import { useState } from 'react';

export function ClientComponent() {
  const [state, setState] = useState();
  // Interactive component
}
```

## Styling Standards

### Tailwind CSS
```tsx
// ✅ Good - Using Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
</div>

// ✅ Good - Using cn() for conditional classes
import { cn } from '@/lib/utils';

<button className={cn(
  "px-4 py-2 rounded",
  variant === 'primary' && "bg-blue-500 text-white",
  variant === 'secondary' && "bg-gray-200 text-gray-900",
  disabled && "opacity-50 cursor-not-allowed"
)} />
```

### CSS Organization
- Use Tailwind utilities as primary styling method
- Keep custom CSS in `globals.css` to minimum
- Use CSS modules only when necessary
- Follow mobile-first responsive design

### Design Tokens
- Use Tailwind config for design tokens
- Maintain consistent spacing scale
- Define custom colors in config
- Use semantic color names

## Code Organization

### File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase with `.types.ts` suffix
- **Tests**: Same name with `.test.ts` or `.spec.ts`
- **Styles**: Same name with `.module.css` if needed

### Directory Structure
```
src/
  app/              # Next.js app directory
  components/       # Shared components
    ui/            # Base UI components
    features/      # Feature-specific components
  lib/             # Utilities and configurations
  hooks/           # Custom React hooks
  types/           # Global type definitions
  styles/          # Global styles
```

### Import Order
```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// 3. Internal imports (absolute)
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

// 4. Relative imports
import { formatDate } from './utils';

// 5. Types
import type { User } from '@/types';

// 6. Styles
import styles from './Component.module.css';
```

### Barrel Exports
```typescript
// components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
```

## JavaScript/TypeScript Best Practices

### Variables and Functions
```typescript
// Use const by default, let when reassignment needed
const MAX_RETRIES = 3;
let currentAttempt = 0;

// Use descriptive names
const getUserById = async (userId: string) => {
  // Implementation
};

// Avoid abbreviations
const calculateTotalPrice = (items: Item[]) => { // ✅ Good
const calcTotPrc = (itms: Item[]) => { // ❌ Bad
```

### Async/Await
```typescript
// ✅ Good - Using async/await with proper error handling
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
```

### Error Handling
```typescript
// Define custom error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Use try-catch for async operations
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

### Array Methods
```typescript
// Prefer functional methods over loops
const activeUsers = users.filter(user => user.isActive);
const userNames = users.map(user => user.name);
const totalAge = users.reduce((sum, user) => sum + user.age, 0);

// Use early returns
function processUser(user: User) {
  if (!user.isActive) return null;
  if (!user.email) return null;
  
  // Process active user with email
}
```

## Database & Supabase Standards

### Query Patterns
```typescript
// ✅ Good - Type-safe Supabase queries
import { createClient } from '@/lib/supabase/server';

export async function getUser(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
}
```

### Database Types
- Always generate types from database schema
- Use generated types in all database operations
- Keep types in sync with migrations

### Row Level Security
- Implement RLS policies for all tables
- Test policies thoroughly
- Document policy logic

## API Standards

### RESTful Endpoints
```typescript
// app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get single user
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Update user
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Delete user
}
```

### Response Format
```typescript
// Success response
return Response.json({
  data: result,
  error: null
}, { status: 200 });

// Error response
return Response.json({
  data: null,
  error: {
    message: 'User not found',
    code: 'USER_NOT_FOUND'
  }
}, { status: 404 });
```

### Validation
```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().min(0).max(150)
});

// Validate request body
const body = await request.json();
const validatedData = userSchema.parse(body);
```

## Testing Standards

### Test Structure
```typescript
describe('Button Component', () => {
  it('should render children correctly', () => {
    // Test implementation
  });
  
  it('should handle click events', () => {
    // Test implementation
  });
  
  it('should apply variant styles', () => {
    // Test implementation
  });
});
```

### Testing Guidelines
- Write tests for critical paths
- Test edge cases and error scenarios
- Mock external dependencies
- Keep tests isolated and independent
- Use descriptive test names

## Performance Guidelines

### Code Splitting
```typescript
// Dynamic imports for code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### Optimization Techniques
- Use React.memo for expensive components
- Implement proper key props in lists
- Lazy load images and components
- Minimize bundle size
- Use Server Components by default

### Image Optimization
```tsx
import Image from 'next/image';

// ✅ Good - Using Next.js Image component
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority
/>
```

## Security Standards

### Input Validation
- Always validate user input
- Sanitize data before storage
- Use parameterized queries
- Implement rate limiting

### Authentication
- Use Supabase Auth for authentication
- Implement proper session management
- Follow OAuth best practices
- Never expose sensitive data

### Environment Variables
```typescript
// ✅ Good - Type-safe env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

// Never commit .env.local
// Always use .env.example as template
```

## Git Commit Standards

### Commit Messages
```
feat: Add user authentication
fix: Resolve navigation bug in mobile view
docs: Update API documentation
style: Format code with prettier
refactor: Simplify user service logic
test: Add unit tests for auth hook
chore: Update dependencies
```

### Branch Naming
```
feature/user-authentication
bugfix/mobile-navigation
hotfix/critical-security-patch
chore/update-dependencies
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates the total price including tax
 * @param items - Array of cart items
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns Total price with tax included
 */
function calculateTotal(items: CartItem[], taxRate: number): number {
  // Implementation
}
```

### README Files
- Include setup instructions
- Document environment variables
- Provide API documentation
- Include troubleshooting guide

## Code Review Checklist

### Before Submitting PR
- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex logic
- [ ] No console.log statements
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No sensitive data exposed
- [ ] Performance considered
- [ ] Accessibility checked

### Review Focus Areas
1. Logic correctness
2. Performance implications
3. Security vulnerabilities
4. Code maintainability
5. Test coverage
6. Documentation completeness

## Tooling Configuration

### ESLint
- Extends Next.js recommended config
- TypeScript rules enabled
- Custom rules as needed

### TypeScript
- Strict mode enabled
- No implicit any
- Path aliases configured

### Prettier (if added)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Continuous Improvement
- Regularly review and update standards
- Discuss improvements in team meetings
- Document decisions and rationale
- Stay current with best practices
- Learn from post-mortems

## Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)