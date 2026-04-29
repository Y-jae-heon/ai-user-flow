import { Module } from '@nestjs/common'
import { MERMAID_PARSER_ADAPTER, MermaidSyntaxService } from './mermaid-syntax.service'
import { PlanningController } from './planning.controller'
import { PlanningService } from './planning.service'
import { PlanningValidator } from './planning.validator'

@Module({
  controllers: [PlanningController],
  providers: [
    PlanningService,
    PlanningValidator,
    MermaidSyntaxService,
    {
      provide: MERMAID_PARSER_ADAPTER,
      useValue: null
    }
  ]
})
export class PlanningModule {}
