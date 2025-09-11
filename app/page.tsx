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
} from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="secondary" className="mb-4">
            Next.js 15 + shadcn/ui
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Welcome to <span className="text-primary">Klub</span>
          </h1>
          <p className="text-muted-foreground text-xl">
            A modern web application built with the latest technologies. Fast,
            secure, and scalable.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      <Separator className="container mx-auto" />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Everything you need to build modern apps
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Zap className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Built with Next.js 15 Turbopack for optimal performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Server Components</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Optimized builds</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Edge runtime ready</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Secure by Default</CardTitle>
              <CardDescription>
                Enterprise-grade security with Supabase Auth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Row Level Security</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">JWT authentication</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">OAuth providers</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="text-primary mb-2 h-10 w-10" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Built for teams with real-time features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Real-time updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Team workspaces</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Activity tracking</span>
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

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Alert className="mx-auto max-w-2xl">
          <Globe className="h-4 w-4" />
          <AlertTitle>Ready to get started?</AlertTitle>
          <AlertDescription className="mt-2">
            This application is fully configured with shadcn/ui components,
            Supabase backend, and modern development tools. Start building your
            next great idea today!
          </AlertDescription>
        </Alert>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © 2025 Klub. Built with Next.js and shadcn/ui.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm">
                Documentation
              </Button>
              <Button variant="ghost" size="sm">
                GitHub
              </Button>
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
