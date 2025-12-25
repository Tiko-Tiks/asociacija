import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, loadProjectRole } from '@/app/actions/_guards'

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createClient()

  try {
    // 1. Authenticate user
    const user = await requireAuth(supabase)

    // 2. Load role via guard (RLS enforced)
    const role = await loadProjectRole(
      supabase,
      params.projectId,
      user.id
    )

    return NextResponse.json({ role })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 403 }
    )
  }
}

