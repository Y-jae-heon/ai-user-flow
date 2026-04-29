import { Module } from '@nestjs/common'
import { MERMAID_PARSER_ADAPTER, MermaidSyntaxService } from './mermaid-syntax.service'
import { OpenAIPlanningAiClient, PLANNING_AI_CLIENT } from './planning.ai-client'
import { PlanningController } from './planning.controller'
import { PlanningExtractionService } from './planning.extraction.service'
import { PlanningService } from './planning.service'
import { PlanningMermaidGeneratorService } from './planning.mermaid-generator.service'
import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningValidator } from './planning.validator'
import { PlanningWorkflow } from './planning.workflow'

@Module({
  controllers: [PlanningController],
  providers: [
    PlanningService,
    PlanningValidator,
    MermaidSyntaxService,
    PlanningStateMachineService,
    PlanningMermaidGeneratorService,
    PlanningWorkflow,
    PlanningExtractionService,
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
