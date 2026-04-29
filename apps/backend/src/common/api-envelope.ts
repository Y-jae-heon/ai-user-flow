export interface ApiError {
  code: string
  message: string
  retryable: boolean
  details?: unknown
}

export interface ApiSuccessEnvelope<TData> {
  success: true
  data: TData
  error: null
}

export interface ApiFailureEnvelope {
  success: false
  data: null
  error: ApiError
}

export function createSuccessEnvelope<TData>(data: TData): ApiSuccessEnvelope<TData> {
  return {
    success: true,
    data,
    error: null
  }
}

export function createFailureEnvelope(error: ApiError): ApiFailureEnvelope {
  return {
    success: false,
    data: null,
    error
  }
}
