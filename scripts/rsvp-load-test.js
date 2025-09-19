#!/usr/bin/env node

/**
 * RSVP Load Testing Script
 *
 * Tests the RSVP system with concurrent users making rapid changes
 * Simulates real-world usage patterns and stress conditions
 *
 * Usage:
 *   node scripts/rsvp-load-test.js --users 100 --duration 60 --event-id YOUR_EVENT_ID
 *
 * Requirements:
 *   - Valid Supabase credentials in .env.local
 *   - Test event with RSVP system enabled
 *   - Multiple test user accounts
 */

const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');
require('dotenv').config({ path: '.env.local' });

class RSVPLoadTester {
  constructor(options = {}) {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);

    // Test configuration
    this.config = {
      users: options.users || 50,
      duration: options.duration || 30, // seconds
      eventId: options.eventId,
      rsvpActions: ['going', 'interested', 'not_going', null], // null = cancel
      actionDelay: { min: 100, max: 2000 }, // ms between actions
      ...options
    };

    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      capacityFullErrors: 0,
      otherErrors: 0,
      responseTimes: [],
      startTime: null,
      endTime: null
    };

    this.testUsers = [];
    this.activeTests = new Set();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase().padEnd(5);
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  // Generate test user IDs (in real test, these would be actual user accounts)
  generateTestUsers() {
    // Generate UUID-like test user IDs
    this.testUsers = Array.from({ length: this.config.users }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      session: null
    }));
  }

  // Simulate RSVP action for a user
  async simulateRSVPAction(user, actionIndex) {
    const testId = `${user.id}-${actionIndex}`;
    this.activeTests.add(testId);

    try {
      const action = this.config.rsvpActions[
        Math.floor(Math.random() * this.config.rsvpActions.length)
      ];

      const startTime = performance.now();
      this.metrics.totalRequests++;

      let result;
      if (action === null) {
        // Cancel RSVP
        result = await this.supabase
          .from('event_rsvps')
          .delete()
          .match({
            event_id: this.config.eventId,
            user_id: user.id
          });
      } else {
        // Upsert RSVP
        result = await this.supabase
          .from('event_rsvps')
          .upsert({
            event_id: this.config.eventId,
            user_id: user.id,
            status: action
          }, {
            onConflict: 'event_id,user_id'
          });
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      this.metrics.responseTimes.push(responseTime);

      if (result.error) {
        this.metrics.failedRequests++;

        // Categorize errors
        if (result.error.code === '42820') {
          this.metrics.rateLimitHits++;
          this.log(`Rate limit hit for ${user.id}: ${action}`, 'warn');
        } else if (result.error.message.includes('capacity')) {
          this.metrics.capacityFullErrors++;
          this.log(`Capacity full for ${user.id}: ${action}`, 'warn');
        } else {
          this.metrics.otherErrors++;
          this.log(`Error for ${user.id}: ${result.error.message}`, 'error');
        }
      } else {
        this.metrics.successfulRequests++;
        this.log(`Success for ${user.id}: ${action} (${responseTime.toFixed(2)}ms)`, 'debug');
      }

    } catch (error) {
      this.metrics.failedRequests++;
      this.metrics.otherErrors++;
      this.log(`Exception for ${user.id}: ${error.message}`, 'error');
    } finally {
      this.activeTests.delete(testId);
    }
  }

  // Simulate user behavior over time
  async simulateUser(user) {
    const endTime = Date.now() + (this.config.duration * 1000);
    let actionIndex = 0;

    while (Date.now() < endTime) {
      // Perform RSVP action
      await this.simulateRSVPAction(user, actionIndex++);

      // Wait before next action
      const delay = this.config.actionDelay.min +
        Math.random() * (this.config.actionDelay.max - this.config.actionDelay.min);

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.log(`User ${user.id} completed ${actionIndex} actions`, 'info');
  }

  // Calculate statistics
  calculateStats() {
    const { responseTimes } = this.metrics;

    if (responseTimes.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...responseTimes].sort((a, b) => a - b);

    return {
      avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Print comprehensive test results
  printResults() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const stats = this.calculateStats();
    const throughput = this.metrics.totalRequests / duration;

    console.log('\n' + '='.repeat(60));
    console.log('RSVP LOAD TEST RESULTS');
    console.log('='.repeat(60));

    console.log('\nTest Configuration:');
    console.log(`  Users: ${this.config.users}`);
    console.log(`  Duration: ${this.config.duration}s`);
    console.log(`  Event ID: ${this.config.eventId}`);
    console.log(`  Actual Duration: ${duration.toFixed(2)}s`);

    console.log('\nRequest Statistics:');
    console.log(`  Total Requests: ${this.metrics.totalRequests}`);
    console.log(`  Successful: ${this.metrics.successfulRequests}`);
    console.log(`  Failed: ${this.metrics.failedRequests}`);
    console.log(`  Success Rate: ${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);

    console.log('\nError Breakdown:');
    console.log(`  Rate Limit Hits: ${this.metrics.rateLimitHits}`);
    console.log(`  Capacity Full: ${this.metrics.capacityFullErrors}`);
    console.log(`  Other Errors: ${this.metrics.otherErrors}`);

    console.log('\nResponse Time Statistics (ms):');
    console.log(`  Average: ${stats.avg.toFixed(2)}`);
    console.log(`  Minimum: ${stats.min.toFixed(2)}`);
    console.log(`  Maximum: ${stats.max.toFixed(2)}`);
    console.log(`  50th percentile: ${stats.p50.toFixed(2)}`);
    console.log(`  95th percentile: ${stats.p95.toFixed(2)}`);
    console.log(`  99th percentile: ${stats.p99.toFixed(2)}`);

    console.log('\nPerformance Assessment:');
    if (stats.p95 > 500) {
      console.log('  ⚠️  HIGH LATENCY: P95 > 500ms');
    } else if (stats.p95 > 200) {
      console.log('  ⚠️  MODERATE LATENCY: P95 > 200ms');
    } else {
      console.log('  ✅ GOOD LATENCY: P95 < 200ms');
    }

    if (this.metrics.failedRequests / this.metrics.totalRequests > 0.01) {
      console.log('  ⚠️  HIGH ERROR RATE: > 1%');
    } else {
      console.log('  ✅ LOW ERROR RATE: < 1%');
    }

    if (throughput < 10) {
      console.log('  ⚠️  LOW THROUGHPUT: < 10 req/s');
    } else {
      console.log('  ✅ GOOD THROUGHPUT: > 10 req/s');
    }

    console.log('\n' + '='.repeat(60));
  }

  // Run the load test
  async runTest() {
    try {
      if (!this.config.eventId) {
        throw new Error('Event ID is required. Use --event-id parameter.');
      }

      this.log('Starting RSVP Load Test', 'info');
      this.log(`Configuration: ${this.config.users} users, ${this.config.duration}s duration`, 'info');

      // Generate test users
      this.generateTestUsers();

      // Record start time
      this.metrics.startTime = performance.now();

      // Start all user simulations concurrently
      const userPromises = this.testUsers.map(user => this.simulateUser(user));

      // Wait for all users to complete
      await Promise.all(userPromises);

      // Record end time
      this.metrics.endTime = performance.now();

      // Wait for any remaining active tests to complete
      while (this.activeTests.size > 0) {
        this.log(`Waiting for ${this.activeTests.size} remaining tests...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.log('Load test completed', 'info');
      this.printResults();

    } catch (error) {
      this.log(`Load test failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Command line interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'users':
        options.users = parseInt(value, 10);
        break;
      case 'duration':
        options.duration = parseInt(value, 10);
        break;
      case 'event-id':
        options.eventId = value;
        break;
      case 'help':
        console.log(`
RSVP Load Testing Script

Usage: node scripts/rsvp-load-test.js [options]

Options:
  --users <number>      Number of concurrent users (default: 50)
  --duration <seconds>  Test duration in seconds (default: 30)
  --event-id <uuid>     Event ID to test (required)
  --help               Show this help message

Examples:
  node scripts/rsvp-load-test.js --users 100 --duration 60 --event-id abc123
  node scripts/rsvp-load-test.js --users 10 --duration 15 --event-id def456
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const tester = new RSVPLoadTester(options);
  tester.runTest().catch(console.error);
}

module.exports = RSVPLoadTester;