import { ERROR_CODE } from '@/app/domain/constants'

export type UiError =
  | 'AUTH'
  | 'FORBIDDEN'
  | 'INVALID'
  | 'UNKNOWN'

export function mapServerError(err: unknown): UiError {
  if (!(err instanceof Error)) return 'UNKNOWN'

  switch (err.message) {
    case ERROR_CODE.AUTH:
      return 'AUTH'

    case ERROR_CODE.CROSS_ORG:
      return 'FORBIDDEN'

    case ERROR_CODE.OPERATION_FAILED:
      return 'INVALID'

    default:
      return 'UNKNOWN'
  }
}

