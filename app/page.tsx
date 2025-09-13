import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  CheckCircle,
  Users,
  Shield,
  Zap,
  Globe,
  Calendar,
  Ticket,
  Building,
  Star,
  UserPlus,
  Settings,
  Image,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Home() {
  return (
    <div className="bg-background min-h-screen">
      {/* Navbar */}
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-semibold text-xl">
                Klub
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="secondary" className="mb-4">
            Community & Event Management Platform
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Build Your Community with <span className="text-primary">Klub</span>
          </h1>
          <p className="text-muted-foreground text-xl">
            Create, manage, and grow vibrant communities. Host events, manage members, 
            sell tickets, and customize your community's brand - all in one platform.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/auth">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/communities">
              <Button size="lg" variant="outline">
                Browse Communities
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Separator className="container mx-auto" />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Powerful Features for Community Leaders
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Building className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Community Management</CardTitle>
              <CardDescription>
                Create and customize your community space
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Custom branding & themes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Member roles & permissions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Private & public communities</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Categories & tags</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Event Planning</CardTitle>
              <CardDescription>
                Organize and manage community events seamlessly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Event creation & scheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">RSVP management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Virtual & in-person events</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Event reminders</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Ticket className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Ticketing System</CardTitle>
              <CardDescription>
                Sell tickets and manage event admissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Stripe payment integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Multiple ticket tiers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">QR code validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sales analytics</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Member Management</CardTitle>
              <CardDescription>
                Build and engage your community members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Member profiles & directory</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Join requests & approvals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Member statistics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Communication tools</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Image className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Custom Branding</CardTitle>
              <CardDescription>
                Make your community unique with custom themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Logo & cover images</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Custom color schemes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Theme customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Social media links</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Track your community's growth and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Member growth tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Event attendance stats</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Engagement metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Revenue reports</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-secondary/10 container mx-auto rounded-lg px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Powered by Modern Technology
        </h2>

        <Tabs defaultValue="frontend" className="mx-auto max-w-4xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="frontend">Frontend</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="devtools">DevTools</TabsTrigger>
          </TabsList>

          <TabsContent value="frontend" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Frontend Stack</CardTitle>
                <CardDescription>
                  Modern UI with the latest React ecosystem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Badge variant="outline" className="py-2">
                    Next.js 15
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    React 19
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    TypeScript 5
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Tailwind CSS 4
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    shadcn/ui
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Lucide Icons
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backend" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Backend Infrastructure</CardTitle>
                <CardDescription>
                  Scalable and secure backend services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Badge variant="outline" className="py-2">
                    Supabase
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    PostgreSQL
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Stripe
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Edge Functions
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Realtime
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Storage
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devtools" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Development Tools</CardTitle>
                <CardDescription>
                  Best-in-class developer experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Badge variant="outline" className="py-2">
                    Turbopack
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    ESLint
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Zod
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    React Hook Form
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    Sonner
                  </Badge>
                  <Badge variant="outline" className="py-2">
                    BMAD
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          How It Works
        </h2>
        
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlus className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">1. Create Your Community</h3>
              <p className="text-muted-foreground">
                Sign up and create your community in minutes. Add your branding, description, and invite members.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">2. Customize & Configure</h3>
              <p className="text-muted-foreground">
                Set up your community rules, member roles, event categories, and customize the look and feel.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">3. Host & Grow</h3>
              <p className="text-muted-foreground">
                Create events, sell tickets, engage members, and watch your community thrive.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator className="container mx-auto" />

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Start Building Your Community Today
          </h2>
          <p className="mb-8 text-xl text-muted-foreground">
            Join thousands of community leaders who are already using Klub to connect, 
            organize, and grow their communities.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth">
              <Button size="lg" className="min-w-[200px]">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/communities">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                Explore Communities
              </Button>
            </Link>
          </div>
          
          <Alert className="mt-8 mx-auto max-w-2xl">
            <Star className="h-4 w-4" />
            <AlertTitle>Free to get started</AlertTitle>
            <AlertDescription className="mt-2">
              Create your first community for free. Upgrade anytime to unlock premium features 
              like advanced analytics, unlimited events, and priority support.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © 2025 Klub. Community & Event Management Platform.
            </p>
            <div className="flex gap-4">
              <Link href="/communities">
                <Button variant="ghost" size="sm">
                  Communities
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="ghost" size="sm">
                  Events
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                Support
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
