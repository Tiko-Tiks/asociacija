import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listProjectAuditLog } from '../projectAuditLog'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuth,
  loadActiveMembership,
  loadProjectForMembership,
} from '../_guards'
import { ERROR_CODE } from '@/app/domain/constants'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('../_guards', () => ({
  requireAuth: vi.fn(),
  loadActiveMembership: vi.fn(),
  loadProjectForMembership: vi.fn(),
}))

describe('listProjectAuditLog', () => {
  const mockSupabase: any = {
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    ;(requireAuth as any).mockResolvedValue({ id: 'user-1' })
    ;(loadActiveMembership as any).mockResolvedValue({
      org_id: 'org-1',
      status: 'ACTIVE',
      user_id: 'user-1',
    })
    ;(loadProjectForMembership as any).mockResolvedValue({
      id: 'project-1',
      org_id: 'org-1',
    })
  })

  it('returns audit log rows', async () => {
    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'log-1',
            created_at: '2024-01-01T00:00:00Z',
            action: 'MEMBER_ADDED',
            actor_user_id: 'user-1',
            target_user_id: 'user-2',
            meta: {},
          },
        ],
        error: null,
      }),
    }
    mockSupabase.from.mockReturnValue(query)

    const result = await listProjectAuditLog('project-1', 'membership-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('log-1')
    expect(result[0].action).toBe('MEMBER_ADDED')
  })

  it(`throws '${ERROR_CODE.AUTH}' when user is not authenticated`, async () => {
    ;(requireAuth as any).mockRejectedValue(new Error(ERROR_CODE.AUTH))

    await expect(
      listProjectAuditLog('project-1', 'membership-1')
    ).rejects.toThrow(ERROR_CODE.AUTH)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when membership not found`, async () => {
    ;(loadActiveMembership as any).mockRejectedValue(
      new Error(ERROR_CODE.CROSS_ORG)
    )

    await expect(
      listProjectAuditLog('project-1', 'membership-1')
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.AUTH}' on RLS error (code 42501)`, async () => {
    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501' },
      }),
    }
    mockSupabase.from.mockReturnValue(query)

    await expect(
      listProjectAuditLog('project-1', 'membership-1')
    ).rejects.toThrow(ERROR_CODE.AUTH)
  })

  it(`throws '${ERROR_CODE.OPERATION_FAILED}' when query fails`, async () => {
    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      }),
    }
    mockSupabase.from.mockReturnValue(query)

    await expect(
      listProjectAuditLog('project-1', 'membership-1')
    ).rejects.toThrow(ERROR_CODE.OPERATION_FAILED)
  })
})

