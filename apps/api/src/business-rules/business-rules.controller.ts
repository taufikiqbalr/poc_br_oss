import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BusinessRulesService } from './business-rules.service';

@Controller('business-rules')
export class BusinessRulesController {
  constructor(private readonly service: BusinessRulesService) {}

  @Get('decisions')
  list() {
    return this.service.listDecisions();
  }

  @Get('decisions/:id')
  get(@Param('id') id: string) {
    return this.service.getDecision(id);
  }

  @Post('evaluate')
  evaluate(
    @Body() body: { decisionId?: string; input?: Record<string, unknown> },
  ) {
    return this.service.evaluate(body.decisionId || 'permit-profile', body.input || {});
  }

  @Post('simulate-permit')
  simulatePermit(@Body() body: Record<string, unknown>) {
    return this.service.simulatePermit(body || {});
  }

  @Get('workflow-contract')
  workflowContract() {
    return this.service.workflowContract();
  }
}
