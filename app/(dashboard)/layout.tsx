'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/ui/sidebar';
import {
  IconHome,
  IconUsers,
  IconCalendarEvent,
  IconTicket,
  IconSettings,
  IconBrandTabler,
  IconUserPlus,
  IconLogout2,
  IconMoon,
  IconSun,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { listenToProfileUpdate, PROFILE_EVENTS } from '@/lib/events/profile-events';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  // Sidebar should be closed by default, opens on hover
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url, display_name, full_name')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      } else {
        setUser(user);
        await fetchUserProfile(user.id);
      }
    };
    getUser();
  }, [router, supabase]);

  // Listen for profile updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToProfileUpdate(PROFILE_EVENTS.AVATAR_UPDATED, async () => {
      // Re-fetch profile when avatar is updated
      await fetchUserProfile(user.id);
    });

    const unsubscribeProfile = listenToProfileUpdate(PROFILE_EVENTS.PROFILE_UPDATED, async () => {
      // Re-fetch profile when any profile data is updated
      await fetchUserProfile(user.id);
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, [user, supabase]);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const links = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <IconHome className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: 'Communities',
      href: '/communities',
      icon: (
        <IconUsers className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: 'Events',
      href: '/events',
      icon: (
        <IconCalendarEvent className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: 'Tickets',
      href: '/tickets',
      icon: (
        <IconTicket className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: 'Create Community',
      href: '/communities/new',
      icon: (
        <IconUserPlus className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: (
        <IconSettings className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 bg-muted rounded animate-pulse mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
      "h-screen"
    )}>
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
              <SidebarLink
                link={{
                  label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                  href: '#',
                  icon: theme === 'dark' ? (
                    <IconSun className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
                  ) : (
                    <IconMoon className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
                  ),
                }}
                onClick={handleThemeToggle}
              />
              <SidebarLink
                link={{
                  label: isSigningOut ? 'Signing out...' : 'Logout',
                  href: '#',
                  icon: isSigningOut ? (
                    <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-200" />
                  ) : (
                    <IconLogout2 className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
                  ),
                }}
                onClick={handleSignOut}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {user && (
              <SidebarLink
                link={{
                  label: profile?.display_name || profile?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                  href: '/profile',
                  icon: profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                      {(profile?.display_name || profile?.full_name || user.email)?.charAt(0).toUpperCase()}
                    </div>
                  ),
                }}
              />
            )}
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1">
        <div className="p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 flex-shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Klub
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 flex-shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </Link>
  );
};