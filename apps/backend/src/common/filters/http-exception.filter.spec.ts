import { ArgumentsHost, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { HttpExceptionFilter } from './http-exception.filter'

function createHost() {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  const response = { status } as unknown as Response
  const host = {
    switchToHttp: () => ({
      getResponse: () => response
    })
  } as ArgumentsHost

  return { host, status, json }
}

describe('HttpExceptionFilter', () => {
  it('returns a generic message for unexpected errors', () => {
    const { host, status, json } = createHost()
    const filter = new HttpExceptionFilter()

    filter.catch(new Error('database password leaked in driver error'), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
        retryable: true
      }
    })
  })
})
