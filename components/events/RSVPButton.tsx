'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  Heart,
  XCircle,
  Users,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRSVP } from '@/hooks/useRSVP';

interface RSVPButtonProps {
  eventId: string;
  eventSlug: string;
  communitySlug: string;
  capacity?: number | null;
  startAt: string;
  className?: string;
}

export function RSVPButton({
  eventId,
  eventSlug,
  communitySlug,
  capacity,
  startAt,
  className
}: RSVPButtonProps) {
  const {
    status,
    counts,
    isLoading,
    isUpdating,
    canChangeRSVP,
    updateRSVP,
    cancelRSVP,
    isAtCapacity,
    spotsRemaining
  } = useRSVP({
    eventId,
    eventSlug,
    communitySlug,
    capacity,
    startAt
  });

  const [isOpen, setIsOpen] = useState(false);

  // Debug: Log the event date and current time
  console.log('[RSVPButton] Event details:', {
    startAt,
    startDate: new Date(startAt),
    now: new Date(),
    isPast: new Date(startAt) < new Date(),
    canChangeRSVP
  });

  // Determine button appearance based on status
  const getButtonProps = () => {
    if (!canChangeRSVP) {
      return {
        icon: <Clock className="h-4 w-4" />,
        label: 'Event Ended',
        variant: 'secondary' as const,
        disabled: true
      };
    }

    switch (status) {
      case 'going':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Going',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700'
        };
      case 'interested':
        return {
          icon: <Heart className="h-4 w-4" />,
          label: 'Interested',
          variant: 'secondary' as const
        };
      case 'not_going':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: "Can't Go",
          variant: 'outline' as const
        };
      default:
        return {
          icon: <Users className="h-4 w-4" />,
          label: isAtCapacity ? 'Join Waitlist' : '🎉 RSVP to This Event',
          variant: 'default' as const
        };
    }
  };

  const buttonProps = getButtonProps();

  console.log('[RSVPButton] Render state:', {
    isLoading,
    status,
    counts,
    canChangeRSVP
  });

  // Show skeleton while loading initial data
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Skeleton for RSVP counts */}
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          {capacity && capacity > 0 && <Skeleton className="h-5 w-16 ml-auto" />}
        </div>
        {/* Skeleton for RSVP button */}
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* RSVP Counts Display */}
      <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" />
          {counts.going} going
        </span>
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          {counts.interested} interested
        </span>
        {capacity && capacity > 0 && (
          <Badge
            variant={isAtCapacity ? 'destructive' : 'outline'}
            className="ml-auto"
          >
            {isAtCapacity ? 'Event Full' : `${spotsRemaining} spots`}
          </Badge>
        )}
      </div>

      {/* Main RSVP Button - Much more prominent */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonProps.variant}
            size="lg"
            className={cn(
              "w-full font-semibold transition-all hover:scale-105",
              buttonProps.className,
              !status && "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            )}
            disabled={buttonProps.disabled || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                {buttonProps.icon && React.cloneElement(buttonProps.icon, { className: "h-5 w-5 mr-2" })}
                <span className="text-base">{buttonProps.label}</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        {canChangeRSVP && (
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                updateRSVP('going');
                setIsOpen(false);
              }}
              disabled={status === 'going' || (isAtCapacity && status !== 'going')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Going
              {isAtCapacity && status !== 'going' && (
                <Badge variant="outline" className="ml-auto">Full</Badge>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                updateRSVP('interested');
                setIsOpen(false);
              }}
              disabled={status === 'interested'}
            >
              <Heart className="h-4 w-4 mr-2" />
              Interested
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                updateRSVP('not_going');
                setIsOpen(false);
              }}
              disabled={status === 'not_going'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Can't Go
            </DropdownMenuItem>

            {status && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    cancelRSVP();
                    setIsOpen(false);
                  }}
                  className="text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Cancel RSVP
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}