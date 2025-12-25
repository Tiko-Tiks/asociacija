import { describe, it, expect } from 'vitest'
import { mapServerError } from '../error-mapping'
import { ERROR_CODE } from '../constants'

describe('mapServerError', () => {
  it('maps auth_violation to AUTH', () => {
    const result = mapServerError(new Error(ERROR_CODE.AUTH))
    expect(result).toBe('AUTH')
  })

  it('maps cross_org_violation to FORBIDDEN', () => {
    const result = mapServerError(new Error(ERROR_CODE.CROSS_ORG))
    expect(result).toBe('FORBIDDEN')
  })

  it('maps operation_failed to INVALID', () => {
    const result = mapServerError(new Error(ERROR_CODE.OPERATION_FAILED))
    expect(result).toBe('INVALID')
  })

  it('maps unknown error strings to UNKNOWN', () => {
    const result = mapServerError(new Error('some_random_error'))
    expect(result).toBe('UNKNOWN')
  })

  it('maps non-Error values to UNKNOWN', () => {
    const result = mapServerError(null)
    expect(result).toBe('UNKNOWN')
  })
})

