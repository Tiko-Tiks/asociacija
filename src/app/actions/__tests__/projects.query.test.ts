import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
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

    await expect(createProject('invalid-membership-id', 'Project Name')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.status !== 'ACTIVE'", async () => {
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
          status: 'SUSPENDED',
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
          status: 'ACTIVE',
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
          status: 'ACTIVE',
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

    const projectsTable: any = {
      insert: vi.fn(() => mockProjectInsert),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return projectsTable
      }
      return {}
    })

    await expect(createProject('membership-id', 'Project Name')).rejects.toThrow(
      'auth_violation'
    )
  })

  it('succeeds: inserts with org_id from membership, name trimmed, status DRAFT, returns project id', async () => {
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
          status: 'ACTIVE',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    const mockProjectInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const projectsTable: any = {
      insert: vi.fn(() => mockProjectInsert),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return projectsTable
      }
      return {}
    })

    const result = await createProject('membership-id', '  Project Name  ')

    expect(result).toEqual({ id: 'project-id' })
    expect(projectsTable.insert).toHaveBeenCalledWith({
      org_id: 'org-id',
      membership_id: 'membership-id',
      name: 'Project Name',
      status: 'DRAFT',
    })
  })
})

describe('listProjects', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it("throws 'auth_violation' when user not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(listProjects()).rejects.toThrow('auth_violation')
  })

  it("returns [] when no ACTIVE memberships", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEq: any = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    const firstEq: any = vi.fn().mockReturnValue({
      eq: secondEq,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnValue({
        eq: firstEq,
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    const result = await listProjects()

    expect(result).toEqual([])
  })

  it("throws 'operation_failed' when memberships query fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEq: any = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Query failed' },
    })

    const firstEq: any = vi.fn().mockReturnValue({
      eq: secondEq,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnValue({
        eq: firstEq,
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    await expect(listProjects()).rejects.toThrow('operation_failed')
  })

  it("throws 'auth_violation' on RLS error (42501)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEqMembership: any = vi.fn().mockResolvedValue({
      data: [{ org_id: 'org-id' }],
      error: null,
    })

    const firstEqMembership: any = vi.fn().mockReturnValue({
      eq: secondEqMembership,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnValue({
        eq: firstEqMembership,
      }),
    }

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS violation' },
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return projectsTable
      }
      return {}
    })

    await expect(listProjects()).rejects.toThrow('auth_violation')
  })

  it('succeeds: only projects from ACTIVE memberships returned, selects only id, name, org_id', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEqMembership: any = vi.fn().mockResolvedValue({
      data: [{ org_id: 'org-1' }, { org_id: 'org-2' }],
      error: null,
    })

    const firstEqMembership: any = vi.fn().mockReturnValue({
      eq: secondEqMembership,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnValue({
        eq: firstEqMembership,
      }),
    }

    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'project-1', name: 'Project 1', org_id: 'org-1' },
          { id: 'project-2', name: 'Project 2', org_id: 'org-2' },
        ],
        error: null,
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return projectsTable
      }
      return {}
    })

    const result = await listProjects()

    expect(result).toEqual([
      { id: 'project-1', name: 'Project 1', org_id: 'org-1' },
      { id: 'project-2', name: 'Project 2', org_id: 'org-2' },
    ])
    expect(projectsTable.select).toHaveBeenCalledWith('id, name, org_id')
    expect(mockProjectQuery.in).toHaveBeenCalledWith('org_id', ['org-1', 'org-2'])
  })
})

