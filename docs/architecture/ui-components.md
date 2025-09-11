# UI Components Documentation

## Overview
This project uses **shadcn/ui** as the primary component library, built on top of Radix UI primitives with Tailwind CSS styling. All components are fully customizable, accessible, and follow modern React patterns.

## Component Library Structure

### Base Components (`/components/ui`)
All shadcn/ui components are located in the `/components/ui` directory. These are the foundational building blocks of the application.

### Shared Components (`/components/shared`)
Custom reusable components built using shadcn/ui primitives:
- **ThemeProvider** - Next-themes integration for dark mode
- **ThemeToggle** - Theme switcher dropdown
- **Navbar** - Responsive navigation header
- **LoadingSpinner** - Loading states and page loaders
- **ErrorBoundary** - Error handling UI
- **DataTable** - Advanced data table with sorting/filtering

## Installed shadcn/ui Components

### Form Controls
- **Button** - Primary interactive element with variants
- **Input** - Text input fields
- **Label** - Form field labels
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection
- **Checkbox** - Binary choice input
- **RadioGroup** - Single choice from multiple options
- **Switch** - Toggle switches
- **Form** - React Hook Form integration

### Layout Components
- **Card** - Content containers with header/footer
- **Sidebar** - Collapsible navigation sidebar
- **Sheet** - Slide-out panels
- **Dialog** - Modal dialogs
- **Drawer** - Mobile-friendly drawer
- **Separator** - Visual dividers
- **AspectRatio** - Maintain aspect ratios

### Navigation
- **NavigationMenu** - Desktop navigation menus
- **Tabs** - Tabbed interfaces
- **Breadcrumb** - Breadcrumb navigation
- **DropdownMenu** - Dropdown menus
- **ContextMenu** - Right-click context menus
- **Menubar** - Application menu bars

### Data Display
- **Table** - Data tables
- **Badge** - Status indicators
- **Avatar** - User avatars
- **Progress** - Progress indicators
- **Skeleton** - Loading placeholders

### Feedback
- **Alert** - Alert messages
- **Sonner** - Toast notifications (via Sonner library)
- **Tooltip** - Hover tooltips
- **HoverCard** - Hover information cards

### Overlays
- **Popover** - Floating panels
- **Command** - Command palette (⌘K)
- **Collapsible** - Expandable content

### Advanced Components
- **Calendar** - Date picker calendar
- **Accordion** - Collapsible sections
- **Toggle** - Toggle buttons
- **ToggleGroup** - Grouped toggle buttons
- **ScrollArea** - Custom scrollbars
- **Resizable** - Resizable panels
- **Pagination** - Page navigation

## Component Usage Examples

### Basic Button Usage
```tsx
import { Button } from "@/components/ui/button"

export function Example() {
  return (
    <Button variant="default" size="lg">
      Click me
    </Button>
  )
}
```

### Card with Content
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CardExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
    </Card>
  )
}
```

### Form with Validation
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function FormExample() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

## Theming and Customization

### CSS Variables
All components use CSS variables defined in `app/globals.css`:
- Colors: `--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`
- Spacing: `--radius`
- Typography: Handled by Tailwind

### Dark Mode
Dark mode is supported via `next-themes`:
```tsx
import { ThemeProvider } from "@/components/shared/theme-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Customizing Components
Components can be customized using:
1. **Variant props** - Pre-defined style variants
2. **className** - Additional Tailwind classes
3. **Direct modification** - Edit component files in `/components/ui`

## Accessibility Features

All shadcn/ui components include:
- **ARIA attributes** - Proper ARIA labels and roles
- **Keyboard navigation** - Full keyboard support
- **Focus management** - Proper focus trapping and restoration
- **Screen reader support** - Semantic HTML and announcements
- **RTL support** - Right-to-left language support

## Best Practices

### 1. Import Optimization
```tsx
// ✅ Good - Import only what you need
import { Button } from "@/components/ui/button"

// ❌ Bad - Don't create barrel exports for ui components
import { Button, Card, Input } from "@/components/ui"
```

### 2. Component Composition
```tsx
// ✅ Good - Compose components for reusability
export function SubmitButton({ children, ...props }) {
  return (
    <Button type="submit" {...props}>
      {children}
    </Button>
  )
}
```

### 3. Consistent Styling
- Use component variants for common patterns
- Apply custom styles via className prop
- Maintain consistent spacing with Tailwind utilities

### 4. Form Handling
- Always use React Hook Form with Zod validation
- Leverage the Form component for consistent styling
- Handle loading and error states properly

## Adding New Components

To add new shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add alert-dialog
```

## Custom Component Creation

When creating custom components:
1. Use shadcn/ui primitives as building blocks
2. Follow the same patterns as existing components
3. Ensure accessibility standards are met
4. Document props with TypeScript interfaces
5. Add examples to this documentation

## Performance Considerations

- Components are client-side by default when interactive
- Use Server Components when possible for static content
- Lazy load heavy components with dynamic imports
- Implement proper memoization for expensive renders

## Troubleshooting

### Common Issues
1. **Styling conflicts** - Use `cn()` utility from `@/lib/utils`
2. **Theme not working** - Ensure ThemeProvider wraps the app
3. **Icons not showing** - Import from `lucide-react`
4. **Forms not validating** - Check Zod schema matches form fields

### Resources
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Documentation](https://radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)