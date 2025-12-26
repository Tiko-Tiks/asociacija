import { describe, it, expect, vi } from 'vitest'
import { logProjectAudit } from '../_audit'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('logProjectAudit', () => {
  it('inserts audit log', async () => {
    const insert = vi.fn()
    ;(createClient as any).mockResolvedValue({
      from: () => ({ insert }),
    })
    await logProjectAudit({
      project_id: 'p',
      actor_user_id: 'a',
      target_user_id: 't',
      action: 'MEMBER_ADDED',
    })
    expect(insert).toHaveBeenCalled()
  })
})

