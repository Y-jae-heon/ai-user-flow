import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { getAppConfig, type AppConfig } from '../config/app.config'
import { PLANNING_PERSISTENCE, type PlanningPersistence } from './planning.persistence'

@Injectable()
export class PlanningRetryCounterService {
  constructor(
    @Inject(PLANNING_PERSISTENCE) private readonly persistence: PlanningPersistence
  ) {}

  private readonly config: AppConfig = getAppConfig()

  async incrementOrThrow(sessionId: string, operation: string): Promise<number> {
    const retryCount = await this.persistence.incrementRetry(sessionId, operation)
    if (retryCount > this.config.planningMaxGenerationRetries) {
      throw new HttpException(
        {
        code: 'PLANNING_RETRY_LIMIT_EXCEEDED',
        message: 'Planning operation retry limit was exceeded.',
        retryable: false,
        details: {
          sessionId,
          operation,
          retryCount,
          maxRetries: this.config.planningMaxGenerationRetries
        }
        },
        HttpStatus.TOO_MANY_REQUESTS
      )
    }

    return retryCount
  }
}
