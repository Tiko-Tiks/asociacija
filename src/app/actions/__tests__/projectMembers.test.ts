import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  listProjectMembers,
} from '../projectMembers'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ERROR_CODE } from '@/app/domain/constants'
import { PROJECT_ROLE } from '@/app/domain/constants'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('addProjectMember', () => {
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

  it(`throws '${ERROR_CODE.AUTH}' when user is not authenticated`, async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(
      addProjectMember('project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.AUTH)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when membership not found`, async () => {
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

    await expect(
      addProjectMember(
        'project-id',
        'invalid-membership-id',
        'user-id',
        PROJECT_ROLE.VIEWER
      )
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when membership.status !== ACTIVE`, async () => {
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

    await expect(
      addProjectMember('project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when membership.user_id !== auth.uid()`, async () => {
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

    await expect(
      addProjectMember('project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when project not found`, async () => {
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

    const mockProjectSelect: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectSelect
      }
      return {}
    })

    await expect(
      addProjectMember('invalid-project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when org mismatch`, async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          org_id: 'org-1',
          status: 'ACTIVE',
          user_id: 'user-id',
        },
        error: null,
      }),
    }

    const mockProjectSelect: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-2',
        },
        error: null,
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        return mockProjectSelect
      }
      return {}
    })

    await expect(
      addProjectMember('project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when role = VIEWER (cannot edit)`, async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.VIEWER },
        error: null,
      }),
    }

    let projectsCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    await expect(
      addProjectMember('project-id', 'membership-id', 'user-id', PROJECT_ROLE.VIEWER)
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it('succeeds when role = OWNER', async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.OWNER },
        error: null,
      }),
    }

    const mockProjectMemberInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'member-id' },
        error: null,
      }),
    }

    let projectsCallCount = 0
    let projectMembersCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }
    const projectMembersTableForSelect: any = {
      select: vi.fn(() => mockProjectMemberQuery),
    }
    const projectMembersTableForInsert: any = {
      insert: vi.fn(() => mockProjectMemberInsert),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        projectMembersCallCount++
        if (projectMembersCallCount === 1) {
          return projectMembersTableForSelect
        } else {
          return projectMembersTableForInsert
        }
      }
      return {}
    })

    const result = await addProjectMember(
      'project-id',
      'membership-id',
      'target-user-id',
      PROJECT_ROLE.VIEWER
    )

    expect(result).toEqual({ id: 'member-id' })
    expect(projectMembersTableForInsert.insert).toHaveBeenCalledWith({
      project_id: 'project-id',
      user_id: 'target-user-id',
      role: PROJECT_ROLE.VIEWER,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-id')
  })

  it('succeeds when role = EDITOR', async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.EDITOR },
        error: null,
      }),
    }

    const mockProjectMemberInsert: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'member-id' },
        error: null,
      }),
    }

    let projectsCallCount = 0
    let projectMembersCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }
    const projectMembersTableForSelect: any = {
      select: vi.fn(() => mockProjectMemberQuery),
    }
    const projectMembersTableForInsert: any = {
      insert: vi.fn(() => mockProjectMemberInsert),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        projectMembersCallCount++
        if (projectMembersCallCount === 1) {
          return projectMembersTableForSelect
        } else {
          return projectMembersTableForInsert
        }
      }
      return {}
    })

    const result = await addProjectMember(
      'project-id',
      'membership-id',
      'target-user-id',
      PROJECT_ROLE.EDITOR
    )

    expect(result).toEqual({ id: 'member-id' })
    expect(projectMembersTableForInsert.insert).toHaveBeenCalledWith({
      project_id: 'project-id',
      user_id: 'target-user-id',
      role: PROJECT_ROLE.EDITOR,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-id')
  })
})

describe('removeProjectMember', () => {
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

  it(`throws '${ERROR_CODE.AUTH}' when user is not authenticated`, async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(
      removeProjectMember('project-id', 'membership-id', 'user-id')
    ).rejects.toThrow(ERROR_CODE.AUTH)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when role !== OWNER`, async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.EDITOR },
        error: null,
      }),
    }

    let projectsCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    await expect(
      removeProjectMember('project-id', 'membership-id', 'target-user-id')
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it('succeeds when role = OWNER', async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.OWNER },
        error: null,
      }),
    }

    const mockProjectMemberDelete: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'member-id' },
        error: null,
      }),
    }

    let projectsCallCount = 0
    let projectMembersCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }
    const projectMembersTableForSelect: any = {
      select: vi.fn(() => mockProjectMemberQuery),
    }
    const projectMembersTableForDelete: any = {
      delete: vi.fn(() => mockProjectMemberDelete),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        projectMembersCallCount++
        if (projectMembersCallCount === 1) {
          return projectMembersTableForSelect
        } else {
          return projectMembersTableForDelete
        }
      }
      return {}
    })

    const result = await removeProjectMember(
      'project-id',
      'membership-id',
      'target-user-id'
    )

    expect(result).toEqual({ id: 'member-id' })
    expect(projectMembersTableForDelete.delete).toHaveBeenCalled()
    expect(mockProjectMemberDelete.eq).toHaveBeenCalledWith('project_id', 'project-id')
    expect(mockProjectMemberDelete.eq).toHaveBeenCalledWith('user_id', 'target-user-id')
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-id')
  })
})

describe('updateProjectMemberRole', () => {
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

  it(`throws '${ERROR_CODE.AUTH}' when user is not authenticated`, async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    await expect(
      updateProjectMemberRole(
        'project-id',
        'membership-id',
        'user-id',
        PROJECT_ROLE.EDITOR
      )
    ).rejects.toThrow(ERROR_CODE.AUTH)
  })

  it(`throws '${ERROR_CODE.CROSS_ORG}' when role !== OWNER`, async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.EDITOR },
        error: null,
      }),
    }

    let projectsCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    await expect(
      updateProjectMemberRole(
        'project-id',
        'membership-id',
        'target-user-id',
        PROJECT_ROLE.EDITOR
      )
    ).rejects.toThrow(ERROR_CODE.CROSS_ORG)
  })

  it('succeeds when role = OWNER', async () => {
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

    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
        },
        error: null,
      }),
    }

    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: PROJECT_ROLE.OWNER },
        error: null,
      }),
    }

    const mockProjectMemberUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'member-id' },
        error: null,
      }),
    }

    let projectsCallCount = 0
    let projectMembersCallCount = 0
    const projectsTableForMembership: any = {
      select: vi.fn(() => mockProjectSelectForMembership),
    }
    const projectsTableForRole: any = {
      select: vi.fn(() => mockProjectSelectForRole),
    }
    const projectMembersTableForSelect: any = {
      select: vi.fn(() => mockProjectMemberQuery),
    }
    const projectMembersTableForUpdate: any = {
      update: vi.fn(() => mockProjectMemberUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else {
          return projectsTableForRole
        }
      }
      if (table === 'project_members') {
        projectMembersCallCount++
        if (projectMembersCallCount === 1) {
          return projectMembersTableForSelect
        } else {
          return projectMembersTableForUpdate
        }
      }
      return {}
    })

    const result = await updateProjectMemberRole(
      'project-id',
      'membership-id',
      'target-user-id',
      PROJECT_ROLE.EDITOR
    )

    expect(result).toEqual({ id: 'member-id' })
    expect(projectMembersTableForUpdate.update).toHaveBeenCalledWith({
      role: PROJECT_ROLE.EDITOR,
    })
    expect(mockProjectMemberUpdate.eq).toHaveBeenCalledWith('project_id', 'project-id')
    expect(mockProjectMemberUpdate.eq).toHaveBeenCalledWith('user_id', 'target-user-id')
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-id')
  })
})

describe('listProjectMembers', () => {
  const mockSupabase: any = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it('returns members', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })

    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: '1', user_id: 'u1', role: 'OWNER' }],
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(query)

    const res = await listProjectMembers('p1')
    expect(res.length).toBe(1)
  })
})

