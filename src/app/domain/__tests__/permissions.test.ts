import { describe, it, expect } from 'vitest'
import { canEditProject, canDeleteProject, canArchiveProject } from '../permissions'
import { PROJECT_ROLE } from '../constants'

describe('permissions', () => {
  describe('canEditProject', () => {
    it('returns true for OWNER', () => {
      expect(canEditProject(PROJECT_ROLE.OWNER)).toBe(true)
    })

    it('returns true for EDITOR', () => {
      expect(canEditProject(PROJECT_ROLE.EDITOR)).toBe(true)
    })

    it('returns false for VIEWER', () => {
      expect(canEditProject(PROJECT_ROLE.VIEWER)).toBe(false)
    })
  })

  describe('canDeleteProject', () => {
    it('returns true for OWNER', () => {
      expect(canDeleteProject(PROJECT_ROLE.OWNER)).toBe(true)
    })

    it('returns false for EDITOR', () => {
      expect(canDeleteProject(PROJECT_ROLE.EDITOR)).toBe(false)
    })

    it('returns false for VIEWER', () => {
      expect(canDeleteProject(PROJECT_ROLE.VIEWER)).toBe(false)
    })
  })

  describe('canArchiveProject', () => {
    it('returns true for OWNER', () => {
      expect(canArchiveProject(PROJECT_ROLE.OWNER)).toBe(true)
    })

    it('returns true for EDITOR', () => {
      expect(canArchiveProject(PROJECT_ROLE.EDITOR)).toBe(true)
    })

    it('returns false for VIEWER', () => {
      expect(canArchiveProject(PROJECT_ROLE.VIEWER)).toBe(false)
    })
  })
})

