import { Module } from '@nestjs/common';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';
import { ManagedRulesService } from './managed-rules.service';

@Module({
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService, ManagedRulesService],
  exports: [BusinessRulesService, ManagedRulesService],
})
export class BusinessRulesModule {}
