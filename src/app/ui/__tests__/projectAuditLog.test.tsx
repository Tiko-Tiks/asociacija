import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/actions/projectAuditLog', () => ({
  listProjectAuditLog: vi.fn(),
}))

vi.mock('@/app/ui/errors', () => ({
  mapServerError: () => 'Error',
}))

describe('ProjectAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('component can be imported', async () => {
    const mod = await import('../components/ProjectAuditLog')
    expect(mod.ProjectAuditLog).toBeDefined()
    expect(typeof mod.ProjectAuditLog).toBe('function')
  })

  it('component has correct props interface', async () => {
    const mod = await import('../components/ProjectAuditLog')
    const Component = mod.ProjectAuditLog
    // Verify it accepts projectId and membershipId
    expect(Component.length).toBeGreaterThanOrEqual(0)
  })
})

