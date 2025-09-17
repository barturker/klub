import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Providers } from '@/components/providers';
import './globals.css';
import './globals-modal-fix.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Klub - Modern Web Application',
  description:
    'A powerful web application built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui',
  keywords: 'Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase',
  authors: [{ name: 'Klub Team' }],
  creator: 'Klub',
  publisher: 'Klub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://klub.app',
    siteName: 'Klub',
    title: 'Klub - Modern Web Application',
    description:
      'A powerful web application built with Next.js 15 and shadcn/ui',
    images: [
      {
        url: 'https://klub.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Klub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klub - Modern Web Application',
    description:
      'A powerful web application built with Next.js 15 and shadcn/ui',
    creator: '@klub',
    images: ['https://klub.app/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
          </Providers>
          <Toaster
            richColors
            position="top-center"
            expand={true}
            closeButton
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
