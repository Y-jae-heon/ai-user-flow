import { GUARDS_METADATA } from '@nestjs/common/constants'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'
import { PlanningController } from './planning.controller'
import { PlanningModule } from './planning.module'

describe('PlanningModule throttling scope', () => {
  it('does not register planning throttling as a global app guard', () => {
    const providers = (Reflect.getMetadata('providers', PlanningModule) ?? []) as Array<{ provide?: unknown }>

    expect(providers.some((provider) => provider.provide === APP_GUARD)).toBe(false)
  })

  it('scopes throttling to the planning controller', () => {
    const guards = (Reflect.getMetadata(GUARDS_METADATA, PlanningController) ?? []) as unknown[]

    expect(guards).toContain(ThrottlerGuard)
  })
})
