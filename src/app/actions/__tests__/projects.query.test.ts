import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createProject, listProjects } from '../projects'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createProject', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  it("throws 'auth_violation' when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'auth_violation'
    )
  })

  it("throws 'cross_org_violation' when membership not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership is not ACTIVE", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-id',
          member_status: 'SUSPENDED',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.user_id !== auth.uid()", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-id',
          member_status: 'ACTIVE',
          user_id: 'different-user-id',
        },
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'auth_violation' on RLS error (code 42501)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-id',
          member_status: 'ACTIVE',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    const mockProjectInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS violation' },
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectInsert
      }
      return {}
    })

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'auth_violation'
    )
  })

  it('returns success=false when insert fails (non-RLS error)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-id',
          member_status: 'ACTIVE',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    const mockProjectInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectInsert
      }
      return {}
    })

    const result = await createProject('membership-id', 'Project Name')

    expect(result).toEqual({ success: false, error: 'OPERATION_FAILED' })
  })

  it('succeeds and trims title', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-id',
          member_status: 'ACTIVE',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    const mockProjectInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
          idea_id: null,
          title: 'Project Name',
          description: null,
          status: 'PLANNING',
          budget_eur: 0,
          created_by: 'user-id',
          created_at: '2026-01-01T00:00:00.000Z',
          funding_opened_at: '2026-01-01T00:00:00.000Z',
          completed_at: null,
        },
        error: null,
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectInsert
      }
      return {}
    })

    const result = await createProject('membership-id', '  Project Name  ')

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('project-id')
    expect(result.data?.title).toBe('Project Name')
  })
})

describe('listProjects', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  it("throws 'auth_violation' when user not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(listProjects('org-id')).rejects.toThrow('auth_violation')
  })

  it('returns [] when no projects', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(mockProjectQuery)

    const result = await listProjects('org-id')

    expect(result).toEqual([])
  })

  it("throws 'operation_failed' when query fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      }),
    }

    mockSupabase.from.mockReturnValue(mockProjectQuery)

    await expect(listProjects('org-id')).rejects.toThrow('operation_failed')
  })

  it("throws 'auth_violation' on RLS error (42501)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS violation' },
      }),
    }

    mockSupabase.from.mockReturnValue(mockProjectQuery)

    await expect(listProjects('org-id')).rejects.toThrow('auth_violation')
  })

  it('succeeds: only projects for org returned', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'project-1', org_id: 'org-id', title: 'Project 1', status: 'PLANNING' },
          { id: 'project-2', org_id: 'org-id', title: 'Project 2', status: 'PLANNING' },
        ],
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(mockProjectQuery)

    const result = await listProjects('org-id')

    expect(result).toEqual([
      expect.objectContaining({ id: 'project-1', org_id: 'org-id' }),
      expect.objectContaining({ id: 'project-2', org_id: 'org-id' }),
    ])
  })
})
