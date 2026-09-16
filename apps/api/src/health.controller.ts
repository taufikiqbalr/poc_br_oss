import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'oss-v2-business-rules-poc',
      zone: 'B',
      domain: 'B1 Business Rules',
      timestamp: new Date().toISOString(),
    };
  }
}
