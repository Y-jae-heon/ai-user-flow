import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { PlanningModule } from './planning/planning.module'

@Module({
  imports: [PlanningModule],
  controllers: [HealthController]
})
export class AppModule {}
