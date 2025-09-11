# Mobile-Web Code Sharing Strategy

## Overview
klub uses a **Progressive Web App (PWA) first** approach for MVP, with React Native Web enabling maximum code reuse between web and future native mobile apps.

## Architecture Decision

### Chosen Approach: React Native Web + PWA

```
┌─────────────────────────────────────────┐
│           Shared Codebase (95%)         │
│         React Native + TypeScript        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │   PWA    │  │   iOS    │  │ Android│ │
│  │  (Web)   │  │  (Later) │  │ (Later)│ │
│  └──────────┘  └──────────┘  └──────┘ │
│                                         │
│        Platform-Specific (5%)           │
└─────────────────────────────────────────┘
```

## Phase 1: PWA-First Strategy (MVP - Months 1-3)

### Benefits of PWA for MVP
- **Single Codebase:** One app for all platforms
- **No App Store:** Bypass approval process initially
- **Instant Updates:** Deploy fixes immediately
- **Lower Cost:** 70% less development time
- **Native Features:** Push notifications, offline, camera

### PWA Implementation

```typescript
// apps/pwa/src/index.tsx
import { AppRegistry } from 'react-native';
import { App } from '@klub/shared-ui';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Register the app
AppRegistry.registerComponent('klub', () => App);

// Run the app
AppRegistry.runApplication('klub', {
  rootTag: document.getElementById('root'),
});

// Register service worker for offline & push
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // Handle app updates
    showUpdateNotification(registration);
  },
});
```

### Service Worker Configuration

```javascript
// apps/pwa/public/service-worker.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data,
  });
});
```

## Shared Component Architecture

### Monorepo Structure

```
klub/
├── apps/
│   ├── pwa/                 # Progressive Web App
│   ├── mobile/              # React Native (Phase 2)
│   └── api/                 # NestJS Backend
├── packages/
│   ├── shared-ui/           # Shared UI components
│   ├── features/            # Feature modules
│   ├── hooks/               # Shared React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   └── services/            # API services
```

### Shared UI Components

```typescript
// packages/shared-ui/src/components/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  onPress,
  ...props
}) => {
  const isWeb = Platform.OS === 'web';
  
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        isWeb && styles.webSpecific,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      {...props}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSpecific: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  // ... rest of styles
});
```

### Feature Module Example

```typescript
// packages/features/src/community/CommunityList.tsx
import React from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { CommunityCard } from '@klub/shared-ui';
import { GET_COMMUNITIES } from '@klub/services';

export const CommunityList: React.FC = () => {
  const { data, loading, error } = useQuery(GET_COMMUNITIES);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data?.communities}
        renderItem={({ item }) => (
          <CommunityCard community={item} />
        )}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => refetch()}
      />
    </View>
  );
};
```

## Platform-Specific Code

### Using Platform Extensions

```typescript
// Button.web.tsx - Web-specific implementation
import React from 'react';

export const Button: React.FC<ButtonProps> = (props) => {
  // Web-specific button with hover effects
  return (
    <button
      className="klub-button"
      onClick={props.onPress}
      disabled={props.disabled}
    >
      {props.title}
    </button>
  );
};

// Button.native.tsx - Native-specific implementation
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export const Button: React.FC<ButtonProps> = (props) => {
  // Native button with haptic feedback
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Text>{props.title}</Text>
    </TouchableOpacity>
  );
};
```

### Platform Utilities

```typescript
// packages/utils/src/platform.ts
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;
export const isNative = !isWeb;

export const select = <T>(options: {
  web?: T;
  ios?: T;
  android?: T;
  native?: T;
  default: T;
}): T => {
  if (isWeb && options.web !== undefined) return options.web;
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isNative && options.native !== undefined) return options.native;
  return options.default;
};
```

## Navigation Strategy

### React Navigation (Web & Native)

```typescript
// packages/shared-ui/src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const linking = {
    prefixes: ['https://klub.app', 'klub://'],
    config: {
      screens: {
        Home: '',
        Community: 'c/:slug',
        Event: 'e/:eventId',
        Profile: 'profile/:userId',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="Event" component={EventScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

## State Management

### Redux Toolkit (Shared)

```typescript
// packages/features/src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './api/apiSlice';
import authReducer from './auth/authSlice';
import communityReducer from './community/communitySlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    community: communityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);
```

## API Integration

### GraphQL Client (Shared)

```typescript
// packages/services/src/apollo/client.ts
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

## Build Configuration

### Nx Workspace Configuration

```json
// workspace.json
{
  "projects": {
    "pwa": {
      "root": "apps/pwa",
      "sourceRoot": "apps/pwa/src",
      "projectType": "application",
      "targets": {
        "build": {
          "executor": "@nrwl/web:webpack",
          "options": {
            "outputPath": "dist/apps/pwa",
            "index": "apps/pwa/public/index.html",
            "main": "apps/pwa/src/index.tsx",
            "webpackConfig": "apps/pwa/webpack.config.js"
          }
        },
        "serve": {
          "executor": "@nrwl/web:dev-server",
          "options": {
            "buildTarget": "pwa:build",
            "port": 3000
          }
        }
      }
    },
    "shared-ui": {
      "root": "packages/shared-ui",
      "sourceRoot": "packages/shared-ui/src",
      "projectType": "library"
    }
  }
}
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load features
const CommunityFeature = lazy(() => 
  import('@klub/features/community')
);

const EventFeature = lazy(() => 
  import('@klub/features/events')
);

// Use Suspense for loading states
<Suspense fallback={<LoadingScreen />}>
  <Route path="/community" component={CommunityFeature} />
</Suspense>
```

### Bundle Optimization

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

## Phase 2: Native Apps (Months 4-6)

### When to Add Native Apps
- 1000+ active communities
- Push notification engagement > 30%
- App store presence becomes competitive advantage
- Advanced features needed (biometrics, deep OS integration)

### Migration Path
1. **Reuse 95% of code** from PWA
2. **Add native modules** for platform features
3. **Implement native navigation** transitions
4. **Optimize performance** for mobile
5. **Submit to app stores**

## Code Sharing Metrics

### Target Sharing Percentages
- **UI Components:** 95% shared
- **Business Logic:** 100% shared
- **Navigation:** 90% shared
- **API Integration:** 100% shared
- **State Management:** 100% shared
- **Platform-Specific:** 5% unique

### Maintenance Benefits
- **Single bug fix** applies everywhere
- **Feature parity** across platforms
- **Consistent UX** for all users
- **Reduced testing** effort
- **Faster development** cycles

## Best Practices

### Do's
- ✅ Use React Native components for everything
- ✅ Test on web and mobile simulators regularly
- ✅ Keep platform-specific code isolated
- ✅ Use TypeScript for type safety
- ✅ Implement responsive design from start

### Don'ts
- ❌ Don't use web-only libraries in shared code
- ❌ Don't assume touch/mouse input
- ❌ Don't hardcode dimensions
- ❌ Don't skip accessibility
- ❌ Don't forget offline support

## Development Workflow

### Local Development
```bash
# Start all platforms
nx run-many --target=serve --all

# Web only
nx serve pwa

# Mobile (Phase 2)
nx run mobile:ios
nx run mobile:android

# Run tests
nx test shared-ui
nx e2e pwa-e2e
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy PWA
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: nx build pwa --prod
      - run: nx test shared-ui
      - name: Deploy to AWS S3
        run: |
          aws s3 sync dist/apps/pwa s3://klub-pwa
          aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

## Success Metrics

### Code Sharing Goals
- **Week 4:** 90% component sharing achieved
- **Week 8:** PWA feature complete
- **Month 3:** 95% code sharing validated
- **Month 6:** Native apps using shared codebase

### Performance Targets
- **PWA Lighthouse Score:** 95+
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Bundle Size:** < 200KB initial