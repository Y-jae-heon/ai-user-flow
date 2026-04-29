import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { PlanningService } from './planning.service'

@Controller('api/planning-sessions')
@UseGuards(ThrottlerGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  createPlanningSession(@Body() body: unknown, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.planningService.createPlanningSession(body, idempotencyKey)
  }

  @Get(':sessionId')
  getPlanningSession(@Param('sessionId') sessionId: string) {
    return this.planningService.getPlanningSession(sessionId)
  }

  @Post(':sessionId/analyze')
  analyzePlanningSession(@Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.planningService.analyzePlanningSession(sessionId, body, idempotencyKey)
  }

  @Post(':sessionId/mermaid/validate')
  validateMermaid(@Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.planningService.validateMermaid(sessionId, body, idempotencyKey)
  }

  @Post(':sessionId/mermaid')
  generateMermaid(@Param('sessionId') sessionId: string, @Body() body: unknown, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.planningService.generateMermaid(sessionId, body, idempotencyKey)
  }
}
