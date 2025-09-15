'use client';

import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionBarProps {
  percentage: number;
  missingFields?: string[];
  className?: string;
}

export function ProfileCompletionBar({
  percentage,
  missingFields = [],
  className
}: ProfileCompletionBarProps) {
  const isComplete = percentage >= 80;

  const fieldLabels: Record<string, string> = {
    name: 'Display Name',
    avatar: 'Profile Picture',
    bio: 'Bio',
    location: 'Location',
    interests: 'Interests',
    social_links: 'Social Links',
    website: 'Website',
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Profile Completion</h3>
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        {isComplete ? (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Your profile is complete!
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete your profile to help others connect with you
          </p>
        )}
      </div>

      {!isComplete && missingFields.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Complete these fields:</h4>
          <ul className="space-y-1">
            {missingFields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="w-3 h-3" />
                {fieldLabels[field] || field}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}