import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BusinessRulesModule } from './business-rules/business-rules.module';

@Module({
  imports: [BusinessRulesModule],
  controllers: [HealthController],
})
export class AppModule {}
