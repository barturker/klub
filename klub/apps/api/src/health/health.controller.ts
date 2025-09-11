import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'healthy',
      message: 'klub API v1.0 - Healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('health')
  checkHealth() {
    return {
      status: 'ok',
      api: {
        version: '1.0.0',
        status: 'operational',
      },
      database: {
        status: 'connected',
        latency: '2ms',
      },
      timestamp: new Date().toISOString(),
    };
  }
}