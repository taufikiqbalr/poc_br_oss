import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { BusinessRulesService } from './business-rules.service';
import { ManagedRulesService } from './managed-rules.service';
import { DmnArtifactService } from './dmn-artifact.service';
import { DecisionDefinition, LifecycleStatus } from './business-rules.types';

@Controller('business-rules')
export class BusinessRulesController {
  constructor(
    private readonly service: BusinessRulesService,
    private readonly managed: ManagedRulesService,
    private readonly dmnArtifacts: DmnArtifactService,
  ) {}

  @Get('decisions')
  list() { return this.service.listDecisions(); }

  @Get('decisions/:id')
  get(@Param('id') id: string) { return this.service.getDecision(id); }

  @Post('evaluate')
  evaluate(@Body() body: { decisionId?: string; input?: Record<string, unknown> }) {
    return this.service.evaluate(body.decisionId || 'permit-profile', body.input || {});
  }

  @Post('simulate-permit')
  simulatePermit(@Body() body: Record<string, unknown>) {
    return this.service.simulatePermit(body || {});
  }

  @Get('workflow-contract')
  workflowContract() { return this.service.workflowContract(); }

  @Get('managed')
  managedList() { return this.managed.list(); }

  @Get('managed/:id')
  managedGet(@Param('id') id: string) { return this.managed.get(id); }

  @Post('managed')
  managedCreate(
    @Body() body: { definition: Partial<DecisionDefinition> & { id: string; name: string }; actor?: string },
  ) {
    return this.managed.create(body.definition, body.actor);
  }

  @Put('managed/:id')
  managedSave(
    @Param('id') id: string,
    @Body() body: { definition?: Partial<DecisionDefinition>; actor?: string; comment?: string },
  ) {
    return this.managed.saveDraft(id, body.definition || {}, body.actor, body.comment);
  }

  @Post('managed/:id/new-version')
  newVersion(
    @Param('id') id: string,
    @Body() body: { actor?: string; comment?: string },
  ) {
    return this.managed.createNewVersion(id, body.actor, body.comment);
  }

  @Post('managed/:id/transition')
  transition(
    @Param('id') id: string,
    @Body() body: { target: LifecycleStatus; actor?: string; comment?: string },
  ) {
    return this.managed.transition(id, body.target, body.actor, body.comment);
  }

  @Post('managed/:id/validate')
  validate(@Param('id') id: string) { return this.managed.validate(id); }

  @Post('managed/:id/preview')
  preview(
    @Param('id') id: string,
    @Body() body: { input?: Record<string, unknown> },
  ) {
    return this.service.preview(id, body.input || {});
  }

  @Get('managed/:id/dmn/:source')
  dmnPreview(
    @Param('id') id: string,
    @Param('source') source: string,
  ) {
    if (source === 'working') {
      return this.dmnArtifacts.preview(this.managed.getWorkingDefinition(id));
    }
    if (source === 'active') {
      return this.dmnArtifacts.preview(this.managed.getRuntimeDefinition(id));
    }
    throw new BadRequestException("DMN source must be 'working' or 'active'");
  }

  @Get('artifacts')
  publishedArtifacts() {
    return this.dmnArtifacts.listPublished();
  }

  @Get('artifacts/:id/:version')
  publishedArtifact(
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.dmnArtifacts.getPublished(id, version);
  }
}
