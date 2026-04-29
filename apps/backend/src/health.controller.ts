import { Controller, Get } from '@nestjs/common'
import { createSuccessEnvelope } from './common/api-envelope'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return createSuccessEnvelope({
      status: 'ok'
    })
  }
}
