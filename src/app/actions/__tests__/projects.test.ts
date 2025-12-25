import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createProject, listProjects } from '../projects'
import { createClient } from '@/lib/supabase/server'

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock revalidatePath
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

  it("throws 'cross_org_violation' when membership does not exist", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery = {
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

  it("throws 'cross_org_violation' when membership status is not ACTIVE", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery = {
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

  it("throws 'cross_org_violation' when membership.user_id != auth.uid()", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery = {
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

  it('succeeds when membership is ACTIVE and owned by user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery = {
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

    const mockProjectInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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

    const result = await createProject('membership-id', 'Project Name')

    expect(result).toEqual({ id: 'project-id' })
    expect(mockProjectInsert.insert).toHaveBeenCalledWith({
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

  it("throws 'auth_violation' when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(listProjects()).rejects.toThrow('auth_violation')
  })

  it('returns empty array when user has no ACTIVE memberships', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEq = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    const firstEq = vi.fn().mockReturnValue({
      eq: secondEq,
    })

    const mockMembershipQuery = {
      select: vi.fn().mockReturnValue({
        eq: firstEq,
      }),
    }

    mockSupabase.from.mockReturnValue(mockMembershipQuery)

    const result = await listProjects()

    expect(result).toEqual([])
  })

  it('returns only projects belonging to orgs with ACTIVE membership', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const secondEqMembership = vi.fn().mockResolvedValue({
      data: [{ org_id: 'org-1' }, { org_id: 'org-2' }],
      error: null,
    })

    const firstEqMembership = vi.fn().mockReturnValue({
      eq: secondEqMembership,
    })

    const mockMembershipQuery = {
      select: vi.fn().mockReturnValue({
        eq: firstEqMembership,
      }),
    }

    const mockProjectQuery = {
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

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectQuery
      }
      return {}
    })

    const result = await listProjects()

    expect(result).toEqual([
      { id: 'project-1', name: 'Project 1', org_id: 'org-1' },
      { id: 'project-2', name: 'Project 2', org_id: 'org-2' },
    ])

    expect(mockProjectQuery.in).toHaveBeenCalledWith('org_id', ['org-1', 'org-2'])
    expect(mockProjectQuery.select).toHaveBeenCalledWith('id, name, org_id')
  })
})

