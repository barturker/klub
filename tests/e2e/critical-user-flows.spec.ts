import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'Test123!@#';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
  });

  test.describe('Authentication Flow', () => {
    test('User can sign up successfully', async ({ page }) => {
      // Navigate to signup
      await page.click('text=Get Started');

      // Fill signup form
      await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.fill('input[name="confirmPassword"]', TEST_USER_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/.*\/communities/);
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('User can login with valid credentials', async ({ page }) => {
      // Navigate to login
      await page.click('text=Sign In');

      // Fill login form
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify successful login
      await expect(page).toHaveURL(/.*\/communities/);
    });

    test('Shows error for invalid credentials', async ({ page }) => {
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    });
  });

  test.describe('Community Management', () => {
    test('Authenticated user can create a community', async ({ page }) => {
      // First login
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/communities/);

      // Create community
      await page.click('text=Create Community');

      // Fill community form
      await page.fill('input[name="name"]', `Test Community ${Date.now()}`);
      await page.fill('textarea[name="description"]', 'This is a test community');
      await page.click('input[name="is_public"]'); // Make it public

      // Submit
      await page.click('button:has-text("Create Community")');

      // Verify community created
      await expect(page).toHaveURL(/.*\/communities\/.*/);
      await expect(page.locator('h1')).toContainText('Test Community');
    });

    test('User can view public communities', async ({ page }) => {
      await page.goto(`${TEST_URL}/explore`);

      // Verify communities are visible
      await expect(page.locator('.community-card')).toHaveCount(0); // At least some communities

      // Click on a community
      const firstCommunity = page.locator('.community-card').first();
      if (await firstCommunity.isVisible()) {
        await firstCommunity.click();
        await expect(page).toHaveURL(/.*\/explore\/.*/);
      }
    });
  });

  test.describe('Event Creation and RSVP', () => {
    test('Community admin can create an event', async ({ page, context }) => {
      // Login as admin
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/communities/);

      // Navigate to a community (assuming user has one)
      const communityCard = page.locator('.community-card').first();
      if (await communityCard.isVisible()) {
        await communityCard.click();

        // Create event
        await page.click('text=Create Event');

        // Fill event form
        await page.fill('input[name="title"]', `Test Event ${Date.now()}`);
        await page.fill('textarea[name="description"]', 'Test event description');
        await page.fill('input[name="location"]', 'Online');

        // Set date (future date)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        await page.fill('input[name="start_at"]', futureDate.toISOString().slice(0, 16));

        // Set as free event
        await page.click('input[name="is_free"]');

        // Submit
        await page.click('button:has-text("Create Event")');

        // Verify event created
        await expect(page.locator('h1')).toContainText('Test Event');
      }
    });

    test('User can RSVP to free event', async ({ page }) => {
      // Navigate to events page
      await page.goto(`${TEST_URL}/explore`);

      // Find and click on a free event
      const freeEvent = page.locator('text=Free Event').first();
      if (await freeEvent.isVisible()) {
        await freeEvent.click();

        // RSVP to event
        await page.click('button:has-text("RSVP")');
        await page.click('text=Going');

        // Verify RSVP status
        await expect(page.locator('button:has-text("Going")')).toBeVisible();
      }
    });
  });

  test.describe('Payment Flow (Stripe)', () => {
    test('User can purchase event ticket', async ({ page }) => {
      // Login first
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/communities/);

      // Find a paid event
      const paidEvent = page.locator('.event-card:has-text("$")').first();
      if (await paidEvent.isVisible()) {
        await paidEvent.click();

        // Click purchase ticket
        await page.click('button:has-text("Purchase Ticket")');

        // Select ticket tier
        await page.click('.ticket-tier-card').first();
        await page.click('button:has-text("Continue to Payment")');

        // Verify Stripe checkout loads
        await expect(page.frameLocator('iframe[title="Stripe"]')).toBeVisible();

        // Fill test card details (Stripe test mode)
        const stripeFrame = page.frameLocator('iframe[title="Stripe"]').first();
        await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
        await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
        await stripeFrame.locator('input[name="cvc"]').fill('123');
        await stripeFrame.locator('input[name="postal"]').fill('12345');

        // Complete purchase
        await page.click('button:has-text("Pay")');

        // Verify success
        await expect(page.locator('text=Payment successful')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Profile Management', () => {
    test('User can update profile', async ({ page }) => {
      // Login
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/communities/);

      // Navigate to profile
      await page.click('[aria-label="User menu"]');
      await page.click('text=Profile');

      // Update profile
      await page.fill('input[name="display_name"]', 'Test User Updated');
      await page.fill('textarea[name="bio"]', 'This is my updated bio');
      await page.fill('input[name="location"]', 'San Francisco, CA');

      // Save changes
      await page.click('button:has-text("Save Profile")');

      // Verify success
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
    });

    test('User can upload avatar', async ({ page }) => {
      // Login
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/communities/);

      // Navigate to profile
      await page.click('[aria-label="User menu"]');
      await page.click('text=Profile');

      // Upload avatar
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/test-avatar.jpg');

      // Wait for upload
      await expect(page.locator('text=Avatar uploaded successfully')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('Navigation works on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TEST_URL);

      // Open mobile menu
      await page.click('[aria-label="Open menu"]');

      // Verify menu items
      await expect(page.locator('text=Communities')).toBeVisible();
      await expect(page.locator('text=Events')).toBeVisible();
      await expect(page.locator('text=Profile')).toBeVisible();
    });

    test('Forms are usable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TEST_URL);

      // Navigate to login
      await page.click('[aria-label="Open menu"]');
      await page.click('text=Sign In');

      // Verify form is visible and usable
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('Page has proper ARIA labels', async ({ page }) => {
      await page.goto(TEST_URL);

      // Check for main navigation
      await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();

      // Check for proper heading hierarchy
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);

      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('Keyboard navigation works', async ({ page }) => {
      await page.goto(TEST_URL);

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus is visible
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });
});

// Performance tests
test.describe('Performance', () => {
  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('API responses are fast', async ({ page }) => {
    await page.goto(TEST_URL);

    // Monitor API calls
    const apiTimes: number[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiTimes.push(response.timing().responseEnd);
      }
    });

    // Trigger some API calls
    await page.click('text=Explore');
    await page.waitForTimeout(1000);

    // Check all API responses were under 500ms
    apiTimes.forEach(time => {
      expect(time).toBeLessThan(500);
    });
  });
});