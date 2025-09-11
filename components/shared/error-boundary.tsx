'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong!</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={reset} className="flex-1">
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="flex-1"
          >
            Go home
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="bg-muted mt-4 rounded-lg p-4">
            <p className="text-muted-foreground font-mono text-xs">
              Error ID: {error.digest}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
