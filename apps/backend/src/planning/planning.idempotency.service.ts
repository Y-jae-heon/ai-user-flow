import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { getAppConfig, type AppConfig } from '../config/app.config'
import type { ApiSuccessEnvelope } from '../common/api-envelope'
import { PLANNING_PERSISTENCE, type PlanningPersistence } from './planning.persistence'
import { Inject } from '@nestjs/common'

interface IdempotencyScope {
  method: string
  path: string
  sessionId?: string
}

interface IdempotencyOptions<TData> {
  key?: string | null
  scope: IdempotencyScope
  requestBody: unknown
  execute: () => Promise<ApiSuccessEnvelope<TData>>
}

@Injectable()
export class PlanningIdempotencyService {
  constructor(
    @Inject(PLANNING_PERSISTENCE) private readonly persistence: PlanningPersistence
  ) {}

  private readonly config: AppConfig = getAppConfig()

  async run<TData>(options: IdempotencyOptions<TData>): Promise<ApiSuccessEnvelope<TData>> {
    const key = normalizeIdempotencyKey(options.key)
    if (!key) {
      return options.execute()
    }

    const scope = createScope(options.scope)
    const requestHash = hashRequestBody(options.requestBody)
    const existingRecord = await this.persistence.getIdempotencyRecord(scope, key)

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_CONFLICT',
          message: 'Idempotency key was already used with a different request.',
          retryable: false
        })
      }

      if (existingRecord.status === 'completed') {
        return existingRecord.response as ApiSuccessEnvelope<TData>
      }

      throw new ConflictException({
        code: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'Idempotent request is still in progress.',
        retryable: true
      })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.planningIdempotencyTtlSeconds * 1000)
    const claimed = await this.persistence.claimIdempotency({
      schemaVersion: '2026-04-29',
      key,
      scope,
      requestHash,
      status: 'in_progress',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      response: null
    })

    if (!claimed) {
      return this.run(options)
    }

    try {
      const response = await options.execute()
      await this.persistence.completeIdempotency(scope, key, response)
      return response
    } catch (error) {
      await this.persistence.deleteIdempotency(scope, key)
      throw error
    }
  }
}

function normalizeIdempotencyKey(key: string | null | undefined): string | null {
  const normalizedKey = key?.trim()
  if (!normalizedKey) {
    return null
  }

  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(normalizedKey)) {
    throw new BadRequestException({
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key must be 8-120 characters using letters, numbers, dot, colon, underscore, or dash.',
      retryable: false
    })
  }

  return normalizedKey
}

function createScope(scope: IdempotencyScope): string {
  return [scope.method.toUpperCase(), scope.path, scope.sessionId ?? 'none'].join(':')
}

function hashRequestBody(requestBody: unknown): string {
  return createHash('sha256').update(stableStringify(requestBody)).digest('hex')
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'undefined'
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}
