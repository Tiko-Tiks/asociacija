import { ERROR_CODE } from './constants'

export class DomainError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
    this.name = 'DomainError'
  }
}

export function authViolation(): never {
  throw new DomainError(ERROR_CODE.AUTH)
}

export function crossOrgViolation(): never {
  throw new DomainError(ERROR_CODE.CROSS_ORG)
}

export function operationFailed(): never {
  throw new DomainError(ERROR_CODE.OPERATION_FAILED)
}

export function accessDenied(): never {
  throw new DomainError(ERROR_CODE.ACCESS_DENIED)
}

