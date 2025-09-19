'use client';

import { useRSVPAnalytics } from '@/hooks/useRSVPAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  Users,
  UserCheck,
  Heart,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  Shield,
  BarChart3
} from 'lucide-react';
import { DateTime } from 'luxon';

interface RSVPAnalyticsDashboardProps {
  eventId: string;
  isOrganizer: boolean;
}

export function RSVPAnalyticsDashboard({
  eventId,
  isOrganizer
}: RSVPAnalyticsDashboardProps) {
  const { metrics, isLoading, error, alerts, status, refresh } = useRSVPAnalytics({
    eventId,
    refreshInterval: 15000 // 15 seconds for organizer dashboard
  });

  // TEST: Show to all users for demo
  // if (!isOrganizer) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <Activity className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <Shield className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            RSVP Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-6 bg-muted rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            RSVP Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load analytics: {error.message}
            </AlertDescription>
          </Alert>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Analytics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              RSVP Analytics
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
                className="flex items-center gap-1"
              >
                {getStatusIcon()}
                {status}
              </Badge>
              <Button
                onClick={refresh}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total RSVPs */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Total RSVPs</span>
              </div>
              <div className="text-2xl font-bold">{metrics.totalRSVPs}</div>
            </div>

            {/* Going Count */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Going</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{metrics.goingCount}</div>
            </div>

            {/* Interested Count */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Interested</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{metrics.interestedCount}</div>
            </div>

            {/* Conversion Rate */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-muted-foreground">Conversion</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{metrics.conversionRate}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Rate Limiting & Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Rate Limiting */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rate Limit Activity</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{metrics.rateLimit.hitCount} hits</div>
                {metrics.rateLimit.lastHit && (
                  <div className="text-xs text-muted-foreground">
                    Last: {DateTime.fromISO(metrics.rateLimit.lastHit).toRelative()}
                  </div>
                )}
              </div>
            </div>

            {/* Error Breakdown */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Error Tracking:</span>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-medium text-red-600">{metrics.errors.capacityFull}</div>
                  <div className="text-xs text-muted-foreground">Capacity Full</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-yellow-600">{metrics.errors.rateLimited}</div>
                  <div className="text-xs text-muted-foreground">Rate Limited</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-600">{metrics.errors.other}</div>
                  <div className="text-xs text-muted-foreground">Other Errors</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Last updated: {DateTime.fromISO(metrics.lastUpdated).toRelative()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions for Organizers */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Copy analytics summary to clipboard
                const summary = `
RSVP Analytics Summary:
- Total RSVPs: ${metrics.totalRSVPs}
- Going: ${metrics.goingCount}
- Interested: ${metrics.interestedCount}
- Conversion Rate: ${metrics.conversionRate}%
- Status: ${status}
                `.trim();
                navigator.clipboard.writeText(summary);
              }}
            >
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/events/${eventId}/analytics/export`, '_blank')}
            >
              Export Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}