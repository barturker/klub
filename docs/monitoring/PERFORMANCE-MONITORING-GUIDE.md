# 📊 Performance Monitoring & Observability Setup Guide

**Platform:** Klub App
**Tech Stack:** Next.js 14, Supabase, Stripe
**Date:** 2025-09-19

---

## 🎯 Overview

This guide covers setting up comprehensive monitoring for:
- Application Performance Monitoring (APM)
- Error Tracking
- Real User Monitoring (RUM)
- Infrastructure Monitoring
- Custom Business Metrics

---

## 1. 🔍 Sentry Setup (Error Tracking & Performance)

### Installation
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Configuration
Create `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Environment
  environment: process.env.NODE_ENV,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Filtering
  beforeSend(event, hint) {
    // Filter out non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      // Skip network errors in development
      if (process.env.NODE_ENV === 'development' &&
          error?.message?.includes('Network')) {
        return null;
      }
    }
    return event;
  },
});
```

### Error Boundaries
```typescript
// app/error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Custom Error Tracking
```typescript
// lib/monitoring/error-tracking.ts
import * as Sentry from "@sentry/nextjs";

export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("custom", context);
    }
    Sentry.captureException(error);
  });
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  trackError(error, {
    userId: user.id,
    action: 'payment_processing',
    amount: 100
  });
}
```

---

## 2. 📈 Vercel Analytics (Next.js)

### Setup
```bash
npm install @vercel/analytics @vercel/speed-insights
```

### Integration
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Events
```typescript
// lib/monitoring/analytics.ts
import { track } from '@vercel/analytics';

export function trackEvent(name: string, properties?: Record<string, any>) {
  track(name, properties);
}

// Usage
trackEvent('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  itemCount: 2
});
```

---

## 3. 🔥 Application Performance Monitoring

### Custom Performance Metrics
```typescript
// lib/monitoring/performance.ts
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  startMeasure(name: string) {
    this.marks.set(name, performance.now());
  }

  endMeasure(name: string): number | null {
    const start = this.marks.get(name);
    if (!start) return null;

    const duration = performance.now() - start;
    this.marks.delete(name);

    // Send to monitoring service
    this.reportMetric(name, duration);

    return duration;
  }

  private reportMetric(name: string, duration: number) {
    // Send to Sentry
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: `${name} took ${duration.toFixed(2)}ms`,
        level: 'info',
        data: { duration }
      });
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    return fn().finally(() => {
      this.endMeasure(name);
    });
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### Database Query Monitoring
```typescript
// lib/monitoring/database.ts
import { perfMonitor } from './performance';

export async function monitoredQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return perfMonitor.measureAsync(
    `db_query_${queryName}`,
    queryFn
  );
}

// Usage
const events = await monitoredQuery('get_events', async () => {
  return supabase
    .from('events')
    .select('*')
    .eq('status', 'published');
});
```

---

## 4. 📱 Real User Monitoring (RUM)

### Web Vitals Tracking
```typescript
// app/components/WebVitals.tsx
'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function WebVitals() {
  useEffect(() => {
    const sendToAnalytics = (metric: any) => {
      // Send to your analytics service
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      });

      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/vitals', body);
      }
    };

    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);

  return null;
}
```

### User Session Recording
```typescript
// lib/monitoring/session.ts
interface UserSession {
  id: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  events: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }>;
}

class SessionMonitor {
  private session: UserSession;

  constructor() {
    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: 0,
      events: []
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackPageView(path: string) {
    this.session.pageViews++;
    this.addEvent('page_view', { path });
  }

  trackEvent(type: string, data?: any) {
    this.addEvent(type, data);
  }

  private addEvent(type: string, data?: any) {
    this.session.events.push({
      type,
      timestamp: Date.now(),
      data
    });

    // Send to analytics if buffer is full
    if (this.session.events.length >= 10) {
      this.flush();
    }
  }

  flush() {
    if (this.session.events.length > 0) {
      // Send to analytics endpoint
      fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.session)
      });

      // Clear events
      this.session.events = [];
    }
  }
}

export const sessionMonitor = new SessionMonitor();
```

---

## 5. 🎯 Custom Business Metrics

### Metrics Collection
```typescript
// lib/monitoring/metrics.ts
interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

class MetricsCollector {
  private buffer: Metric[] = [];
  private flushInterval: number = 30000; // 30 seconds

  constructor() {
    // Auto-flush every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.addMetric({ name, value, tags, timestamp: Date.now() });
  }

  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.addMetric({
      name: `${name}.count`,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.addMetric({
      name: `${name}.duration`,
      value: duration,
      tags,
      timestamp: Date.now()
    });
  }

  private addMetric(metric: Metric) {
    this.buffer.push(metric);

    // Flush if buffer is full
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Re-add metrics to buffer
      this.buffer.unshift(...metrics);
    }
  }
}

export const metrics = new MetricsCollector();

// Usage examples
metrics.increment('user.signup');
metrics.gauge('payment.amount', 99.99, { currency: 'USD' });
metrics.timing('api.response', 243, { endpoint: '/api/events' });
```

---

## 6. 📡 Infrastructure Monitoring

### Health Checks
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      stripe: 'unknown',
      storage: 'unknown'
    }
  };

  // Check database
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    health.services.database = error ? 'unhealthy' : 'healthy';
  } catch {
    health.services.database = 'unhealthy';
  }

  // Check Stripe
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.accounts.retrieve();
    health.services.stripe = 'healthy';
  } catch {
    health.services.stripe = 'unhealthy';
  }

  // Overall status
  const allHealthy = Object.values(health.services).every(s => s === 'healthy');
  health.status = allHealthy ? 'healthy' : 'degraded';

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503
  });
}
```

---

## 7. 📊 Dashboards & Alerts

### Grafana Dashboard Config
```json
{
  "dashboard": {
    "title": "Klub App Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules
```yaml
# alerts.yml
alerts:
  - name: high_error_rate
    expr: rate(errors_total[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected

  - name: slow_response_time
    expr: http_request_duration_seconds_p95 > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: API response time is slow

  - name: payment_failures
    expr: rate(payment_failures_total[1h]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High payment failure rate
```

---

## 8. 🚀 Implementation Checklist

### Phase 1: Basic Monitoring (Week 1)
- [ ] Install and configure Sentry
- [ ] Set up error boundaries
- [ ] Add Vercel Analytics
- [ ] Implement health check endpoint

### Phase 2: Performance (Week 2)
- [ ] Add custom performance metrics
- [ ] Implement database query monitoring
- [ ] Set up Web Vitals tracking
- [ ] Configure slow query logging

### Phase 3: Business Metrics (Week 3)
- [ ] Define key business metrics
- [ ] Implement metrics collection
- [ ] Create custom dashboards
- [ ] Set up alert rules

### Phase 4: Advanced (Week 4)
- [ ] Add session recording
- [ ] Implement distributed tracing
- [ ] Set up log aggregation
- [ ] Create runbooks for alerts

---

## 📋 Monitoring KPIs

### Technical Metrics
- **Uptime:** > 99.9%
- **P95 Response Time:** < 500ms
- **Error Rate:** < 1%
- **Apdex Score:** > 0.85

### Business Metrics
- **Conversion Rate:** Track signups → paid
- **Payment Success Rate:** > 95%
- **User Engagement:** DAU/MAU ratio
- **Feature Adoption:** New feature usage

---

## 🔧 Troubleshooting

### Common Issues
1. **Missing metrics:** Check network tab for blocked requests
2. **High memory usage:** Reduce sampling rate
3. **Slow dashboard:** Optimize queries, add caching
4. **Alert fatigue:** Tune thresholds, add aggregation

---

## 📚 Resources

- [Sentry Docs](https://docs.sentry.io/)
- [Vercel Analytics](https://vercel.com/analytics)
- [Web Vitals](https://web.dev/vitals/)
- [Grafana Best Practices](https://grafana.com/docs/)

---

*Created: 2025-09-19*
*Version: 1.0.0*