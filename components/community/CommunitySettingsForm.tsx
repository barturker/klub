'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoUpload } from './LogoUpload';
import { ThemeSelector } from './ThemeSelector';
import { PrivacySettings } from './PrivacySettings';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/database.types';

type Community = Database['public']['Tables']['communities']['Row'];

interface CommunitySettingsFormProps {
  community: Community;
}

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().optional(),
  location: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  custom_domain: z.string().optional(),
});

export function CommunitySettingsForm({ community }: CommunitySettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(community.logo_url);
  const [, setCoverImageUrl] = useState(community.cover_image_url);
  const [themeColor, setThemeColor] = useState(community.theme_color || '#3B82F6');
  const [privacyLevel, setPrivacyLevel] = useState(community.privacy_level || 'public');
  const [features, setFeatures] = useState(community.features || {
    events: true,
    discussions: true,
    resources: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: community.name,
      description: community.description || '',
      category: community.category || '',
      location: community.location || '',
      website_url: community.website_url || '',
      custom_domain: community.custom_domain || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);

      // Sadece dolu ve değişmiş alanları gönder
      const payload: any = {};
      
      // Form alanlarını kontrol et
      Object.entries(values).forEach(([key, value]) => {
        // Boş string değilse ve mevcut değerden farklıysa ekle
        if (value !== '' && value !== undefined && value !== (community as any)[key]) {
          payload[key] = value;
        }
      });
      
      // Theme, privacy ve features her zaman gönder (çünkü form dışından geliyorlar)
      if (themeColor !== community.theme_color) {
        payload.theme_color = themeColor;
      }
      if (privacyLevel !== community.privacy_level) {
        payload.privacy_level = privacyLevel;
      }
      if (JSON.stringify(features) !== JSON.stringify(community.features)) {
        payload.features = features;
      }

      const response = await fetch(`/api/communities/${community.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast.success('Settings updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <TabsContent value="general">
            <Card hoverable={false}>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic information about your community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Community Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter community name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your community&apos;s display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell people what your community is about"
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe your community in a few sentences.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="health">Health & Wellness</SelectItem>
                          <SelectItem value="arts">Arts & Culture</SelectItem>
                          <SelectItem value="sports">Sports & Recreation</SelectItem>
                          <SelectItem value="social">Social & Networking</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the category that best fits your community.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Country" {...field} />
                      </FormControl>
                      <FormDescription>
                        Where is your community based?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your community&apos;s external website.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="custom_domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Domain (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="community.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Use a custom domain for your community.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card hoverable={false}>
              <CardHeader>
                <CardTitle>Branding & Appearance</CardTitle>
                <CardDescription>
                  Customize how your community looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LogoUpload
                  communityId={community.id}
                  currentLogoUrl={logoUrl}
                  onLogoChange={setLogoUrl}
                />

                <ThemeSelector
                  currentColor={themeColor}
                  onColorChange={setThemeColor}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cover Image</label>
                  <p className="text-sm text-muted-foreground">
                    Upload a cover image for your community page
                  </p>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={isLoading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append('file', file);

                        try {
                          const response = await fetch(`/api/communities/${community.id}/cover`, {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) throw new Error('Upload failed');

                          const data = await response.json();
                          setCoverImageUrl(data.cover_url);
                          toast.success('Cover image uploaded successfully');
                        } catch (error) {
                          console.error('Error uploading cover:', error);
                          toast.error('Failed to upload cover image');
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacySettings
              communityId={community.id}
              currentLevel={privacyLevel}
              onLevelChange={setPrivacyLevel}
            />
          </TabsContent>

          <TabsContent value="features">
            <Card hoverable={false}>
              <CardHeader>
                <CardTitle>Community Features</CardTitle>
                <CardDescription>
                  Enable or disable features for your community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Events</label>
                    <p className="text-sm text-muted-foreground">
                      Allow members to create and join events
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={features.events ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeatures({ ...features, events: !features.events })}
                  >
                    {features.events ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Discussions</label>
                    <p className="text-sm text-muted-foreground">
                      Enable discussion forums and threads
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={features.discussions ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeatures({ ...features, discussions: !features.discussions })}
                  >
                    {features.discussions ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Resources</label>
                    <p className="text-sm text-muted-foreground">
                      Share files, documents, and links
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={features.resources ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeatures({ ...features, resources: !features.resources })}
                  >
                    {features.resources ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/communities/${community.slug}`)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="save" size="lg" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}