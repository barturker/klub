'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const communitySchema = z.object({
  name: z.string().min(1, 'Community name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

type CommunityFormData = z.infer<typeof communitySchema>;

export function CommunityCreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
  });

  const onSubmit = async (data: CommunityFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Log debug info for 500 errors
        if (response.status === 500 && error.debug) {
          console.error('Community creation failed - Debug info:', error.debug);
          toast.error(`Database error: ${error.debug.message || 'Unknown error'}`);
          return;
        }

        // Handle expected user errors (400 status) without throwing
        if (response.status === 400) {
          toast.error(error.message || error.error || 'Invalid request');
          return;
        }

        // For actual server errors (500+), throw to catch block
        throw new Error(error.message || error.error || 'Failed to create community');
      }

      const result = await response.json();
      toast.success('Community created successfully!');
      router.push(`/communities/${result.slug}`);
    } catch (error) {
      // This block now only handles unexpected errors
      console.error('Unexpected error creating community:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Community Name *</Label>
        <Input
          id="name"
          placeholder="Enter community name"
          {...register('name')}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your community"
          rows={4}
          {...register('description')}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>


      <Button
        type="submit"
        variant="submit"
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Community...
          </>
        ) : (
          'Create Community'
        )}
      </Button>
    </form>
  );
}