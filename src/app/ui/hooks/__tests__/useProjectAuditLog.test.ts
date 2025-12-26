import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/app/ui/errors', () => ({
  mapServerError: (e: unknown) => {
    if (e instanceof Error) return 'FORBIDDEN'
    return 'UNKNOWN'
  },
}))

vi.mock('@/app/actions/projectAuditLog', () => ({
  listProjectAuditLog: vi.fn().mockResolvedValue([]),
}))

describe('useProjectAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hook exists and can be imported', async () => {
    const mod = await import('../useProjectAuditLog')
    expect(mod.useProjectAuditLog).toBeDefined()
    expect(typeof mod.useProjectAuditLog).toBe('function')
  })
})

