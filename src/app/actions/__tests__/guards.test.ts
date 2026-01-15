import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadProjectRole } from '../_guards'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('loadProjectRole', () => {
  const mockSupabase = {
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it("throws 'auth_violation' when project query returns RLS error (code 42501)", async () => {
    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS violation' },
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    mockSupabase.from.mockReturnValue(projectsTable)

    await expect(loadProjectRole(mockSupabase, 'project-id', 'user-id')).rejects.toThrow(
      'auth_violation'
    )
  })

  it("throws 'cross_org_violation' when project not found", async () => {
    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    mockSupabase.from.mockReturnValue(projectsTable)

    await expect(loadProjectRole(mockSupabase, 'project-id', 'user-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it("throws 'auth_violation' when memberships query returns RLS error (code 42501)", async () => {
    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS violation' },
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    const membershipsTable: any = {
      select: vi.fn(() => mockMembershipQuery),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return projectsTable
      }
      if (table === 'memberships') {
        return membershipsTable
      }
      return {}
    })

    await expect(loadProjectRole(mockSupabase, 'project-id', 'user-id')).rejects.toThrow(
      'auth_violation'
    )
  })

  it("throws 'cross_org_violation' when memberships not found", async () => {
    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    const membershipsTable: any = {
      select: vi.fn(() => mockMembershipQuery),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return projectsTable
      }
      if (table === 'memberships') {
        return membershipsTable
      }
      return {}
    })

    await expect(loadProjectRole(mockSupabase, 'project-id', 'user-id')).rejects.toThrow(
      'cross_org_violation'
    )
  })

  it('succeeds: returns role when project and project_members exist', async () => {
    const mockProjectQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'project-id' },
        error: null,
      }),
    }

    const mockMembershipQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: 'OWNER' },
        error: null,
      }),
    }

    const projectsTable: any = {
      select: vi.fn(() => mockProjectQuery),
    }

    const membershipsTable: any = {
      select: vi.fn(() => mockMembershipQuery),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return projectsTable
      }
      if (table === 'memberships') {
        return membershipsTable
      }
      return {}
    })

    const result = await loadProjectRole(mockSupabase, 'project-id', 'user-id')

    expect(result).toBe('OWNER')
    expect(projectsTable.select).toHaveBeenCalledWith('id, org_id')
    expect(membershipsTable.select).toHaveBeenCalledWith('id, role, member_status')
  })
})

