'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserMenu } from '@/components/shared/user-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const routes = [
  {
    title: 'Home',
    href: '/',
  },
  {
    title: 'Features',
    href: '/features',
    children: [
      {
        title: 'Analytics',
        href: '/features/analytics',
        description: 'Real-time analytics and insights',
      },
      {
        title: 'Team Management',
        href: '/features/team',
        description: 'Collaborate with your team',
      },
      {
        title: 'Integrations',
        href: '/features/integrations',
        description: 'Connect with your favorite tools',
      },
    ],
  },
  {
    title: 'Pricing',
    href: '/pricing',
  },
  {
    title: 'Documentation',
    href: '/docs',
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">Klub</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {routes.map((route) => (
              <NavigationMenuItem key={route.href}>
                {route.children ? (
                  <>
                    <NavigationMenuTrigger>{route.title}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {route.children.map((child) => (
                          <li key={child.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.href}
                                className={cn(
                                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none',
                                  pathname === child.href && 'bg-accent'
                                )}
                              >
                                <div className="text-sm leading-none font-medium">
                                  {child.title}
                                </div>
                                <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                                  {child.description}
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={route.href} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        pathname === route.href && 'bg-accent'
                      )}
                    >
                      {route.title}
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center space-x-2 md:flex">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="mt-4 flex flex-col space-y-4">
                {routes.map((route) => (
                  <div key={route.href}>
                    {route.children ? (
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">
                          {route.title}
                        </p>
                        {route.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'hover:text-primary block px-2 py-1 text-sm',
                              pathname === child.href &&
                                'text-primary font-medium'
                            )}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        href={route.href}
                        className={cn(
                          'hover:text-primary block py-2 text-lg font-medium',
                          pathname === route.href && 'text-primary'
                        )}
                      >
                        {route.title}
                      </Link>
                    )}
                  </div>
                ))}
                <div className="space-y-2 pt-4">
                  {user ? (
                    <UserMenu />
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/auth">Sign In</Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link href="/auth">Sign Up</Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
