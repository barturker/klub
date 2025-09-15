'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface FixAdminAccessProps {
  communityId: string;
  userId: string;
}

export function FixAdminAccess({ communityId, userId }: FixAdminAccessProps) {
  const [isFixing, setIsFixing] = useState(false);
  const router = useRouter();

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const response = await fetch('/api/fix-organizers');
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.summary.added > 0 || data.summary.updated > 0) {
          toast.success('Admin access restored successfully!');
          router.refresh();
        } else {
          toast.info('You already have admin access');
        }
      } else {
        toast.error('Failed to fix admin access');
      }
    } catch (error) {
      console.error('Error fixing admin access:', error);
      toast.error('An error occurred');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="border-yellow-500 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-yellow-800">Admin Access Issue</CardTitle>
        </div>
        <CardDescription className="text-yellow-700">
          You created this community but don't have admin access. This can happen if the automatic setup failed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleFix}
          disabled={isFixing}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          {isFixing ? 'Fixing...' : 'Restore Admin Access'}
        </Button>
      </CardContent>
    </Card>
  );
}