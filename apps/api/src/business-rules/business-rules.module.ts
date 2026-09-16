import { Module } from '@nestjs/common';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';

@Module({
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService],
  exports: [BusinessRulesService],
})
export class BusinessRulesModule {}
