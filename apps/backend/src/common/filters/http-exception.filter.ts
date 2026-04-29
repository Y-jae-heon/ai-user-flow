import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { createFailureEnvelope } from '../api-envelope'

interface ErrorResponseBody {
  code?: string
  message?: string
  retryable?: boolean
  details?: unknown
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = normalizeHttpExceptionBody(exception.getResponse())

      response.status(status).json(
        createFailureEnvelope({
          code: body.code ?? defaultCodeForStatus(status),
          message: body.message ?? 'Request failed.',
          retryable: body.retryable ?? status >= 500,
          ...(body.details !== undefined && { details: body.details })
        })
      )
      return
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      createFailureEnvelope({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
        retryable: true
      })
    )
  }
}

function normalizeHttpExceptionBody(value: unknown): ErrorResponseBody {
  if (typeof value === 'string') {
    return {
      message: value
    }
  }

  if (value && typeof value === 'object') {
    return value as ErrorResponseBody
  }

  return {}
}

function defaultCodeForStatus(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) {
    return 'VALIDATION_FAILED'
  }

  if (status === HttpStatus.NOT_FOUND) {
    return 'NOT_FOUND'
  }

  if (status === HttpStatus.NOT_IMPLEMENTED) {
    return 'NOT_IMPLEMENTED'
  }

  return 'REQUEST_FAILED'
}
