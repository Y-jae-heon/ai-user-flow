import { Body, Controller, Param, Post } from '@nestjs/common'
import { PlanningService } from './planning.service'

@Controller('api/planning-sessions')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  createPlanningSession(@Body() body: unknown) {
    return this.planningService.createPlanningSession(body)
  }

  @Post(':sessionId/analyze')
  analyzePlanningSession(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    return this.planningService.analyzePlanningSession(sessionId, body)
  }

  @Post(':sessionId/mermaid/validate')
  validateMermaid(@Param('sessionId') _sessionId: string, @Body() body: unknown) {
    return this.planningService.validateMermaid(body)
  }

  @Post(':sessionId/mermaid')
  generateMermaid(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    return this.planningService.generateMermaid(sessionId, body)
  }
}
