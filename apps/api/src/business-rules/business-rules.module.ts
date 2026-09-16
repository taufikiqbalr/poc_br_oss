import { Module } from '@nestjs/common';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';
import { ManagedRulesService } from './managed-rules.service';
import { DmnArtifactService } from './dmn-artifact.service';

@Module({
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService, ManagedRulesService, DmnArtifactService],
  exports: [BusinessRulesService, ManagedRulesService, DmnArtifactService],
})
export class BusinessRulesModule {}
