import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  type PlanningAuditEvent,
  type PlanningAuditEventType,
  type PlanningExtractionResult,
  type PlanningValidationReport
} from './dto/planning.dto'
import { PLANNING_PERSISTENCE, type PlanningPersistence } from './planning.persistence'

interface RecordAuditInput {
  sessionId: string
  type: PlanningAuditEventType
  status: PlanningAuditEvent['status']
  summary: string
  validation?: PlanningValidationReport | null
  retryCount?: number | null
  modelMetadata?: PlanningExtractionResult['modelMetadata'] | null
}

@Injectable()
export class PlanningAuditService {
  constructor(@Inject(PLANNING_PERSISTENCE) private readonly persistence: PlanningPersistence) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.persistence.appendAuditEvent({
      eventId: `event_${randomUUID()}`,
      sessionId: input.sessionId,
      type: input.type,
      createdAt: new Date().toISOString(),
      status: input.status,
      summary: redactSummary(input.summary),
      validation: input.validation ? redactValidation(input.validation) : null,
      retryCount: input.retryCount ?? null,
      modelMetadata: input.modelMetadata ?? null
    })
  }

  async list(sessionId: string): Promise<PlanningAuditEvent[]> {
    return this.persistence.listAuditEvents(sessionId)
  }
}

function redactValidation(validation: PlanningValidationReport): PlanningValidationReport {
  return {
    ...validation,
    errors: validation.errors.map(redactSummary)
  }
}

function redactSummary(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-secret]')
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[redacted-instruction-override]')
    .replace(/system\s+prompt/gi, '[redacted-system-prompt]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}
