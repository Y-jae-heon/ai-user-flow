import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { getAppConfig } from './config/app.config'

async function bootstrap(): Promise<void> {
  const config = getAppConfig()
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.enableCors({
    origin: config.frontendOrigin,
    credentials: false
  })
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(config.port)
}

void bootstrap()
