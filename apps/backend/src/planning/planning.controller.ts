import { Body, Controller, Param, Post } from '@nestjs/common'
import { PlanningService } from './planning.service'

@Controller('api/planning-sessions')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  createPlanningSession(@Body() body: unknown) {
    return this.planningService.createPlanningSession(body)
  }

  @Post(':sessionId/mermaid/validate')
  validateMermaid(@Param('sessionId') _sessionId: string, @Body() body: unknown) {
    return this.planningService.validateMermaid(body)
  }
}
