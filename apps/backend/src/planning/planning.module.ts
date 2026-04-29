import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { getAppConfig } from '../config/app.config'
import { MERMAID_PARSER_ADAPTER, MermaidSyntaxService } from './mermaid-syntax.service'
import { OpenAIPlanningAiClient, PLANNING_AI_CLIENT } from './planning.ai-client'
import { PlanningAuditService } from './planning.audit.service'
import { PlanningController } from './planning.controller'
import { PlanningExtractionService } from './planning.extraction.service'
import { PlanningIdempotencyService } from './planning.idempotency.service'
import { PlanningService } from './planning.service'
import { PlanningMermaidGeneratorService } from './planning.mermaid-generator.service'
import { createPlanningPersistence, PLANNING_PERSISTENCE } from './planning.persistence'
import { PlanningRetryCounterService } from './planning.retry-counter.service'
import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningValidator } from './planning.validator'
import { PlanningWorkflow } from './planning.workflow'

const config = getAppConfig()

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: config.rateLimitTtlMs,
          limit: config.rateLimitMaxRequests
        }
      ]
    })
  ],
  controllers: [PlanningController],
  providers: [
    PlanningService,
    PlanningValidator,
    MermaidSyntaxService,
    PlanningStateMachineService,
    PlanningMermaidGeneratorService,
    PlanningWorkflow,
    PlanningExtractionService,
    PlanningIdempotencyService,
    PlanningRetryCounterService,
    PlanningAuditService,
    {
      provide: PLANNING_PERSISTENCE,
      useFactory: () => createPlanningPersistence(config)
    },
    {
      provide: PLANNING_AI_CLIENT,
      useFactory: () => new OpenAIPlanningAiClient()
    },
    {
      provide: MERMAID_PARSER_ADAPTER,
      useValue: null
    }
  ]
})
export class PlanningModule {}
