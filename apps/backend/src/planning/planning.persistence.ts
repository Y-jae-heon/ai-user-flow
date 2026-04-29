import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import Redis from 'ioredis'
import { getAppConfig, type AppConfig } from '../config/app.config'
import {
  planningAuditEventSchema,
  planningIdempotencyRecordSchema,
  planningSessionSnapshotSchema,
  storedPlanningSessionSchema,
  type PlanningAuditEvent,
  type PlanningIdempotencyRecord,
  type PlanningSessionSnapshot,
  type StoredPlanningSession
} from './dto/planning.dto'

export const PLANNING_PERSISTENCE = 'PLANNING_PERSISTENCE'

export interface PlanningPersistence {
  saveSession(snapshot: PlanningSessionSnapshot): Promise<void>
  getSession(sessionId: string): Promise<PlanningSessionSnapshot | null>
  deleteSession(sessionId: string): Promise<void>
  claimIdempotency(record: PlanningIdempotencyRecord): Promise<boolean>
  getIdempotencyRecord(scope: string, key: string): Promise<PlanningIdempotencyRecord | null>
  completeIdempotency(scope: string, key: string, response: unknown): Promise<void>
  deleteIdempotency(scope: string, key: string): Promise<void>
  incrementRetry(sessionId: string, operation: string): Promise<number>
  appendAuditEvent(event: PlanningAuditEvent): Promise<void>
  listAuditEvents(sessionId: string): Promise<PlanningAuditEvent[]>
  close(): Promise<void>
}

@Injectable()
export class InMemoryPlanningPersistence implements PlanningPersistence {
  private readonly sessions = new Map<string, { value: StoredPlanningSession; expiresAtMs: number }>()
  private readonly idempotencyRecords = new Map<string, { value: PlanningIdempotencyRecord; expiresAtMs: number }>()
  private readonly retryCounters = new Map<string, { value: number; expiresAtMs: number }>()
  private readonly auditEvents = new Map<string, { values: PlanningAuditEvent[]; expiresAtMs: number }>()

  constructor(private readonly config: AppConfig = getAppConfig()) {}

  async saveSession(snapshot: PlanningSessionSnapshot): Promise<void> {
    const now = new Date()
    const expiresAt = addSeconds(now, this.config.planningSessionTtlSeconds)
    const storedSession = storedPlanningSessionSchema.parse({
      schemaVersion: '2026-04-29',
      savedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      session: snapshot
    })

    this.sessions.set(snapshot.id, {
      value: storedSession,
      expiresAtMs: expiresAt.getTime()
    })
  }

  async getSession(sessionId: string): Promise<PlanningSessionSnapshot | null> {
    const entry = this.sessions.get(sessionId)
    if (!entry || isExpired(entry.expiresAtMs)) {
      this.sessions.delete(sessionId)
      return null
    }

    return planningSessionSnapshotSchema.parse(entry.value.session)
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async claimIdempotency(record: PlanningIdempotencyRecord): Promise<boolean> {
    const key = getIdempotencyKey(record.scope, record.key)
    const existingRecord = await this.getIdempotencyRecord(record.scope, record.key)
    if (existingRecord) {
      return false
    }

    this.idempotencyRecords.set(key, {
      value: planningIdempotencyRecordSchema.parse(record),
      expiresAtMs: new Date(record.expiresAt).getTime()
    })
    return true
  }

  async getIdempotencyRecord(scope: string, key: string): Promise<PlanningIdempotencyRecord | null> {
    const recordKey = getIdempotencyKey(scope, key)
    const entry = this.idempotencyRecords.get(recordKey)
    if (!entry || isExpired(entry.expiresAtMs)) {
      this.idempotencyRecords.delete(recordKey)
      return null
    }

    return planningIdempotencyRecordSchema.parse(entry.value)
  }

  async completeIdempotency(scope: string, key: string, response: unknown): Promise<void> {
    const recordKey = getIdempotencyKey(scope, key)
    const entry = this.idempotencyRecords.get(recordKey)
    if (!entry || isExpired(entry.expiresAtMs)) {
      return
    }

    this.idempotencyRecords.set(recordKey, {
      ...entry,
      value: planningIdempotencyRecordSchema.parse({
        ...entry.value,
        status: 'completed',
        response
      })
    })
  }

  async deleteIdempotency(scope: string, key: string): Promise<void> {
    this.idempotencyRecords.delete(getIdempotencyKey(scope, key))
  }

  async incrementRetry(sessionId: string, operation: string): Promise<number> {
    const key = `${sessionId}:${operation}`
    const existingCounter = this.retryCounters.get(key)
    const now = Date.now()
    const expiresAtMs = existingCounter && !isExpired(existingCounter.expiresAtMs) ? existingCounter.expiresAtMs : now + this.config.planningSessionTtlSeconds * 1000
    const value = existingCounter && !isExpired(existingCounter.expiresAtMs) ? existingCounter.value + 1 : 1

    this.retryCounters.set(key, {
      value,
      expiresAtMs
    })
    return value
  }

  async appendAuditEvent(event: PlanningAuditEvent): Promise<void> {
    const parsedEvent = planningAuditEventSchema.parse(event)
    const existingEvents = this.auditEvents.get(parsedEvent.sessionId)
    const expiresAtMs = Date.now() + this.config.planningAuditTtlSeconds * 1000

    this.auditEvents.set(parsedEvent.sessionId, {
      values: [...(existingEvents && !isExpired(existingEvents.expiresAtMs) ? existingEvents.values : []), parsedEvent].slice(-50),
      expiresAtMs
    })
  }

  async listAuditEvents(sessionId: string): Promise<PlanningAuditEvent[]> {
    const entry = this.auditEvents.get(sessionId)
    if (!entry || isExpired(entry.expiresAtMs)) {
      this.auditEvents.delete(sessionId)
      return []
    }

    return entry.values.map((event) => planningAuditEventSchema.parse(event))
  }

  async close(): Promise<void> {}
}

export class RedisPlanningPersistence implements PlanningPersistence {
  private readonly redis: Redis

  constructor(private readonly config: AppConfig = getAppConfig(), redis?: Redis) {
    if (!config.redisUrl && !redis) {
      throw new Error('REDIS_URL is required for Redis planning persistence.')
    }

    this.redis =
      redis ??
      new Redis(config.redisUrl!, {
        lazyConnect: true,
        maxRetriesPerRequest: 2
      })
  }

  async saveSession(snapshot: PlanningSessionSnapshot): Promise<void> {
    const now = new Date()
    const expiresAt = addSeconds(now, this.config.planningSessionTtlSeconds)
    const storedSession = storedPlanningSessionSchema.parse({
      schemaVersion: '2026-04-29',
      savedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      session: snapshot
    })

    await this.redis.set(getSessionKey(snapshot.id), JSON.stringify(storedSession), 'EX', this.config.planningSessionTtlSeconds)
  }

  async getSession(sessionId: string): Promise<PlanningSessionSnapshot | null> {
    const value = await this.redis.get(getSessionKey(sessionId))
    if (!value) {
      return null
    }

    try {
      return storedPlanningSessionSchema.parse(JSON.parse(value)).session
    } catch {
      throw new BadRequestException({
        code: 'PERSISTENCE_CORRUPTED',
        message: 'Stored planning session could not be validated.',
        retryable: true
      })
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(getSessionKey(sessionId))
  }

  async claimIdempotency(record: PlanningIdempotencyRecord): Promise<boolean> {
    const claimed = await this.redis.set(
      getIdempotencyKey(record.scope, record.key),
      JSON.stringify(planningIdempotencyRecordSchema.parse(record)),
      'EX',
      this.config.planningIdempotencyTtlSeconds,
      'NX'
    )

    return claimed === 'OK'
  }

  async getIdempotencyRecord(scope: string, key: string): Promise<PlanningIdempotencyRecord | null> {
    const value = await this.redis.get(getIdempotencyKey(scope, key))
    if (!value) {
      return null
    }

    return planningIdempotencyRecordSchema.parse(JSON.parse(value))
  }

  async completeIdempotency(scope: string, key: string, response: unknown): Promise<void> {
    const record = await this.getIdempotencyRecord(scope, key)
    if (!record) {
      return
    }

    await this.redis.set(
      getIdempotencyKey(scope, key),
      JSON.stringify(
        planningIdempotencyRecordSchema.parse({
          ...record,
          status: 'completed',
          response
        })
      ),
      'EX',
      this.config.planningIdempotencyTtlSeconds
    )
  }

  async deleteIdempotency(scope: string, key: string): Promise<void> {
    await this.redis.del(getIdempotencyKey(scope, key))
  }

  async incrementRetry(sessionId: string, operation: string): Promise<number> {
    const key = getRetryKey(sessionId, operation)
    const value = await this.redis.incr(key)

    if (value === 1) {
      await this.redis.expire(key, this.config.planningSessionTtlSeconds)
    }

    return value
  }

  async appendAuditEvent(event: PlanningAuditEvent): Promise<void> {
    const parsedEvent = planningAuditEventSchema.parse(event)
    const key = getAuditKey(parsedEvent.sessionId)

    await this.redis.rpush(key, JSON.stringify(parsedEvent))
    await this.redis.ltrim(key, -50, -1)
    await this.redis.expire(key, this.config.planningAuditTtlSeconds)
  }

  async listAuditEvents(sessionId: string): Promise<PlanningAuditEvent[]> {
    const values = await this.redis.lrange(getAuditKey(sessionId), 0, -1)
    return values.map((value) => planningAuditEventSchema.parse(JSON.parse(value)))
  }

  async close(): Promise<void> {
    this.redis.disconnect()
  }
}

export function createPlanningPersistence(config: AppConfig = getAppConfig()): PlanningPersistence {
  if (config.redisUrl) {
    return new RedisPlanningPersistence(config)
  }

  return new InMemoryPlanningPersistence(config)
}

export async function requirePlanningSession(persistence: PlanningPersistence, sessionId: string): Promise<PlanningSessionSnapshot> {
  const session = await persistence.getSession(sessionId)
  if (!session) {
    throw new NotFoundException({
      code: 'PLANNING_SESSION_NOT_FOUND',
      message: 'Planning session was not found or has expired.',
      retryable: false
    })
  }

  return session
}

function getSessionKey(sessionId: string): string {
  return `planning:session:${sessionId}`
}

function getIdempotencyKey(scope: string, key: string): string {
  return `planning:idempotency:${scope}:${key}`
}

function getRetryKey(sessionId: string, operation: string): string {
  return `planning:retry:${sessionId}:${operation}`
}

function getAuditKey(sessionId: string): string {
  return `planning:audit:${sessionId}`
}

function addSeconds(value: Date, seconds: number): Date {
  return new Date(value.getTime() + seconds * 1000)
}

function isExpired(expiresAtMs: number): boolean {
  return expiresAtMs <= Date.now()
}
