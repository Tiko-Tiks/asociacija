import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  updateProjectName,
  deleteProject,
  archiveProject,
  restoreProject,
} from '../projects'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateProjectName', () => {
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

    await expect(
      updateProjectName('project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('auth_violation')
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

    await expect(
      updateProjectName('project-id', 'invalid-membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it("throws 'cross_org_violation' when membership status is not ACTIVE", async () => {
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
      updateProjectName('project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it("throws 'cross_org_violation' when membership.user_id != auth.uid()", async () => {
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
      updateProjectName('project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it("throws 'cross_org_violation' when project not found", async () => {
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
      updateProjectName('invalid-project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it("throws 'cross_org_violation' when membership.org_id !== project.org_id", async () => {
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
      updateProjectName('project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it('succeeds when all validations pass', async () => {
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

    // Mock for loadProjectForMembership (selects id, org_id)
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

    // Mock for loadProjectRole - project query (selects id only)
    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    // Mock for loadProjectRole - project_members query (selects role)
    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'OWNER' },
        error: null,
      }),
    }

    const mockProjectUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForUpdate: any = {
      update: vi.fn(() => mockProjectUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          // First call: loadProjectForMembership
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          // Second call: loadProjectRole
          return projectsTableForRole
        } else {
          // Third call: update
          return projectsTableForUpdate
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await updateProjectName('project-id', 'membership-id', 'New Name')

    expect(result).toEqual({ id: 'project-id' })
    expect(projectsTableForUpdate.update).toHaveBeenCalledWith({ name: 'New Name' })
    expect(mockProjectUpdate.eq).toHaveBeenCalledWith('id', 'project-id')
  })

  it("throws 'cross_org_violation' when user has VIEWER role (cannot edit)", async () => {
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
        data: { role: 'VIEWER' },
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
      updateProjectName('project-id', 'membership-id', 'New Name')
    ).rejects.toThrow('cross_org_violation')
  })

  it('succeeds when user has EDITOR role (can edit)', async () => {
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
        data: { role: 'EDITOR' },
        error: null,
      }),
    }

    const mockProjectUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForUpdate: any = {
      update: vi.fn(() => mockProjectUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          return projectsTableForRole
        } else {
          return projectsTableForUpdate
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await updateProjectName('project-id', 'membership-id', 'New Name')

    expect(result).toEqual({ id: 'project-id' })
  })
})

describe('deleteProject', () => {
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

    await expect(deleteProject('project-id', 'membership-id')).rejects.toThrow(
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

    await expect(deleteProject('project-id', 'invalid-membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership status is not ACTIVE", async () => {
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

    await expect(deleteProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.user_id != auth.uid()", async () => {
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

    await expect(deleteProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when project not found", async () => {
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

    await expect(deleteProject('invalid-project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.org_id !== project.org_id", async () => {
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

    await expect(deleteProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it('succeeds when all validations pass', async () => {
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

    // Mock for loadProjectForMembership (selects id, org_id)
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

    // Mock for loadProjectRole - project query (selects id only)
    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    // Mock for loadProjectRole - project_members query (selects role)
    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'OWNER' },
        error: null,
      }),
    }

    const mockProjectDelete: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForDelete: any = {
      delete: vi.fn(() => mockProjectDelete),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          // First call: loadProjectForMembership
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          // Second call: loadProjectRole
          return projectsTableForRole
        } else {
          // Third call: delete
          return projectsTableForDelete
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await deleteProject('project-id', 'membership-id')

    expect(result).toEqual({ id: 'project-id' })
    expect(projectsTableForDelete.delete).toHaveBeenCalled()
    expect(mockProjectDelete.eq).toHaveBeenCalledWith('id', 'project-id')
  })
})

describe('archiveProject', () => {
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

    await expect(archiveProject('project-id', 'membership-id')).rejects.toThrow(
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

    await expect(archiveProject('project-id', 'invalid-membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership status is not ACTIVE", async () => {
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

    await expect(archiveProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.user_id != auth.uid()", async () => {
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

    await expect(archiveProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when project not found", async () => {
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

    await expect(archiveProject('invalid-project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.org_id !== project.org_id", async () => {
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

    await expect(archiveProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it('succeeds when all validations pass', async () => {
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

    // Mock for loadProjectForMembership (selects id, org_id)
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

    // Mock for loadProjectRole - project query (selects id only)
    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    // Mock for loadProjectRole - project_members query (selects role)
    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'OWNER' },
        error: null,
      }),
    }

    const mockProjectUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForUpdate: any = {
      update: vi.fn(() => mockProjectUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          // First call: loadProjectForMembership
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          // Second call: loadProjectRole
          return projectsTableForRole
        } else {
          // Third call: update
          return projectsTableForUpdate
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await archiveProject('project-id', 'membership-id')

    expect(result).toEqual({ id: 'project-id' })
    expect(projectsTableForUpdate.update).toHaveBeenCalledWith({ status: 'ARCHIVED' })
    expect(mockProjectUpdate.eq).toHaveBeenCalledWith('id', 'project-id')
  })

  it("throws 'cross_org_violation' when user has VIEWER role (cannot archive)", async () => {
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
        data: { role: 'VIEWER' },
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

    await expect(archiveProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it('succeeds when user has EDITOR role (can archive)', async () => {
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
        data: { role: 'EDITOR' },
        error: null,
      }),
    }

    const mockProjectUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForUpdate: any = {
      update: vi.fn(() => mockProjectUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          return projectsTableForRole
        } else {
          return projectsTableForUpdate
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await archiveProject('project-id', 'membership-id')

    expect(result).toEqual({ id: 'project-id' })
  })
})

describe('restoreProject', () => {
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

    await expect(restoreProject('project-id', 'membership-id')).rejects.toThrow(
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

    await expect(restoreProject('project-id', 'invalid-membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership status is not ACTIVE", async () => {
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

    await expect(restoreProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.user_id != auth.uid()", async () => {
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

    await expect(restoreProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when project not found", async () => {
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

    await expect(restoreProject('invalid-project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'cross_org_violation' when membership.org_id !== project.org_id", async () => {
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
          status: 'ARCHIVED',
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

    await expect(restoreProject('project-id', 'membership-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'operation_failed' when project.status !== 'ARCHIVED'", async () => {
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
        data: {
          id: 'project-id',
          org_id: 'org-id',
          status: 'ACTIVE',
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

    await expect(restoreProject('project-id', 'membership-id')).rejects.toThrow(
      'operation_failed'
    )
  })

  it('succeeds when project.status === ARCHIVED and all validations pass', async () => {
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

    // Mock for loadProjectForMembership (selects id, org_id, status)
    const mockProjectSelectForMembership: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-id',
          org_id: 'org-id',
          status: 'ARCHIVED',
        },
        error: null,
      }),
    }

    // Mock for loadProjectRole - project query (selects id only)
    const mockProjectSelectForRole: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    // Mock for loadProjectRole - project_members query (selects role)
    const mockProjectMemberQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'OWNER' },
        error: null,
      }),
    }

    const mockProjectUpdate: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
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
    const projectsTableForUpdate: any = {
      update: vi.fn(() => mockProjectUpdate),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return mockMembershipQuery
      }
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          // First call: loadProjectForMembership
          return projectsTableForMembership
        } else if (projectsCallCount === 2) {
          // Second call: loadProjectRole
          return projectsTableForRole
        } else {
          // Third call: update
          return projectsTableForUpdate
        }
      }
      if (table === 'project_members') {
        return mockProjectMemberQuery
      }
      return {}
    })

    const result = await restoreProject('project-id', 'membership-id')

    expect(result).toEqual({ id: 'project-id' })
    expect(projectsTableForUpdate.update).toHaveBeenCalledWith({ status: 'ACTIVE' })
    expect(mockProjectUpdate.eq).toHaveBeenCalledWith('id', 'project-id')
  })
})
